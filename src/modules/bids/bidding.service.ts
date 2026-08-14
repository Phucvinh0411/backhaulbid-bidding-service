import { Injectable, Logger } from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { BiddingGateway } from './bidding.gateway';

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);
  
  // Giả lập DB lưu trữ bằng mảng
  private readonly bidsDb: any[] = [];

  constructor(private readonly biddingGateway: BiddingGateway) {}

  async createBid(createBidDto: CreateBidDto) {
    this.logger.log(`Received new bid from company ${createBidDto.companyId} for order ${createBidDto.orderId}`);

    // 1. Lưu DB
    const newBid = {
      id: `BID-${Date.now()}`,
      ...createBidDto,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.bidsDb.push(newBid);

    // 2. Emit sự kiện Real-time thông qua Gateway cho đúng Shipper
    this.biddingGateway.notifyNewBid(createBidDto.shipperId, newBid);

    return newBid;
  }
}
