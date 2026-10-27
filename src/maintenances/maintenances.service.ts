import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user.interface';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { UserRole } from '../users/entities/user.entity';
import { Vehicle, VehicleStatus } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { Maintenance, MaintenanceStatus } from './entities/maintenance.entity';

// Un mantenimiento está "activo" mientras esté programado o en proceso.
const ESTADOS_ACTIVOS = [
  MaintenanceStatus.SCHEDULED,
  MaintenanceStatus.IN_PROGRESS,
];

// Transiciones de estado permitidas: de cada estado, a cuáles se puede pasar.
// COMPLETED y CANCELLED son finales: no se puede salir de ellos.
const TRANSICIONES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.IN_PROGRESS]: [
    MaintenanceStatus.COMPLETED,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.COMPLETED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

// Relaciones que se incluyen al consultar un mantenimiento.
const RELACIONES = { vehicle: true, mechanic: true, workshop: true };

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenancesRepository: Repository<Maintenance>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Mechanic)
    private readonly mechanicsRepository: Repository<Mechanic>,
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
    // DataSource se usa para abrir transacciones.
    private readonly dataSource: DataSource,
  ) {}


  // CREAR

  async crear(dto: CreateMaintenanceDto) {
    const vehiculo = await this.vehiclesRepository.findOneBy({
      id: dto.vehicleId,
    });
    if (!vehiculo) {
      throw new NotFoundException(
        `No existe el vehículo con id ${dto.vehicleId}`,
      );
    }
    if (vehiculo.status === VehicleStatus.INACTIVE) {
      throw new ConflictException(
        `El vehículo ${vehiculo.plate} está inactivo`,
      );
    }

    const mecanico = await this.mechanicsRepository.findOneBy({
      id: dto.mechanicId,
    });
    if (!mecanico) {
      throw new NotFoundException(
        `No existe el mecánico con id ${dto.mechanicId}`,
      );
    }
    if (!mecanico.isActive) {
      throw new ConflictException(`El mecánico ${mecanico.name} está inactivo`);
    }

    const taller = await this.workshopsRepository.findOneBy({
      id: dto.workshopId,
    });
    if (!taller) {
      throw new NotFoundException(
        `No existe el taller con id ${dto.workshopId}`,
      );
    }
    if (!taller.isActive) {
      throw new ConflictException(`El taller ${taller.name} está inactivo`);
    }

    const inicio = new Date(dto.scheduledAt);
    const fin = new Date(dto.scheduledEnd);
    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    if (dto.mileage < vehiculo.mileage) {
      throw new BadRequestException(
        `El kilometraje (${dto.mileage}) no puede ser menor al actual del vehículo (${vehiculo.mileage})`,
      );
    }

    // Regla: un vehículo solo puede tener un mantenimiento activo.
    const vehiculoOcupado = await this.maintenancesRepository.existsBy({
      vehicleId: vehiculo.id,
      status: In(ESTADOS_ACTIVOS),
    });
    if (vehiculoOcupado) {
      throw new ConflictException(
        `El vehículo con placa ${vehiculo.plate} ya tiene un mantenimiento activo`,
      );
    }

    // Regla: el mecánico no puede tener horarios que se crucen 
    // Dos horarios se cruzan si: inicioA < finB  Y  inicioB < finA.
    // Con "<" estrictos, un mantenimiento que empieza justo cuando otro termina NO se cruza.
    const cruces = await this.maintenancesRepository
      .createQueryBuilder('m')
      .where('m.mechanicId = :mechanicId', { mechanicId: mecanico.id })
      .andWhere('m.status IN (:...estados)', { estados: ESTADOS_ACTIVOS })
      .andWhere('m.scheduledAt < :fin', { fin })
      .andWhere('m.scheduledEnd > :inicio', { inicio })
      .getCount();
    if (cruces > 0) {
      throw new ConflictException(
        `El mecánico ${mecanico.name} ya tiene un mantenimiento que se cruza con ese horario`,
      );
    }

    const guardado = await this.maintenancesRepository.save(
      this.maintenancesRepository.create({
        type: dto.type,
        description: dto.description,
        mileage: dto.mileage,
        scheduledAt: inicio,
        scheduledEnd: fin,
        status: MaintenanceStatus.SCHEDULED, // estado inicial siempre SCHEDULED
        vehicleId: vehiculo.id,
        mechanicId: mecanico.id,
        workshopId: taller.id,
      }),
    );
    return this.buscarPorId(guardado.id);
  }

  // CAMBIAR ESTADO

  async cambiarEstado(
    id: number,
    dto: UpdateMaintenanceStatusDto,
    usuario: AuthUser,
  ) {
    // El cambio de estado debe pasar al tiempo, si una de ellas falla TypeORM deshace la otra (rollback) 
    // y nunca queda un mantenimiento en un estado y el vehículo en otro.
    await this.dataSource.transaction(async (manager) => {
      const mantenimiento = await manager.findOne(Maintenance, {
        where: { id },
        relations: RELACIONES,
      });
      if (!mantenimiento) {
        throw new NotFoundException(`No existe el mantenimiento con id ${id}`);
      }

      // Un técnico solo puede cambiar el estado de SUS mantenimientos.
      if (usuario.role === UserRole.TECHNICIAN) {
        const suMecanico = await manager.findOneBy(Mechanic, {
          userId: usuario.id,
        });
        if (!suMecanico || suMecanico.id !== mantenimiento.mechanicId) {
          throw new ForbiddenException(
            'Solo puedes cambiar el estado de los mantenimientos asignados a ti',
          );
        }
      }

      // Validar que la transición sea permitida.
      const estadoActual = mantenimiento.status;
      const estadoNuevo = dto.status;
      if (!TRANSICIONES[estadoActual].includes(estadoNuevo)) {
        throw new ConflictException(
          `Transición inválida: un mantenimiento ${estadoActual} no puede pasar a ${estadoNuevo}`,
        );
      }

      const vehiculo = mantenimiento.vehicle;

      if (estadoNuevo === MaintenanceStatus.IN_PROGRESS) {
        if (vehiculo.status === VehicleStatus.INACTIVE) {
          throw new ConflictException(
            `El vehículo ${vehiculo.plate} está inactivo`,
          );
        }
        // Regla: el mecánico no puede tener dos mantenimientos en proceso a la vez.
        const otroEnProceso = await manager.findOneBy(Maintenance, {
          mechanicId: mantenimiento.mechanicId,
          status: MaintenanceStatus.IN_PROGRESS,
        });
        if (otroEnProceso) {
          throw new ConflictException(
            `El mecánico ${mantenimiento.mechanic.name} ya tiene un mantenimiento en proceso`,
          );
        }
        // Regla: al iniciar, el vehículo pasa a IN_MAINTENANCE.
        vehiculo.status = VehicleStatus.IN_MAINTENANCE;
      }

      if (estadoNuevo === MaintenanceStatus.COMPLETED) {
        // Regla: para completar se exigen los 4 datos de cierre.
        const faltantes: string[] = [];
        if (!dto.workDone) faltantes.push('workDone');
        if (dto.cost === undefined) faltantes.push('cost');
        if (!dto.finishedAt) faltantes.push('finishedAt');
        if (dto.finalMileage === undefined) faltantes.push('finalMileage');
        if (faltantes.length > 0) {
          throw new BadRequestException(
            `Para completar el mantenimiento faltan: ${faltantes.join(', ')}`,
          );
        }
        if (dto.finalMileage! < mantenimiento.mileage) {
          throw new BadRequestException(
            `El kilometraje final no puede ser menor al del mantenimiento (${mantenimiento.mileage})`,
          );
        }

        mantenimiento.workDone = dto.workDone!;
        mantenimiento.cost = dto.cost!;
        mantenimiento.finishedAt = new Date(dto.finishedAt!);
        mantenimiento.finalMileage = dto.finalMileage!;

        // Regla: al completar, el vehículo vuelve a AVAILABLE con su nuevo kilometraje.
        vehiculo.status = VehicleStatus.AVAILABLE;
        vehiculo.mileage = dto.finalMileage!;
      }

      if (
        estadoNuevo === MaintenanceStatus.CANCELLED &&
        estadoActual === MaintenanceStatus.IN_PROGRESS
      ) {
        // Si se cancela uno que estaba en proceso, el vehículo queda libre otra vez.
        vehiculo.status = VehicleStatus.AVAILABLE;
      }

      mantenimiento.status = estadoNuevo;
      await manager.save(Vehicle, vehiculo);
      await manager.save(Maintenance, mantenimiento);
    });

    return this.buscarPorId(id);
  }


  // CONSULTAS

  async buscarPorId(id: number) {
    const mantenimiento = await this.maintenancesRepository.findOne({
      where: { id },
      relations: RELACIONES,
    });
    if (!mantenimiento) {
      throw new NotFoundException(`No existe el mantenimiento con id ${id}`);
    }
    return mantenimiento;
  }

  buscarTodos() {
    return this.maintenancesRepository.find({
      relations: RELACIONES,
      order: { id: 'DESC' },
    });
  }

  buscarActivos() {
    return this.maintenancesRepository.find({
      where: { status: In(ESTADOS_ACTIVOS) },
      relations: RELACIONES,
      order: { scheduledAt: 'ASC' },
    });
  }

  async buscarPorVehiculo(vehicleId: number) {
    await this.validarVehiculoExiste(vehicleId);
    return this.maintenancesRepository.find({
      where: { vehicleId },
      relations: RELACIONES,
      order: { scheduledAt: 'DESC' },
    });
  }

  async buscarPorMecanico(mechanicId: number) {
    const existe = await this.mechanicsRepository.existsBy({ id: mechanicId });
    if (!existe) {
      throw new NotFoundException(`No existe el mecánico con id ${mechanicId}`);
    }
    return this.maintenancesRepository.find({
      where: { mechanicId },
      relations: RELACIONES,
      order: { scheduledAt: 'DESC' },
    });
  }

  // Mantenimientos del técnico que hizo la petición (usa el mecánico ligado a su usuario).
  async buscarMisMantenimientos(usuario: AuthUser) {
    const mecanico = await this.mechanicsRepository.findOneBy({
      userId: usuario.id,
    });
    if (!mecanico) return [];
    return this.buscarPorMecanico(mecanico.id);
  }

  // Historial = mantenimientos COMPLETED de un vehículo, del más reciente al más antiguo.
  async historialPorVehiculo(vehicleId: number) {
    await this.validarVehiculoExiste(vehicleId);
    return this.maintenancesRepository.find({
      where: { vehicleId, status: MaintenanceStatus.COMPLETED },
      relations: RELACIONES,
      order: { finishedAt: 'DESC' },
    });
  }

  // Historial por placa, con el formato del endpoint externo (x-api-key).
  async historialExternoPorPlaca(placa: string) {
    const plate = placa.trim().toUpperCase();
    const vehiculo = await this.vehiclesRepository.findOneBy({ plate });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con placa ${plate}`);
    }

    const historial = await this.historialPorVehiculo(vehiculo.id);
    return {
      vehicle: {
        id: vehiculo.id,
        plate: vehiculo.plate,
        brand: vehiculo.brand,
        model: vehiculo.model,
        available: vehiculo.status === VehicleStatus.AVAILABLE,
      },
      maintenances: historial.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        description: m.description,
        mileage: m.finalMileage,
        cost: m.cost,
        finishedAt: m.finishedAt,
        mechanic: { id: m.mechanic.id, name: m.mechanic.name },
        workshop: { id: m.workshop.id, name: m.workshop.name },
      })),
    };
  }

  private async validarVehiculoExiste(vehicleId: number) {
    const existe = await this.vehiclesRepository.existsBy({ id: vehicleId });
    if (!existe) {
      throw new NotFoundException(`No existe el vehículo con id ${vehicleId}`);
    }
  }
}
