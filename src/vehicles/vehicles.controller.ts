import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

// Todas las rutas de vehículos son solo para ADMIN.

@ApiTags('Vehicles')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  crear(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.crear(dto);
  }

  @Get()
  buscarTodos() {
    return this.vehiclesService.buscarTodos();
  }

  // Esta ruta va ANTES de ":id" para que "plate" no se confunda con un id.
  @Get('plate/:plate')
  buscarPorPlaca(@Param('plate') plate: string) {
    return this.vehiclesService.buscarPorPlaca(plate);
  }

  // ParseIntPipe convierte el id a número y responde 400 si no lo es.
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.buscarPorId(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.actualizar(id, dto);
  }

  // DELETE inactiva el vehículo (no lo borra de la base de datos).
  @Delete(':id')
  inactivar(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.inactivar(id);
  }
}
