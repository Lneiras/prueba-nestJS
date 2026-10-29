// Herramientas de NestJS para definir el controlador y sus rutas.
import {
  Body, // toma el cuerpo JSON de la petición
  Controller, // marca la clase como controlador
  Get, // ruta GET
  Param, // toma un valor de la URL
  ParseIntPipe, // convierte el parámetro a número (400 si no lo es)
  Patch, // ruta PATCH
  Post, // ruta POST
} from '@nestjs/common';
// ApiBearerAuth y ApiTags: documentación en Swagger.
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
// Tipo del usuario autenticado (solo para TypeScript).
import type { AuthUser } from '../auth/auth-user.interface';
// CurrentUser: decorador que entrega el usuario que hace la petición.
import { CurrentUser } from '../auth/decorators/current-user.decorator';
// Roles: decorador que declara qué roles pueden entrar a cada ruta.
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenancesService } from './maintenances.service';

// Documentación en Swagger: sección "Maintenances".
@ApiTags('Maintenances')
@ApiBearerAuth()
// Prefijo de las rutas: /maintenances
@Controller('maintenances')
export class MaintenancesController {
  // Nest inyecta el servicio: aquí está toda la lógica de mantenimientos.
  constructor(private readonly maintenancesService: MaintenancesService) {}

  // POST /maintenances -> crea un mantenimiento programado. Solo ADMIN.
  @Post()
  @Roles(UserRole.ADMIN)
  crear(@Body() dto: CreateMaintenanceDto) {
    return this.maintenancesService.crear(dto);
  }

  // GET /maintenances -> todos los mantenimientos. Solo ADMIN.
  @Get()
  @Roles(UserRole.ADMIN)
  buscarTodos() {
    return this.maintenancesService.buscarTodos();
  }

  // GET /maintenances/active -> solo los activos (SCHEDULED o IN_PROGRESS). Solo ADMIN.
  @Get('active')
  @Roles(UserRole.ADMIN)
  buscarActivos() {
    return this.maintenancesService.buscarActivos();
  }

  // GET /maintenances/my -> los mantenimientos asignados al técnico que hace la petición.
  // El técnico consulta SUS mantenimientos (incluyen el taller donde debe trabajar).
  @Get('my')
  @Roles(UserRole.TECHNICIAN)
  buscarMisMantenimientos(@CurrentUser() usuario: AuthUser) {
    return this.maintenancesService.buscarMisMantenimientos(usuario);
  }

  // GET /maintenances/mechanic/3 -> mantenimientos de un mecánico. Solo ADMIN.
  @Get('mechanic/:mechanicId')
  @Roles(UserRole.ADMIN)
  buscarPorMecanico(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenancesService.buscarPorMecanico(mechanicId);
  }

  // GET /maintenances/vehicle/5 -> todos los mantenimientos de un vehículo. Solo ADMIN.
  @Get('vehicle/:vehicleId')
  @Roles(UserRole.ADMIN)
  buscarPorVehiculo(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenancesService.buscarPorVehiculo(vehicleId);
  }

  // GET /maintenances/vehicle/5/history -> solo el historial (COMPLETED) de un vehículo. Solo ADMIN.
  @Get('vehicle/:vehicleId/history')
  @Roles(UserRole.ADMIN)
  historialPorVehiculo(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenancesService.historialPorVehiculo(vehicleId);
  }

  // PATCH /maintenances/7/status -> cambia el estado del mantenimiento.
  // ADMIN y TECHNICIAN pueden llegar aquí: el técnico solo de los suyos; eso lo valida el servicio.
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    // Pasamos también el usuario, porque el servicio necesita saber quién pide el cambio.
    return this.maintenancesService.cambiarEstado(id, dto, usuario);
  }
}
