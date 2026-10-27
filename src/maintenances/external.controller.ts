import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MaintenancesService } from './maintenances.service';

// @Public() hace que el guard de JWT lo deje pasar; en su lugar lo protege el ApiKeyGuard.
@ApiTags('External')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('external')
export class ExternalController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  // GET /external/vehicles/ABC123/maintenances 
  @Get('vehicles/:plate/maintenances')
  historialPorPlaca(@Param('plate') plate: string) {
    return this.maintenancesService.historialExternoPorPlaca(plate);
  }
}
