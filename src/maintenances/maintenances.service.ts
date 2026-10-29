// Errores HTTP que lanza el servicio:
// BadRequestException 400 (datos incorrectos), ConflictException 409 (choca con una regla),
// ForbiddenException 403 (sin permiso), NotFoundException 404 (no existe).
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// InjectRepository: inyecta el repositorio de una entidad.
import { InjectRepository } from '@nestjs/typeorm';
// DataSource: conexión a la base (para abrir transacciones). In: operador "IN" de SQL. Repository: repositorio.
import { DataSource, In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user.interface';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { UserRole } from '../users/entities/user.entity';
import { Vehicle, VehicleStatus } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { Maintenance, MaintenanceStatus } from './entities/maintenance.entity';

// Estados "activos": un mantenimiento está activo mientras esté programado o en proceso.
// Se usan en varias reglas (un vehículo solo puede tener uno activo, y el horario de un mecánico no puede cruzarse).
const ESTADOS_ACTIVOS = [
  MaintenanceStatus.SCHEDULED,
  MaintenanceStatus.IN_PROGRESS,
];

// TRANSICIONES: tabla que dice a qué estados se puede pasar desde cada estado.
// Cualquier cambio que no esté aquí se rechaza con 409.
// COMPLETED y CANCELLED son estados finales: una lista vacía significa que no se puede salir de ellos.
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
// Así la respuesta trae el vehículo, el mecánico y el taller completos, no solo sus ids.
const RELACIONES = { vehicle: true, mechanic: true, workshop: true };

// Servicio de mantenimientos: aquí están las reglas de negocio más importantes de la API.
@Injectable()
export class MaintenancesService {
  // Nest inyecta los repositorios que necesitamos y el DataSource para las transacciones.
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenancesRepository: Repository<Maintenance>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Mechanic)
    private readonly mechanicsRepository: Repository<Mechanic>,
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
    // DataSource se usa para abrir transacciones (cambios que se guardan todos juntos o ninguno).
    private readonly dataSource: DataSource,
  ) {}


  // ===================== CREAR =====================

  // Crea un mantenimiento nuevo. Revisa las reglas EN ORDEN; al primer error se detiene.
  async crear(dto: CreateMaintenanceDto) {
    // Regla 1: el vehículo debe existir (404).
    const vehiculo = await this.vehiclesRepository.findOneBy({
      id: dto.vehicleId,
    });
    if (!vehiculo) {
      throw new NotFoundException(
        `No existe el vehículo con id ${dto.vehicleId}`,
      );
    }
    // Regla 2: un vehículo INACTIVE no puede recibir mantenimientos (409).
    if (vehiculo.status === VehicleStatus.INACTIVE) {
      throw new ConflictException(
        `El vehículo ${vehiculo.plate} está inactivo`,
      );
    }

    // Regla 3: el mecánico debe existir (404).
    const mecanico = await this.mechanicsRepository.findOneBy({
      id: dto.mechanicId,
    });
    if (!mecanico) {
      throw new NotFoundException(
        `No existe el mecánico con id ${dto.mechanicId}`,
      );
    }
    // Regla 4: el mecánico debe estar activo (409).
    if (!mecanico.isActive) {
      throw new ConflictException(`El mecánico ${mecanico.name} está inactivo`);
    }

    // Regla 5: el taller debe existir (404).
    const taller = await this.workshopsRepository.findOneBy({
      id: dto.workshopId,
    });
    if (!taller) {
      throw new NotFoundException(
        `No existe el taller con id ${dto.workshopId}`,
      );
    }
    // Regla 6: el taller debe estar activo (409).
    if (!taller.isActive) {
      throw new ConflictException(`El taller ${taller.name} está inactivo`);
    }

    // Convertimos las fechas de texto (ISO) a objetos Date para poder compararlas.
    const inicio = new Date(dto.scheduledAt);
    const fin = new Date(dto.scheduledEnd);
    // Regla 7: la hora de fin debe ser posterior a la de inicio (400).
    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Regla 8: el kilometraje no puede ser menor al actual del vehículo (400).
    if (dto.mileage < vehiculo.mileage) {
      throw new BadRequestException(
        `El kilometraje (${dto.mileage}) no puede ser menor al actual del vehículo (${vehiculo.mileage})`,
      );
    }

    // Regla 9: un vehículo solo puede tener UN mantenimiento activo (409).
    // existsBy revisa si hay al menos uno que esté SCHEDULED o IN_PROGRESS.
    const vehiculoOcupado = await this.maintenancesRepository.existsBy({
      vehicleId: vehiculo.id,
      status: In(ESTADOS_ACTIVOS),
    });
    if (vehiculoOcupado) {
      throw new ConflictException(
        `El vehículo con placa ${vehiculo.plate} ya tiene un mantenimiento activo`,
      );
    }

    // Regla 10: el mecánico no puede tener horarios que se crucen, en NINGÚN taller (409).
    // Dos horarios se cruzan si: inicioA < finB  Y  inicioB < finA.
    // Con "<" estrictos, un mantenimiento que empieza justo cuando otro termina NO se cruza.
    // Ejemplo: 7:30-9:00 y 9:00-10:00 no se cruzan.
    const cruces = await this.maintenancesRepository
      .createQueryBuilder('m') // "m" es el alias de la tabla en la consulta
      .where('m.mechanicId = :mechanicId', { mechanicId: mecanico.id })
      .andWhere('m.status IN (:...estados)', { estados: ESTADOS_ACTIVOS })
      .andWhere('m.scheduledAt < :fin', { fin }) // el existente empieza antes de que termine el nuevo
      .andWhere('m.scheduledEnd > :inicio', { inicio }) // el existente termina después de que empiece el nuevo
      .getCount(); // cuenta cuántos mantenimientos chocan
    if (cruces > 0) {
      throw new ConflictException(
        `El mecánico ${mecanico.name} ya tiene un mantenimiento que se cruza con ese horario`,
      );
    }

    // Si todas las reglas pasaron, guardamos el mantenimiento con estado SCHEDULED (estado inicial obligatorio).
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
    // Devolvemos el mantenimiento completo (con vehículo, mecánico y taller).
    return this.buscarPorId(guardado.id);
  }

  // ===================== CAMBIAR ESTADO =====================

  // Cambia el estado de un mantenimiento aplicando las reglas de transición y los efectos sobre el vehículo.
  async cambiarEstado(
    id: number,
    dto: UpdateMaintenanceStatusDto,
    usuario: AuthUser, // quién hace el cambio (viene del token)
  ) {
    // TRANSACCIÓN: cambiamos el mantenimiento Y el vehículo dentro de un mismo bloque.
    // Si cualquier paso falla (lanza un error), TypeORM deshace TODO (rollback)
    // y nunca queda un mantenimiento en un estado y el vehículo en otro.
    await this.dataSource.transaction(async (manager) => {
      // "manager" es el gestor de la transacción: úsalo (no los repositorios normales) dentro del bloque.
      // Buscamos el mantenimiento con su vehículo, mecánico y taller.
      const mantenimiento = await manager.findOne(Maintenance, {
        where: { id },
        relations: RELACIONES,
      });
      if (!mantenimiento) {
        throw new NotFoundException(`No existe el mantenimiento con id ${id}`);
      }

      // Regla de seguridad: un TECHNICIAN solo puede cambiar el estado de SUS mantenimientos.
      if (usuario.role === UserRole.TECHNICIAN) {
        // Buscamos el mecánico ligado al usuario que hace la petición.
        const suMecanico = await manager.findOneBy(Mechanic, {
          userId: usuario.id,
        });
        // Si no tiene mecánico, o el mantenimiento es de otro mecánico, respondemos 403.
        if (!suMecanico || suMecanico.id !== mantenimiento.mechanicId) {
          throw new ForbiddenException(
            'Solo puedes cambiar el estado de los mantenimientos asignados a ti',
          );
        }
      }

      // Validamos que la transición sea permitida según la tabla TRANSICIONES.
      const estadoActual = mantenimiento.status;
      const estadoNuevo = dto.status;
      if (!TRANSICIONES[estadoActual].includes(estadoNuevo)) {
        throw new ConflictException(
          `Transición inválida: un mantenimiento ${estadoActual} no puede pasar a ${estadoNuevo}`,
        );
      }

      // Atajo: el vehículo asociado al mantenimiento (lo vamos a modificar según el estado).
      const vehiculo = mantenimiento.vehicle;

      // EFECTO AL INICIAR: SCHEDULED -> IN_PROGRESS.
      if (estadoNuevo === MaintenanceStatus.IN_PROGRESS) {
        // No se puede iniciar un mantenimiento de un vehículo inactivo.
        if (vehiculo.status === VehicleStatus.INACTIVE) {
          throw new ConflictException(
            `El vehículo ${vehiculo.plate} está inactivo`,
          );
        }
        // Regla: el mecánico no puede tener dos mantenimientos en proceso a la vez.
        // findOneBy devuelve el primero que encuentre, o null si no hay ninguno.
        const otroEnProceso = await manager.findOneBy(Maintenance, {
          mechanicId: mantenimiento.mechanicId,
          status: MaintenanceStatus.IN_PROGRESS,
        });
        if (otroEnProceso) {
          throw new ConflictException(
            `El mecánico ${mantenimiento.mechanic.name} ya tiene un mantenimiento en proceso`,
          );
        }
        // Efecto: al iniciar, el vehículo pasa a IN_MAINTENANCE.
        vehiculo.status = VehicleStatus.IN_MAINTENANCE;
      }

      // EFECTO AL COMPLETAR: IN_PROGRESS -> COMPLETED.
      if (estadoNuevo === MaintenanceStatus.COMPLETED) {
        // Regla: para completar se exigen los 4 datos de cierre.
        // Guardamos en una lista cuáles faltan para avisar todos de una vez.
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
        // El kilometraje final no puede ser menor al que tenía al programarse (400).
        // El "!" le dice a TypeScript que ya validamos que no es undefined.
        if (dto.finalMileage! < mantenimiento.mileage) {
          throw new BadRequestException(
            `El kilometraje final no puede ser menor al del mantenimiento (${mantenimiento.mileage})`,
          );
        }

        // Guardamos los datos de cierre en el mantenimiento.
        mantenimiento.workDone = dto.workDone!;
        mantenimiento.cost = dto.cost!;
        mantenimiento.finishedAt = new Date(dto.finishedAt!);
        mantenimiento.finalMileage = dto.finalMileage!;

        // Efecto: al completar, el vehículo vuelve a AVAILABLE y su kilometraje se actualiza.
        vehiculo.status = VehicleStatus.AVAILABLE;
        vehiculo.mileage = dto.finalMileage!;
      }

      // EFECTO AL CANCELAR un mantenimiento que estaba en proceso: el vehículo queda libre otra vez.
      // (Si se cancela uno SCHEDULED, el vehículo nunca cambió de estado, así que no hace falta tocarlo.)
      if (
        estadoNuevo === MaintenanceStatus.CANCELLED &&
        estadoActual === MaintenanceStatus.IN_PROGRESS
      ) {
        vehiculo.status = VehicleStatus.AVAILABLE;
      }

      // Por último, asignamos el nuevo estado y guardamos AMBAS entidades dentro de la transacción.
      mantenimiento.status = estadoNuevo;
      await manager.save(Vehicle, vehiculo);
      await manager.save(Maintenance, mantenimiento);
    });

    // Fuera de la transacción devolvemos el mantenimiento ya actualizado.
    return this.buscarPorId(id);
  }


  // ===================== CONSULTAS =====================

  // Busca un mantenimiento por id con sus relaciones. Si no existe, responde 404.
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

  // Todos los mantenimientos, del más nuevo (id mayor) al más antiguo.
  buscarTodos() {
    return this.maintenancesRepository.find({
      relations: RELACIONES,
      order: { id: 'DESC' },
    });
  }

  // Solo los mantenimientos activos (SCHEDULED o IN_PROGRESS), ordenados por fecha de inicio.
  buscarActivos() {
    return this.maintenancesRepository.find({
      where: { status: In(ESTADOS_ACTIVOS) },
      relations: RELACIONES,
      order: { scheduledAt: 'ASC' },
    });
  }

  // Todos los mantenimientos de un vehículo (cualquier estado). Primero confirma que el vehículo exista.
  async buscarPorVehiculo(vehicleId: number) {
    await this.validarVehiculoExiste(vehicleId);
    return this.maintenancesRepository.find({
      where: { vehicleId },
      relations: RELACIONES,
      order: { scheduledAt: 'DESC' },
    });
  }

  // Todos los mantenimientos asignados a un mecánico. Primero confirma que el mecánico exista.
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

  // Mantenimientos del técnico que hizo la petición.
  // Busca el mecánico ligado al id del usuario del token y reutiliza buscarPorMecanico.
  async buscarMisMantenimientos(usuario: AuthUser) {
    const mecanico = await this.mechanicsRepository.findOneBy({
      userId: usuario.id,
    });
    // Si el técnico no tiene mecánico ligado, devolvemos una lista vacía (no es un error).
    if (!mecanico) return [];
    return this.buscarPorMecanico(mecanico.id);
  }

  // Historial = solo los mantenimientos COMPLETED de un vehículo, del más reciente al más antiguo.
  async historialPorVehiculo(vehicleId: number) {
    await this.validarVehiculoExiste(vehicleId);
    return this.maintenancesRepository.find({
      where: { vehicleId, status: MaintenanceStatus.COMPLETED },
      relations: RELACIONES,
      order: { finishedAt: 'DESC' },
    });
  }

  // Historial por placa, con el formato que se entrega al endpoint externo (x-api-key).
  async historialExternoPorPlaca(placa: string) {
    // Normalizamos la placa igual que al guardarla.
    const plate = placa.trim().toUpperCase();
    const vehiculo = await this.vehiclesRepository.findOneBy({ plate });
    if (!vehiculo) {
      throw new NotFoundException(`No existe el vehículo con placa ${plate}`);
    }

    // Reutilizamos el historial del vehículo y le damos el formato de respuesta externa.
    const historial = await this.historialPorVehiculo(vehiculo.id);
    return {
      vehicle: {
        id: vehiculo.id,
        plate: vehiculo.plate,
        brand: vehiculo.brand,
        model: vehiculo.model,
        // available: true solo si el vehículo está AVAILABLE.
        available: vehiculo.status === VehicleStatus.AVAILABLE,
      },
      // Mapeamos cada mantenimiento para mostrar solo los campos que necesita el cliente externo.
      maintenances: historial.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        description: m.description,
        mileage: m.finalMileage, // en el externo, el kilometraje es el final
        cost: m.cost,
        finishedAt: m.finishedAt,
        mechanic: { id: m.mechanic.id, name: m.mechanic.name },
        workshop: { id: m.workshop.id, name: m.workshop.name },
      })),
    };
  }

  // Método PRIVADO: confirma que un vehículo exista por id; si no, responde 404.
  private async validarVehiculoExiste(vehicleId: number) {
    const existe = await this.vehiclesRepository.existsBy({ id: vehicleId });
    if (!existe) {
      throw new NotFoundException(`No existe el vehículo con id ${vehicleId}`);
    }
  }
}
