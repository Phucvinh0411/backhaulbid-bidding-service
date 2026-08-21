import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const BEARER_AUTH = 'bearerAuth';

export function configureOpenApi(
  app: INestApplication,
  configService: ConfigService,
): void {
  const gatewayServerUrl = configService.getOrThrow<string>(
    'OPENAPI_GATEWAY_SERVER_URL',
  );
  const directServerUrl = configService.getOrThrow<string>(
    'OPENAPI_DIRECT_SERVER_URL',
  );
  const config = new DocumentBuilder()
    .setTitle('BackHaulBid Bidding API')
    .setDescription('Realtime auction and bid management')
    .setVersion('v1')
    .addServer(gatewayServerUrl, 'API Gateway')
    .addServer(directServerUrl, 'Direct local service')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      BEARER_AUTH,
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger-json',
    yamlDocumentUrl: 'swagger-yaml',
    customSiteTitle: 'BackHaulBid Bidding API',
  });
}
