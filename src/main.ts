import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  if (configService.getOrThrow<string>('SWAGGER_ENABLED') === 'true') {
    configureOpenApi(app, configService);
  }
  app.setGlobalPrefix('api/v1/bidding');
  const port = configService.getOrThrow<string>('PORT');
  await app.listen(port);
  logger.log(`bidding service is running on port ${port}`);
  console.log('bidding service is running');
}
void bootstrap();
