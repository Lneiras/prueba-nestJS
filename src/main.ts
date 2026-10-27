import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // El puerto sale del .env. Si no está definido, usamos 3000.
  const puerto = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(puerto);
}
void bootstrap();
