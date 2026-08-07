import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Auction, AuctionDocument } from './schemas/auction.schema';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { ListAuctionsQueryDto } from './dto/list-auctions-query.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionStatus } from '../common/enums/auction-status.enum';
import { calculateParticipationFee } from './fee-policy';

@Injectable()
export class AuctionService {
  constructor(
    @InjectModel(Auction.name)
    private readonly auctionModel: Model<AuctionDocument>,
  ) {}

  async create(shipperId: string, dto: CreateAuctionDto) {
    this.validateSchedule(dto.registrationEndTime, dto.startTime, dto.endTime);
    const maxPrice = this.parseAmount(dto.maxPrice, 'maxPrice');
    const priceStep = this.parseAmount(dto.priceStep, 'priceStep');
    const fee = calculateParticipationFee(maxPrice);
    const depositAmount = dto.isDepositRequired
      ? this.parseAmount(dto.depositAmount, 'depositAmount')
      : null;

    if (depositAmount !== null && depositAmount > maxPrice) {
      throw new BadRequestException('depositAmount cannot exceed maxPrice');
    }

    const origin = `${dto.pickupLocation.province} - ${dto.pickupLocation.locationName}`;
    const destination = `${dto.deliveryLocation.province} - ${dto.deliveryLocation.locationName}`;

    const auction = await this.auctionModel.create({
      shipperId,
      ...dto,
      origin,
      destination,
      maxPrice: Types.Decimal128.fromString(maxPrice.toFixed(2)),
      priceStep: Types.Decimal128.fromString(priceStep.toFixed(2)),
      goodsValue: dto.goodsValue ? Types.Decimal128.fromString(Number(dto.goodsValue).toFixed(2)) : undefined,
      depositAmount:
        depositAmount === null
          ? null
          : Types.Decimal128.fromString(depositAmount.toFixed(2)),
      participationFeeTier: fee.tier,
      participationFeeAmount: Types.Decimal128.fromString(fee.amount),
      status: AuctionStatus.PENDING,
    });

    return this.serialize(auction);
  }

  async list(query: ListAuctionsQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.shipperId) filter.shipperId = query.shipperId;

