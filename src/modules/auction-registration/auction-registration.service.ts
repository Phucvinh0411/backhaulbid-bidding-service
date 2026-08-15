import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuctionService } from '../auction/auction.service';
import { AuctionStatus } from '../../common/enums/auction-status.enum';
import { DepositStatus } from '../../common/enums/deposit-status.enum';
import { ParticipationFeeStatus } from '../../common/enums/participation-fee-status.enum';
import { RegistrationPaymentStatus } from '../../common/enums/registration-payment-status.enum';
import { RegistrationStatus } from '../../common/enums/registration-status.enum';
import {
  WalletClient,
  WalletClientError,
} from '../../integrations/wallet/wallet.client';
import { RegisterAuctionDto } from './dto/register-auction.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';
import { ListMyRegistrationsQueryDto } from './dto/list-my-registrations-query.dto';
import {
  AuctionRegistration,
  AuctionRegistrationDocument,
} from './schemas/auction-registration.schema';

type AuctionView = Awaited<ReturnType<AuctionService['findById']>>;

@Injectable()
export class AuctionRegistrationService {
  constructor(
    @InjectModel(AuctionRegistration.name)
    private readonly registrationModel: Model<AuctionRegistrationDocument>,
    private readonly auctionService: AuctionService,
    private readonly walletClient: WalletClient,
  ) {}

  async register(
    auctionId: string,
    carrierId: string,
    dto: RegisterAuctionDto,
  ) {
    const auction = await this.auctionService.findById(auctionId);
    this.assertRegistrationOpen(auction);

    const existing = await this.registrationModel
      .findOne({ auctionId, carrierId })
      .exec();
    if (existing) {
      if (existing.status === RegistrationStatus.CANCELLED) {
        throw new ConflictException(
          'Carrier registration was cancelled and cannot be reused',
        );
      }
      if (existing.paymentStatus === RegistrationPaymentStatus.COMPLETED) {
        return this.serialize(existing, auction);
      }
      return this.completePayment(existing, auction);
    }

    const registration = await this.registrationModel.create({
      auctionId,
      carrierId,
      vehicleId: dto.vehicleId,
      status: RegistrationStatus.REGISTERED,
      paymentStatus: RegistrationPaymentStatus.PENDING,
      depositStatus: auction.isDepositRequired
        ? DepositStatus.PENDING
        : DepositStatus.NOT_REQUIRED,
      participationFeeStatus: ParticipationFeeStatus.PENDING,
      participationFeeAmount: Types.Decimal128.fromString(
        auction.participationFeeAmount,
      ),
      depositAmount: auction.isDepositRequired
        ? Types.Decimal128.fromString(this.requireDepositAmount(auction))
        : null,
      idempotencyKey: dto.idempotencyKey,
    });

    try {
      return await this.completePayment(registration, auction);
    } catch (error) {
      await this.markFailed(registration, error);
      throw error;
    }
  }

