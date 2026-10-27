import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { Workshop } from './entities/workshop.entity';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
  ) {}

  crear(dto: CreateWorkshopDto) {
    return this.workshopsRepository.save(this.workshopsRepository.create(dto));
  }

  // Solo lista los talleres activos.
  buscarActivos() {
    return this.workshopsRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  async buscarPorId(id: number) {
    const taller = await this.workshopsRepository.findOneBy({ id });
    if (!taller) {
      throw new NotFoundException(`No existe el taller con id ${id}`);
    }
    return taller;
  }

  // Activa o inactiva un taller.
  async cambiarEstado(id: number, isActive: boolean) {
    const taller = await this.buscarPorId(id);
    taller.isActive = isActive;
    return this.workshopsRepository.save(taller);
  }
}
