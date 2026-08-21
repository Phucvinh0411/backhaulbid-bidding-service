import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('NotificationBootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1/notifications');
  app.enableCors();

  const port = configService.get<string>('NOTIFICATION_PORT', '3002');
  await app.listen(port, '0.0.0.0');
  logger.log(`🔔 Notification service is running on port ${port}`);
}
void bootstrap();
