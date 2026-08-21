import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationGateway } from './notification.gateway.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      referenceId: dto.referenceId,
      type: dto.type ?? 'NEW_AUCTION',
      isRead: false,
    });
    const saved = await notification.save();
    this.logger.log(
      `Notification created for user ${dto.userId}: ${dto.title}`,
    );

    // Broadcast via WebSocket
    this.notificationGateway.notifyUser(dto.userId, saved);

    return saved;
  }

  async findByUserId(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
    return result.modifiedCount;
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false });
  }
}
