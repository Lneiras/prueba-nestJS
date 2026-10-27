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
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { WorkshopsService } from './workshops.service';

@ApiTags('Workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  // Solo ADMIN crea y cambia el estado de los talleres.
  @Post()
  @Roles(UserRole.ADMIN)
  crear(@Body() dto: CreateWorkshopDto) {
    return this.workshopsService.crear(dto);
  }

  // Cualquier usuario autenticado puede consultar, el técnico necesita ver el taller
  @Get()
  buscarActivos() {
    return this.workshopsService.buscarActivos();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.workshopsService.buscarPorId(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiveDto,
  ) {
    return this.workshopsService.cambiarEstado(id, dto.isActive);
  }
}
