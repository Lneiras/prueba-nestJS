// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// TypeOrmModule.forFeature: registra el repositorio de la entidad Workshop.
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from './entities/workshop.entity';
import { WorkshopsController } from './workshops.controller';
import { WorkshopsService } from './workshops.service';

// Módulo de talleres: su entidad, controlador y servicio.
@Module({
  imports: [TypeOrmModule.forFeature([Workshop])],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
