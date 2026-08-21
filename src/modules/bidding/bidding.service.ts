import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Bid, BidStatus } from './entities/bid.entity';
import { CreateBidDto } from './dto/create-bid.dto';

@Injectable()
export class BiddingService {
  constructor(
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo báo giá mới với trạng thái mặc định PENDING
   */
  async createBid(dto: CreateBidDto): Promise<Bid> {
    try {
      const newBid = this.bidRepository.create({
        ...dto,
        status: BidStatus.PENDING,
      });

      return await this.bidRepository.save(newBid);
    } catch (error) {
      throw new BadRequestException(
        `Không thể tạo báo giá: ${error.message || error}`,
      );
    }
  }

  /**
   * Lấy danh sách báo giá của một đơn hàng, sắp xếp theo bidPrice tăng dần (rẻ nhất xếp trước)
   */
  async getBidsByOrder(orderId: string): Promise<Bid[]> {
    try {
      if (!orderId) {
        throw new BadRequestException('orderId không được rỗng');
      }

      return await this.bidRepository.find({
        where: { orderId },
        order: { bidPrice: 'ASC' },
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Lỗi khi truy vấn danh sách báo giá: ${error.message || error}`,
      );
    }
  }

  /**
   * Chấp nhận 1 báo giá và tự động từ chối tất cả báo giá còn lại thuộc cùng đơn hàng bằng DB Transaction
   */
  async acceptBid(orderId: string, acceptedBidId: string): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Kiểm tra tồn tại của báo giá được chấp nhận
      const targetBid = await queryRunner.manager.findOne(Bid, {
        where: { id: acceptedBidId, orderId },
      });

      if (!targetBid) {
        throw new NotFoundException(
          `Không tìm thấy báo giá với ID: ${acceptedBidId} thuộc đơn hàng: ${orderId}`,
        );
      }

      if (targetBid.status === BidStatus.ACCEPTED) {
        throw new BadRequestException('Báo giá này đã được chấp nhận trước đó');
      }

      // 2. Cập nhật status = ACCEPTED cho báo giá được chọn
      await queryRunner.manager.update(Bid, { id: acceptedBidId }, { status: BidStatus.ACCEPTED });

      // 3. Cập nhật status = REJECTED cho tất cả các báo giá còn lại thuộc cùng orderId
      await queryRunner.manager.update(
        Bid,
        { orderId, id: Not(acceptedBidId) },
        { status: BidStatus.REJECTED },
      );

      // Commit transaction khi tất cả các bước thành công
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Đã chấp nhận báo giá ${acceptedBidId} và từ chối các báo giá khác thuộc đơn hàng ${orderId}`,
      };
    } catch (error) {
      // Rollback toàn bộ thao tác nếu xảy ra lỗi bất kỳ
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi hệ thống khi xử lý chấp nhận báo giá: ${error.message || error}`,
      );
    } finally {
      // Đảm bảo luôn giải phóng queryRunner
      await queryRunner.release();
    }
  }
}
