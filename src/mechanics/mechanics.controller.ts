// Herramientas de NestJS para definir el controlador y sus rutas.
import {
  Body, // toma el cuerpo JSON de la petición
  Controller, // marca la clase como controlador
  Get, // ruta GET
  Param, // toma un valor de la URL
  ParseIntPipe, // convierte el id a número (400 si no es número)
  Patch, // ruta PATCH (modificar)
  Post, // ruta POST (crear)
} from '@nestjs/common';
// ApiBearerAuth y ApiTags: documentación en Swagger.
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
// DTO compartido para activar o inactivar (usa el campo isActive).
import { UpdateActiveDto } from '../common/dto/update-active.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { MechanicsService } from './mechanics.service';

// Todas las rutas de mecánicos son solo para ADMIN.
@ApiTags('Mechanics')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
// Prefijo de las rutas: /mechanics
@Controller('mechanics')
export class MechanicsController {
  // Nest inyecta el servicio de mecánicos.
  constructor(private readonly mechanicsService: MechanicsService) {}

  // POST /mechanics -> registra un mecánico.
  @Post()
  crear(@Body() dto: CreateMechanicDto) {
    return this.mechanicsService.crear(dto);
  }

  // GET /mechanics -> lista todos los mecánicos.
  @Get()
  buscarTodos() {
    return this.mechanicsService.buscarTodos();
  }

  // GET /mechanics/3 -> un mecánico por id.
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicsService.buscarPorId(id);
  }

  // PATCH /mechanics/3 -> actualiza los datos enviados.
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMechanicDto,
  ) {
    return this.mechanicsService.actualizar(id, dto);
  }

  // PATCH /mechanics/3/status -> activa (true) o inactiva (false) al mecánico.
  @Patch(':id/status')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiveDto,
  ) {
    // Pasamos solo el valor booleano isActive al servicio.
    return this.mechanicsService.cambiarEstado(id, dto.isActive);
  }
}
