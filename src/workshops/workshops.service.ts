// Injectable: permite que Nest administre el servicio.
// NotFoundException: error 404 (el taller no existe).
import { Injectable, NotFoundException } from '@nestjs/common';
// InjectRepository: inyecta el repositorio de la entidad Workshop.
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { Workshop } from './entities/workshop.entity';

// Servicio de talleres: crea, lista, busca y activa/inactiva talleres.
@Injectable()
export class WorkshopsService {
  // Nest entrega el repositorio de Workshop.
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
  ) {}

  // Crea un taller nuevo (queda activo por defecto).
  crear(dto: CreateWorkshopDto) {
    return this.workshopsRepository.save(this.workshopsRepository.create(dto));
  }

  // Solo lista los talleres ACTIVOS (where isActive = true).
  buscarActivos() {
    return this.workshopsRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  // Busca un taller por id. Si no existe, responde 404.
  async buscarPorId(id: number) {
    const taller = await this.workshopsRepository.findOneBy({ id });
    if (!taller) {
      throw new NotFoundException(`No existe el taller con id ${id}`);
    }
    return taller;
  }

  // Activa (true) o inactiva (false) un taller.
  async cambiarEstado(id: number, isActive: boolean) {
    const taller = await this.buscarPorId(id);
    taller.isActive = isActive;
    return this.workshopsRepository.save(taller);
  }
}