  async retryPayment(
    auctionId: string,
    registrationId: string,
    carrierId: string,
    dto: RetryPaymentDto,
  ) {
    void dto;
    const auction = await this.auctionService.findById(auctionId);
    const registration = await this.registrationModel
      .findOne({ _id: registrationId, auctionId, carrierId })
      .exec();
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new ConflictException('Registration is cancelled');
    }
    if (new Date() >= auction.startTime) {
      throw new ConflictException(
        'Payment retry is closed after the auction starts',
      );
    }
    if (registration.paymentStatus === RegistrationPaymentStatus.COMPLETED) {
      return this.serialize(registration, auction);
    }
    return this.completePayment(registration, auction);
  }

  async getAccess(auctionId: string, carrierId: string) {
    const auction = await this.auctionService.findById(auctionId);
    const registration = await this.registrationModel
      .findOne({ auctionId, carrierId })
      .exec();
    if (!registration) {
      return {
        canRegister: auction.registrationOpen,
        canEnter: false,
        accessStatus: auction.registrationOpen
          ? 'REGISTRATION_REQUIRED'
          : 'REGISTRATION_CLOSED',
        startTime: auction.startTime,
        registrationEndTime: auction.registrationEndTime,
      };
    }

    if (registration.paymentStatus !== RegistrationPaymentStatus.COMPLETED) {
      return {
        canRegister: false,
        canEnter: false,
        accessStatus: 'PAYMENT_INCOMPLETE',
        paymentStatus: registration.paymentStatus,
        registrationId: registration._id,
        startTime: auction.startTime,
      };
    }

    const now = new Date();
    if (auction.status === AuctionStatus.CANCELLED) {
      return {
        canRegister: false,
        canEnter: false,
        accessStatus: 'AUCTION_CANCELLED',
      };
    }
    if (auction.status === AuctionStatus.COMPLETED || now >= auction.endTime) {
      return {
        canRegister: false,
        canEnter: false,
        accessStatus: 'AUCTION_COMPLETED',
      };
    }
    if (now < auction.startTime) {
      return {
        canRegister: false,
        canEnter: false,
        accessStatus: 'WAITING_FOR_START',
        registrationId: registration._id,
        startTime: auction.startTime,
      };
    }

    return {
      canRegister: false,
      canEnter: true,
      accessStatus: 'AUCTION_OPEN',
      registrationId: registration._id,
      startTime: auction.startTime,
      endTime: auction.endTime,
    };
  }

  async listMine(carrierId: string, query: ListMyRegistrationsQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [registrations, totalItems] = await Promise.all([
      this.registrationModel
        .find({ carrierId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize)
        .exec(),
      this.registrationModel.countDocuments({ carrierId }).exec(),
    ]);

    const data = await Promise.all(
      registrations.map(async (registration) => {
        const auction = await this.auctionService.findById(
          registration.auctionId,
        );
        const access = await this.getAccess(registration.auctionId, carrierId);
        return {
          registration: this.serialize(registration, auction),
          auction,
          access,
        };
      }),
    );

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  async cancel(auctionId: string, registrationId: string, carrierId: string) {
    const auction = await this.auctionService.findById(auctionId);
    const registration = await this.registrationModel
      .findOne({ _id: registrationId, auctionId, carrierId })
      .exec();
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status === RegistrationStatus.CANCELLED) {
      return this.serialize(registration, auction);
    }

    if (
      registration.depositStatus === DepositStatus.LOCKED &&
      registration.depositHoldId
    ) {
      await this.walletClient.release(
        registration.depositHoldId,
        `${registration._id}:deposit:release`,
      );
      registration.depositStatus = DepositStatus.REFUNDED;
    }
    registration.status = RegistrationStatus.CANCELLED;
    await registration.save();
    return this.serialize(registration, auction);
  }

  async releaseLoserDeposits(auctionId: string, winningCarrierId?: string) {
    const filter: Record<string, any> = {
      auctionId,
      depositStatus: DepositStatus.LOCKED,
    };
    if (winningCarrierId) {
      filter.carrierId = { $ne: winningCarrierId };
    }

    const registrations = await this.registrationModel.find(filter).exec();
    let releasedCount = 0;

    for (const reg of registrations) {
      if (reg.depositHoldId) {
        try {
          await this.walletClient.release(
            reg.depositHoldId,
            `${reg._id}:deposit:refund:loser`,
          );
          reg.depositStatus = DepositStatus.REFUNDED;
          await reg.save();
          releasedCount++;
        } catch {
          // Bỏ qua lỗi hold riêng lẻ để tiếp tục hoàn cho các bên khác
        }
      }
    }

    return {
      auctionId,
      releasedCount,
      totalEligible: registrations.length,
    };
  }

  private async completePayment(
    registration: AuctionRegistrationDocument,
    auction: AuctionView,
  ) {
    try {
      const depositAmount = auction.depositAmount;
      if (
        auction.isDepositRequired &&
        depositAmount &&
        registration.depositStatus === DepositStatus.PENDING
      ) {
        const hold = await this.walletClient.hold(registration.carrierId, {
          auctionId: registration.auctionId,
          registrationId: registration._id,
          amount: depositAmount,
          purpose: 'AUCTION_DEPOSIT',
          idempotencyKey: `${registration._id}:deposit:hold`,
        });
        registration.depositStatus = DepositStatus.LOCKED;
        registration.depositHoldId = hold.holdId ?? hold.transactionId;
        await registration.save();
      }

      if (
        registration.participationFeeStatus === ParticipationFeeStatus.PENDING
      ) {
        const charge = await this.walletClient.charge(registration.carrierId, {
          auctionId: registration.auctionId,
          registrationId: registration._id,
          amount: auction.participationFeeAmount,
          purpose: 'AUCTION_PARTICIPATION_FEE',
          idempotencyKey: `${registration._id}:fee:charge`,
        });
        registration.participationFeeStatus = ParticipationFeeStatus.PAID;
        registration.participationFeeTransactionId = charge.transactionId;
        await registration.save();
      }

      registration.paymentStatus = RegistrationPaymentStatus.COMPLETED;
      registration.paymentErrorCode = null;
      await registration.save();
      return this.serialize(registration, auction);
    } catch (error) {
      if (
        registration.depositStatus === DepositStatus.LOCKED &&
        registration.depositHoldId
      ) {
        registration.paymentStatus = RegistrationPaymentStatus.COMPENSATING;
        await registration.save();
        try {
          await this.walletClient.release(
            registration.depositHoldId,
            `${registration._id}:deposit:release`,
          );
          registration.depositStatus = DepositStatus.REFUNDED;
        } catch {
          registration.paymentErrorCode = 'DEPOSIT_COMPENSATION_PENDING';
        }
      }
      await this.markFailed(registration, error);
      throw this.mapWalletError(error);
    }
  }

  private async markFailed(
    registration: AuctionRegistrationDocument,
    error: unknown,
  ) {
    registration.paymentStatus = RegistrationPaymentStatus.FAILED;
    registration.participationFeeStatus =
      registration.participationFeeStatus === ParticipationFeeStatus.PAID
        ? ParticipationFeeStatus.COMPENSATED
        : ParticipationFeeStatus.FAILED;
    registration.paymentErrorCode =
      error instanceof WalletClientError
        ? `WALLET_${error.statusCode ?? 'ERROR'}`
        : 'PAYMENT_FAILED';
    await registration.save();
  }

  private mapWalletError(error: unknown): Error {
    if (error instanceof WalletClientError && error.statusCode === 422) {
      return new UnprocessableEntityException(error.message);
    }
    if (error instanceof WalletClientError) {
      return new ServiceUnavailableException(error.message);
    }
    return error instanceof Error
      ? error
      : new ServiceUnavailableException('Payment failed');
  }

  private assertRegistrationOpen(auction: AuctionView) {
    const now = new Date();
    if (!auction.registrationOpen || now >= auction.registrationEndTime) {
      throw new ConflictException('Registration for this auction is closed');
    }
    if (
      auction.status === AuctionStatus.CANCELLED ||
      auction.status === AuctionStatus.COMPLETED
    ) {
      throw new ConflictException('Auction is not accepting registrations');
    }
  }

  private requireDepositAmount(auction: AuctionView): string {
    if (!auction.depositAmount) {
      throw new ConflictException('Auction deposit configuration is invalid');
    }
    return auction.depositAmount;
  }

  private serialize(
    registration: AuctionRegistrationDocument,
    auction: AuctionView,
  ) {
    return {
      id: registration._id,
      auctionId: registration.auctionId,
      carrierId: registration.carrierId,
      vehicleId: registration.vehicleId,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      depositStatus: registration.depositStatus,
      participationFeeStatus: registration.participationFeeStatus,
      participationFeeAmount: registration.participationFeeAmount.toString(),
      depositAmount: registration.depositAmount?.toString() ?? null,
      depositHoldId: registration.depositHoldId,
      participationFeeTransactionId: registration.participationFeeTransactionId,
      paymentErrorCode: registration.paymentErrorCode,
      startTime: auction.startTime,
      registeredAt: registration.registeredAt ?? registration.createdAt,
      updatedAt: registration.updatedAt,
    };
  }
}
