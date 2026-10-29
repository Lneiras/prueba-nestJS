// BadRequestException: error 400 (datos incorrectos).
// ConflictException: error 409 (choca con un dato o regla existente).
// Injectable: permite que Nest administre el servicio.
// NotFoundException: error 404 (no existe).
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// InjectRepository: inyecta el repositorio de la entidad Mechanic.
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Enum de roles y servicio de usuarios (para validar el usuario ligado).
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { Mechanic } from './entities/mechanic.entity';

// Servicio de mecánicos: reglas para crear, buscar, actualizar y activar mecánicos.
@Injectable()
export class MechanicsService {
  // Inyectamos el repositorio de Mechanic y el servicio de usuarios.
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicsRepository: Repository<Mechanic>,
    private readonly usersService: UsersService,
  ) {}

  // Crea un mecánico nuevo.
  async crear(dto: CreateMechanicDto) {
    // Regla: el correo no puede estar repetido.
    await this.validarCorreoLibre(dto.email);
    // Si envían un userId, validamos que ese usuario sirva para ligarlo.
    if (dto.userId !== undefined) await this.validarUsuario(dto.userId);

    // Creamos y guardamos el mecánico con los datos del DTO.
    return this.mechanicsRepository.save(this.mechanicsRepository.create(dto));
  }

  // Lista todos los mecánicos (activos e inactivos), ordenados por id.
  buscarTodos() {
    return this.mechanicsRepository.find({ order: { id: 'ASC' } });
  }

  // Busca un mecánico por id. Si no existe, responde 404.
  async buscarPorId(id: number) {
    const mecanico = await this.mechanicsRepository.findOneBy({ id });
    if (!mecanico) {
      throw new NotFoundException(`No existe el mecánico con id ${id}`);
    }
    return mecanico;
  }

  // Actualiza un mecánico con los campos enviados.
  async actualizar(id: number, dto: UpdateMechanicDto) {
    // Primero lo buscamos (si no existe, responde 404).
    const mecanico = await this.buscarPorId(id);

    // Si cambia el correo, verificamos que el nuevo no esté usado por otro.
    if (dto.email !== undefined && dto.email !== mecanico.email) {
      await this.validarCorreoLibre(dto.email);
    }
    // Si cambia el usuario ligado, validamos ese nuevo usuario.
    if (dto.userId !== undefined && dto.userId !== mecanico.userId) {
      await this.validarUsuario(dto.userId);
    }

    // Copiamos al mecánico solo los campos que llegaron, y guardamos.
    Object.assign(mecanico, dto);
    return this.mechanicsRepository.save(mecanico);
  }

  // Activa o inactiva un mecánico. Inactivar NO borra nada: su historial se conserva.
  async cambiarEstado(id: number, isActive: boolean) {
    const mecanico = await this.buscarPorId(id);
    mecanico.isActive = isActive;
    return this.mechanicsRepository.save(mecanico);
  }

  // Método PRIVADO: revisa que el correo no esté registrado en otro mecánico.
  private async validarCorreoLibre(email: string) {
    const existe = await this.mechanicsRepository.existsBy({ email });
    if (existe) {
      throw new ConflictException(
        `Ya existe un mecánico con el correo ${email}`,
      );
    }
  }

  // Método PRIVADO: el usuario a ligar debe (1) existir, (2) tener rol TECHNICIAN
  // y (3) no estar ya ligado a otro mecánico.
  private async validarUsuario(userId: number) {
    // (1) Buscamos el usuario.
    const usuario = await this.usersService.buscarPorId(userId);
    if (!usuario) {
      throw new NotFoundException(`No existe el usuario con id ${userId}`);
    }
    // (2) Solo los técnicos pueden ligarse a un mecánico.
    if (usuario.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('El usuario debe tener el rol TECHNICIAN');
    }
    // (3) Un usuario no puede estar ligado a dos mecánicos.
    const yaLigado = await this.mechanicsRepository.existsBy({ userId });
    if (yaLigado) {
      throw new ConflictException(
        `El usuario ${userId} ya está ligado a otro mecánico`,
      );
    }
  }
}
