import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Lấy danh sách thông báo của user hiện tại
   * GET /api/v1/notifications/mine
   */
  @Get('mine')
  async getMyNotifications(
    @Headers('x-user-id') userId?: string,
  ) {
    const effectiveUserId = userId ?? 'DEMO-USER';
    return this.notificationService.findByUserId(effectiveUserId);
  }

  /**
   * Đếm số thông báo chưa đọc
   * GET /api/v1/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(
    @Headers('x-user-id') userId?: string,
  ) {
    const effectiveUserId = userId ?? 'DEMO-USER';
    const count = await this.notificationService.countUnread(effectiveUserId);
    return { count };
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   * POST /api/v1/notifications/mark-all-read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(
    @Headers('x-user-id') userId?: string,
  ) {
    const effectiveUserId = userId ?? 'DEMO-USER';
    const modified = await this.notificationService.markAllAsRead(effectiveUserId);
    return { modified };
  }

  /**
   * Tạo thông báo mới (Internal API – được gọi từ các service khác)
   * POST /api/v1/notifications/internal/create
   */
  @Post('internal/create')
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }
}
