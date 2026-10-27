import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenancesService } from './maintenances.service';

@ApiTags('Maintenances')
@ApiBearerAuth()
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  crear(@Body() dto: CreateMaintenanceDto) {
    return this.maintenancesService.crear(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  buscarTodos() {
    return this.maintenancesService.buscarTodos();
  }

  @Get('active')
  @Roles(UserRole.ADMIN)
  buscarActivos() {
    return this.maintenancesService.buscarActivos();
  }

  // El técnico consulta SUS mantenimientos (incluyen el taller donde debe trabajar).
  @Get('my')
  @Roles(UserRole.TECHNICIAN)
  buscarMisMantenimientos(@CurrentUser() usuario: AuthUser) {
    return this.maintenancesService.buscarMisMantenimientos(usuario);
  }

  @Get('mechanic/:mechanicId')
  @Roles(UserRole.ADMIN)
  buscarPorMecanico(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenancesService.buscarPorMecanico(mechanicId);
  }

  @Get('vehicle/:vehicleId')
  @Roles(UserRole.ADMIN)
  buscarPorVehiculo(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenancesService.buscarPorVehiculo(vehicleId);
  }

  @Get('vehicle/:vehicleId/history')
  @Roles(UserRole.ADMIN)
  historialPorVehiculo(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenancesService.historialPorVehiculo(vehicleId);
  }

  // ADMIN y TECHNICIAN pueden cambiar el estado (el técnico solo de los suyos; eso se valida en el servicio).
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() usuario: AuthUser,
  ) {
    return this.maintenancesService.cambiarEstado(id, dto, usuario);
  }
}
