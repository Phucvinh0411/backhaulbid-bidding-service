import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { BiddingService } from './bidding.service';
import { CreateBidDto } from './dto/create-bid.dto';

@Controller('bids')
export class BiddingController {
  constructor(private readonly biddingService: BiddingService) {}

  @Post()
  async createBid(@Body(new ValidationPipe()) createBidDto: CreateBidDto) {
    return this.biddingService.createBid(createBidDto);
  }
}
