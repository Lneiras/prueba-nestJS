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
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateActiveDto } from '../common/dto/update-active.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { MechanicsService } from './mechanics.service';

// Todas las rutas de mecánicos son solo para ADMIN.
@ApiTags('Mechanics')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  @Post()
  crear(@Body() dto: CreateMechanicDto) {
    return this.mechanicsService.crear(dto);
  }

  @Get()
  buscarTodos() {
    return this.mechanicsService.buscarTodos();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicsService.buscarPorId(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMechanicDto,
  ) {
    return this.mechanicsService.actualizar(id, dto);
  }

  // Activar o inactivar
  @Patch(':id/status')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiveDto,
  ) {
    return this.mechanicsService.cambiarEstado(id, dto.isActive);
  }
}
