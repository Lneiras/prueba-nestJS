import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida automáticamente los DTO de cada petición.
  // whitelist: elimina los campos que el DTO no declara.
  // forbidNonWhitelisted: responde 400 si llegan campos que no existen.
  // transform: convierte los datos al tipo del DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setDescription('API de mantenimiento de la flota de vehículos')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const puerto = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(puerto);
}
void bootstrap();
