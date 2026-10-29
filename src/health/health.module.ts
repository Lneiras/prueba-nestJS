// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// Módulo de salud: expone el endpoint GET /health.
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
