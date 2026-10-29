// ConflictException: error 409 (choca con una regla o dato ya existente).
// Injectable: permite que Nest administre el servicio.
// NotFoundException: error 404 (el recurso no existe).
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// InjectRepository: inyecta el repositorio de TypeORM de la entidad Vehicle.
import { InjectRepository } from '@nestjs/typeorm';
// Repository: objeto de TypeORM para consultar y guardar vehículos.
import { Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';

// Servicio de vehículos: aquí están todas las reglas de los vehículos.
@Injectable()
export class VehiclesService {
  // Nest entrega el repositorio de Vehicle.
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  // Crea un vehículo nuevo.
  async crear(dto: CreateVehicleDto) {
    // La placa se guarda siempre en mayúsculas y sin espacios (así "abc 123" queda "ABC123").
    const plate = dto.plate.trim().toUpperCase();
    // Regla: no puede existir otro vehículo con la misma placa.
    await this.validarPlacaLibre(plate);

    // Creamos la entidad con los datos del DTO, reemplazando la placa ya normalizada, y la guardamos.
    return this.vehiclesRepository.save(
      this.vehiclesRepository.create({ ...dto, plate }),
    );
  }

  // Devuelve todos los vehículos, ordenados por id de menor a mayor.
  buscarTodos() {
    return this.vehiclesRepository.find({ order: { id: 'ASC' } });
  }

  // Busca un vehículo por id. Si no existe, responde 404.
  async buscarPorId(id: number) {
    const vehiculo = await this.vehiclesRepository.findOneBy({ id });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con id ${id}`);
    }
    return vehiculo;
  }

  // Busca un vehículo por placa (normalizada a mayúsculas). Si no existe, responde 404.
  async buscarPorPlaca(placa: string) {
    const plate = placa.trim().toUpperCase();
    const vehiculo = await this.vehiclesRepository.findOneBy({ plate });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con placa ${plate}`);
    }
    return vehiculo;
  }

  // Actualiza un vehículo existente con los campos que lleguen en el DTO.
  async actualizar(id: number, dto: UpdateVehicleDto) {
    // Primero buscamos el vehículo (si no existe, buscarPorId responde 404).
    const vehiculo = await this.buscarPorId(id);

    // Si cambia la placa, validamos que no la tenga OTRO vehículo.
    if (dto.plate !== undefined) {
      const plate = dto.plate.trim().toUpperCase();
      // Solo validamos si realmente cambió (si es la misma placa, no hay conflicto).
      if (plate !== vehiculo.plate) await this.validarPlacaLibre(plate);
      dto.plate = plate;
    }

    // Regla: un vehículo en mantenimiento no puede cambiar de estado a mano.
    // Su estado lo controla el mantenimiento en proceso.
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
    // Guardamos los cambios en la base de datos.
    return this.vehiclesRepository.save(vehiculo);
  }

  // Eliminación lógica: NO se borra la fila, solo se marca como INACTIVE.
  // Así los mantenimientos históricos del vehículo se conservan.
  async inactivar(id: number) {
    const vehiculo = await this.buscarPorId(id);

    // Regla: no se puede inactivar un vehículo que está en mantenimiento.
    if (vehiculo.status === VehicleStatus.IN_MAINTENANCE) {
      throw new ConflictException(
        `El vehículo ${vehiculo.plate} está en mantenimiento y no puede inactivarse`,
      );
    }

    vehiculo.status = VehicleStatus.INACTIVE;
    return this.vehiclesRepository.save(vehiculo);
  }

  // Método PRIVADO (solo se usa dentro de este servicio).
  // Revisa que la placa no esté registrada; si ya existe, responde 409.
  private async validarPlacaLibre(plate: string) {
    // existsBy devuelve true o false sin traer toda la fila.
    const existe = await this.vehiclesRepository.existsBy({ plate });
    if (existe) {
      throw new ConflictException(
        `Ya existe un vehículo con la placa ${plate}`,
      );
    }
  }
}
