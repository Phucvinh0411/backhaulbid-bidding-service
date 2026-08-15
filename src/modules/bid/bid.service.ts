import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuctionService } from '../auction/auction.service';
import { AuctionStatus } from '../../common/enums/auction-status.enum';
import { AuctionRegistrationService } from '../auction-registration/auction-registration.service';
import { ListBidsQueryDto } from './dto/list-bids-query.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { Bid, BidDocument } from './schemas/bid.schema';

@Injectable()
export class BidService {
  constructor(
    @InjectModel(Bid.name)
    private readonly bidModel: Model<BidDocument>,
    private readonly auctionService: AuctionService,
    private readonly registrationService: AuctionRegistrationService,
  ) {}

  async place(auctionId: string, carrierId: string, dto: PlaceBidDto) {
    const access = await this.registrationService.getAccess(
      auctionId,
      carrierId,
    );
    if (!access.canEnter) {
      throw new ConflictException(`Carrier cannot bid: ${access.accessStatus}`);
    }

    const auction = await this.auctionService.findById(auctionId);
    if (auction.status !== AuctionStatus.OPEN || !auction.roomOpen) {
      throw new ConflictException('Auction is not accepting bids');
    }

    const amount = Number(dto.bidAmount);
    const maxPrice = Number(auction.maxPrice);
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxPrice) {
      throw new ConflictException(
        'Bid amount must be positive and not exceed maxPrice',
      );
    }

    if (auction.maxBids != null) {
      const totalBids = await this.bidModel.countDocuments({ auctionId }).exec();
      if (totalBids >= Number(auction.maxBids)) {
        throw new ConflictException('Auction has reached the maximum number of bids');
      }
    }

    const currentLowest = await this.bidModel
      .findOne({ auctionId })
      .sort({ bidAmount: 1, bidTime: 1 })
      .exec();
    if (currentLowest && amount >= Number(currentLowest.bidAmount.toString())) {
      throw new ConflictException(
        'Bid must be lower than the current lowest bid',
      );
    }
    if (currentLowest && auction.priceStep != null) {
      const step = Number(auction.priceStep);
      const lowest = Number(currentLowest.bidAmount.toString());
      if (Number.isFinite(step) && step > 0 && amount > lowest - step) {
        throw new ConflictException('Bid must improve the current lowest bid by at least the price step');
      }
    }

    const bid = await this.bidModel.create({
      auctionId,
      carrierId,
      bidAmount: Types.Decimal128.fromString(amount.toFixed(2)),
      bidTime: new Date(),
    });
    return this.serialize(bid);
  }

  async list(auctionId: string, query: ListBidsQueryDto) {
    const sort = query.sortOrder === 'asc' ? 1 : -1;
    const filter = { auctionId };
    const skip = (query.page - 1) * query.pageSize;
    const [items, totalItems] = await Promise.all([
      this.bidModel
        .find(filter)
        .sort({ bidTime: sort })
        .skip(skip)
        .limit(query.pageSize)
        .exec(),
      this.bidModel.countDocuments(filter).exec(),
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

  private serialize(bid: BidDocument) {
    return {
      id: bid._id,
      auctionId: bid.auctionId,
      carrierId: bid.carrierId,
      bidAmount: bid.bidAmount.toString(),
      bidTime: bid.bidTime,
    };
  }
}