    const skip = (query.page - 1) * query.pageSize;
    const [items, totalItems] = await Promise.all([
      this.auctionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize)
        .exec(),
      this.auctionModel.countDocuments(filter).exec(),
    ]);

    return {
      data: items.map((item) => this.serialize(item)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  async findById(auctionId: string) {
    const auction = await this.getAndSynchronizeStatus(auctionId);
    return this.serialize(auction);
  }

  async update(auctionId: string, dto: UpdateAuctionDto) {
    const auction = await this.getAndSynchronizeStatus(auctionId);
    if (auction.status !== AuctionStatus.PENDING) {
      throw new ConflictException('Only pending auctions can be updated');
    }

    const nextRegistrationEnd =
      dto.registrationEndTime ?? auction.registrationEndTime;
    const nextStart = dto.startTime ?? auction.startTime;
    const nextEnd = dto.endTime ?? auction.endTime;
    this.validateSchedule(nextRegistrationEnd, nextStart, nextEnd);

    const update: Record<string, unknown> = { ...dto };
    
    if (dto.pickupLocation) {
      update.origin = `${dto.pickupLocation.province} - ${dto.pickupLocation.locationName}`;
    }
    if (dto.deliveryLocation) {
      update.destination = `${dto.deliveryLocation.province} - ${dto.deliveryLocation.locationName}`;
    }
    
    if (dto.priceStep !== undefined) {
      update.priceStep = this.parseAmount(dto.priceStep, 'priceStep').toFixed(2);
    }
    if (dto.goodsValue !== undefined) {
      update.goodsValue = Number(dto.goodsValue).toFixed(2);
    }

    if (dto.maxPrice !== undefined) {
      const maxPrice = this.parseAmount(dto.maxPrice, 'maxPrice');
      const fee = calculateParticipationFee(maxPrice);
      update.maxPrice = maxPrice.toFixed(2);
      update.participationFeeTier = fee.tier;
      update.participationFeeAmount = fee.amount;
      if (dto.isDepositRequired === undefined && auction.isDepositRequired) {
        update.depositAmount = auction.depositAmount?.toString() ?? null;
      }
    }

    if (dto.isDepositRequired === false) update.depositAmount = null;
    if (dto.isDepositRequired === true && dto.depositAmount === undefined) {
      throw new BadRequestException(
        'depositAmount is required when deposit is enabled',
      );
    }
    if (dto.depositAmount !== undefined) {
      const depositAmount = this.parseAmount(
        dto.depositAmount,
        'depositAmount',
      );
      const maxPrice = Number(update.maxPrice ?? auction.maxPrice.toString());
      if (depositAmount > maxPrice) {
        throw new BadRequestException('depositAmount cannot exceed maxPrice');
      }
      update.depositAmount = depositAmount.toFixed(2);
    }

    const updated = await this.auctionModel
      .findByIdAndUpdate(auctionId, update, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Auction not found');
    return this.serialize(updated);
  }

  async open(auctionId: string) {
    const auction = await this.getAndSynchronizeStatus(auctionId);
    const now = new Date();
    if (auction.status !== AuctionStatus.PENDING) {
      throw new ConflictException('Only pending auctions can be opened');
    }
    if (now < auction.startTime) {
      throw new ConflictException('Auction has not reached its start time');
    }
    if (now >= auction.endTime) {
      throw new ConflictException('Auction has already ended');
    }

    auction.status = AuctionStatus.OPEN;
    await auction.save();
    return this.serialize(auction);
  }

  async cancel(auctionId: string) {
    const auction = await this.getAndSynchronizeStatus(auctionId);
    if (![AuctionStatus.PENDING, AuctionStatus.OPEN].includes(auction.status)) {
      throw new ConflictException(
        'Only pending or open auctions can be cancelled',
      );
    }
    auction.status = AuctionStatus.CANCELLED;
    await auction.save();
    return this.serialize(auction);
  }

  async complete(auctionId: string) {
    const auction = await this.getAndSynchronizeStatus(auctionId);
    if (auction.status !== AuctionStatus.OPEN) {
      throw new ConflictException('Only open auctions can be completed');
    }
    if (new Date() < auction.endTime) {
      throw new ConflictException('Auction has not reached its end time');
    }
    auction.status = AuctionStatus.COMPLETED;
    await auction.save();
    return this.serialize(auction);
  }

  private async getAndSynchronizeStatus(
    auctionId: string,
  ): Promise<AuctionDocument> {
    const auction = await this.auctionModel.findById(auctionId).exec();
    if (!auction) throw new NotFoundException('Auction not found');

    const now = new Date();
    if (
      auction.status === AuctionStatus.PENDING &&
      now >= auction.startTime &&
      now < auction.endTime
    ) {
      auction.status = AuctionStatus.OPEN;
      await auction.save();
    } else if (
      auction.status === AuctionStatus.OPEN &&
      now >= auction.endTime
    ) {
      auction.status = AuctionStatus.COMPLETED;
      await auction.save();
    }
    return auction;
  }

  private validateSchedule(
    registrationEndTime: Date,
    startTime: Date,
    endTime: Date,
  ) {
    const now = new Date();
    if (
      !(registrationEndTime instanceof Date) ||
      !(startTime instanceof Date) ||
      !(endTime instanceof Date)
    ) {
      throw new BadRequestException('Auction times must be valid dates');
    }
    if (registrationEndTime <= now) {
      throw new BadRequestException(
        'registrationEndTime must be in the future',
      );
    }
    if (registrationEndTime > startTime || startTime >= endTime) {
      throw new BadRequestException(
        'Auction time order must be registrationEndTime <= startTime < endTime',
      );
    }
  }

  private parseAmount(value: string | undefined, field: string): number {
    const parsed = Number(value);
    if (!value || !Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be greater than zero`);
    }
    return parsed;
  }

  private serialize(auction: AuctionDocument) {
    const now = new Date();
    return {
      id: auction._id,
      shipperId: auction.shipperId,
      title: auction.title,
      goodsType: auction.goodsType,
      weight: auction.weight,
      volume: auction.volume,
      goodsValue: auction.goodsValue?.toString(),
      vehicleTypeRequired: auction.vehicleTypeRequired,
      requiredTemp: auction.requiredTemp,
      vehicleSpecs: auction.vehicleSpecs,
      origin: auction.origin,
      destination: auction.destination,
      pickupLocation: auction.pickupLocation,
      deliveryLocation: auction.deliveryLocation,
      auctionType: auction.auctionType,
      maxPrice: auction.maxPrice.toString(),
      priceStep: auction.priceStep.toString(),
      maxBids: auction.maxBids,
      images: auction.images,
      notes: auction.notes,
      isDepositRequired: auction.isDepositRequired,
      depositAmount: auction.depositAmount?.toString() ?? null,
      participationFeeTier: auction.participationFeeTier,
      participationFeeAmount: auction.participationFeeAmount.toString(),
      registrationEndTime: auction.registrationEndTime,
      startTime: auction.startTime,
      endTime: auction.endTime,
      status: auction.status,
      registrationOpen:
        auction.status === AuctionStatus.PENDING &&
        now < auction.registrationEndTime,
      roomOpen:
        auction.status === AuctionStatus.OPEN &&
        now >= auction.startTime &&
        now < auction.endTime,
      winningBidId: auction.winningBidId,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    };
  }
}
