// Herramientas de NestJS para definir el controlador y sus rutas.
import {
  Body, // toma el cuerpo JSON de la petición
  Controller, // marca la clase como controlador
  Get, // ruta GET
  Param, // toma un valor de la URL
  ParseIntPipe, // convierte el id a número (400 si no es número)
  Patch, // ruta PATCH
  Post, // ruta POST
} from '@nestjs/common';
// ApiBearerAuth y ApiTags: documentación en Swagger.
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
// DTO compartido para activar o inactivar (usa el campo isActive).
import { UpdateActiveDto } from '../common/dto/update-active.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { WorkshopsService } from './workshops.service';

// Documentación en Swagger: agrupa las rutas en la sección "Workshops".
@ApiTags('Workshops')
@ApiBearerAuth()
// Prefijo de las rutas: /workshops
@Controller('workshops')
export class WorkshopsController {
  // Nest inyecta el servicio de talleres.
  constructor(private readonly workshopsService: WorkshopsService) {}

  // POST /workshops -> crea un taller. Solo ADMIN (@Roles sobre el método).
  @Post()
  @Roles(UserRole.ADMIN)
  crear(@Body() dto: CreateWorkshopDto) {
    return this.workshopsService.crear(dto);
  }

  // GET /workshops -> lista los talleres activos.
  // No tiene @Roles: cualquier usuario autenticado puede consultar (el técnico necesita ver su taller).
  @Get()
  buscarActivos() {
    return this.workshopsService.buscarActivos();
  }

  // GET /workshops/2 -> un taller por id.
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.workshopsService.buscarPorId(id);
  }

  // PATCH /workshops/2/status -> activa o inactiva el taller. Solo ADMIN.
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiveDto,
  ) {
    return this.workshopsService.cambiarEstado(id, dto.isActive);
  }
}
