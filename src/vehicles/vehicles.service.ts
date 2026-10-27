import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  async crear(dto: CreateVehicleDto) {
    // La placa se guarda siempre en mayúsculas y sin espacios.
    const plate = dto.plate.trim().toUpperCase();
    await this.validarPlacaLibre(plate);

    return this.vehiclesRepository.save(
      this.vehiclesRepository.create({ ...dto, plate }),
    );
  }

  buscarTodos() {
    return this.vehiclesRepository.find({ order: { id: 'ASC' } });
  }

  async buscarPorId(id: number) {
    const vehiculo = await this.vehiclesRepository.findOneBy({ id });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con id ${id}`);
    }
    return vehiculo;
  }

  async buscarPorPlaca(placa: string) {
    const plate = placa.trim().toUpperCase();
    const vehiculo = await this.vehiclesRepository.findOneBy({ plate });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con placa ${plate}`);
    }
    return vehiculo;
  }

  async actualizar(id: number, dto: UpdateVehicleDto) {
    const vehiculo = await this.buscarPorId(id);

    // Si cambia la placa, validamos que no la tenga otro vehículo.
    if (dto.plate !== undefined) {
      const plate = dto.plate.trim().toUpperCase();
      if (plate !== vehiculo.plate) await this.validarPlacaLibre(plate);
      dto.plate = plate;
    }

    // Un vehículo en mantenimiento no puede cambiar de estado a mano.
    if (
      dto.status !== undefined &&
      vehiculo.status === VehicleStatus.IN_MAINTENANCE
    ) {
      throw new ConflictException(
        `El vehículo ${vehiculo.plate} está en mantenimiento y no puede cambiar de estado`,
      );
    }

    // Object.assign copia al vehículo solo los campos que llegaron en el DTO.
    Object.assign(vehiculo, dto);
    return this.vehiclesRepository.save(vehiculo);
  }

  // Eliminación lógica: NO se borra la fila, solo se marca INACTIVE.
  // Así los mantenimientos históricos del vehículo se conservan.
  async inactivar(id: number) {
    const vehiculo = await this.buscarPorId(id);

    if (vehiculo.status === VehicleStatus.IN_MAINTENANCE) {
      throw new ConflictException(
        `El vehículo ${vehiculo.plate} está en mantenimiento y no puede inactivarse`,
      );
    }

    vehiculo.status = VehicleStatus.INACTIVE;
    return this.vehiclesRepository.save(vehiculo);
  }

  private async validarPlacaLibre(plate: string) {
    const existe = await this.vehiclesRepository.existsBy({ plate });
    if (existe) {
      throw new ConflictException(
        `Ya existe un vehículo con la placa ${plate}`,
      );
    }
  }
}
