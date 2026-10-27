import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { Mechanic } from './entities/mechanic.entity';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicsRepository: Repository<Mechanic>,
    private readonly usersService: UsersService,
  ) {}

  async crear(dto: CreateMechanicDto) {
    await this.validarCorreoLibre(dto.email);
    if (dto.userId !== undefined) await this.validarUsuario(dto.userId);

    return this.mechanicsRepository.save(this.mechanicsRepository.create(dto));
  }

  buscarTodos() {
    return this.mechanicsRepository.find({ order: { id: 'ASC' } });
  }

  async buscarPorId(id: number) {
    const mecanico = await this.mechanicsRepository.findOneBy({ id });
    if (!mecanico) {
      throw new NotFoundException(`No existe el mecánico con id ${id}`);
    }
    return mecanico;
  }

  async actualizar(id: number, dto: UpdateMechanicDto) {
    const mecanico = await this.buscarPorId(id);

    if (dto.email !== undefined && dto.email !== mecanico.email) {
      await this.validarCorreoLibre(dto.email);
    }
    if (dto.userId !== undefined && dto.userId !== mecanico.userId) {
      await this.validarUsuario(dto.userId);
    }

    Object.assign(mecanico, dto);
    return this.mechanicsRepository.save(mecanico);
  }

  // Activa o inactiva. Inactivar NO borra nada: el historial del mecánico se conserva.
  async cambiarEstado(id: number, isActive: boolean) {
    const mecanico = await this.buscarPorId(id);
    mecanico.isActive = isActive;
    return this.mechanicsRepository.save(mecanico);
  }

  private async validarCorreoLibre(email: string) {
    const existe = await this.mechanicsRepository.existsBy({ email });
    if (existe) {
      throw new ConflictException(
        `Ya existe un mecánico con el correo ${email}`,
      );
    }
  }

  // El usuario debe existir, ser TECHNICIAN y no estar ligado a otro mecánico.
  private async validarUsuario(userId: number) {
    const usuario = await this.usersService.buscarPorId(userId);
    if (!usuario) {
      throw new NotFoundException(`No existe el usuario con id ${userId}`);
    }
    if (usuario.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('El usuario debe tener el rol TECHNICIAN');
    }
    const yaLigado = await this.mechanicsRepository.existsBy({ userId });
    if (yaLigado) {
      throw new ConflictException(
        `El usuario ${userId} ya está ligado a otro mecánico`,
      );
    }
  }
}
