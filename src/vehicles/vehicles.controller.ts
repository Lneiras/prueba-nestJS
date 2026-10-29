// Herramientas de NestJS para definir el controlador y sus rutas.
import {
  Body, // toma el cuerpo JSON de la petición
  Controller, // marca la clase como controlador (define el prefijo de las rutas)
  Delete, // ruta con método DELETE
  Get, // ruta con método GET
  Param, // toma un valor de la URL (por ejemplo el id)
  ParseIntPipe, // convierte el parámetro a número y responde 400 si no lo es
  Patch, // ruta con método PATCH (modificar parte de un recurso)
  Post, // ruta con método POST (crear)
} from '@nestjs/common';
// ApiBearerAuth: indica en Swagger que estas rutas piden token. ApiTags: agrupa las rutas en Swagger.
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
// Roles: decorador que declara qué roles pueden entrar.
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

// Todas las rutas de vehículos son solo para ADMIN (el @Roles de la clase aplica a todos los métodos).
@ApiTags('Vehicles')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
// Prefijo de las rutas: /vehicles
@Controller('vehicles')
export class VehiclesController {
  // Nest inyecta el servicio. El controlador solo recibe la petición y la delega.
  constructor(private readonly vehiclesService: VehiclesService) {}

  // POST /vehicles -> crea un vehículo. Los datos llegan validados por CreateVehicleDto.
  @Post()
  crear(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.crear(dto);
  }

  // GET /vehicles -> lista todos los vehículos.
  @Get()
  buscarTodos() {
    return this.vehiclesService.buscarTodos();
  }

  // GET /vehicles/plate/ABC123 -> busca un vehículo por su placa.
  // Esta ruta va ANTES de ":id" para que la palabra "plate" no se confunda con un id.
  @Get('plate/:plate')
  buscarPorPlaca(@Param('plate') plate: string) {
    return this.vehiclesService.buscarPorPlaca(plate);
  }

  // GET /vehicles/5 -> busca un vehículo por id.
  // ParseIntPipe convierte el id a número y responde 400 si no lo es.
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.buscarPorId(id);
  }

  // PATCH /vehicles/5 -> actualiza solo los campos que se envíen.
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.actualizar(id, dto);
  }

  // DELETE /vehicles/5 -> NO borra el vehículo; lo inactiva (eliminación lógica).
  @Delete(':id')
  inactivar(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.inactivar(id);
  }
}
