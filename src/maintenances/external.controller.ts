// Controller: marca la clase como controlador. Get: ruta GET. Param: toma un valor de la URL.
// UseGuards: aplica guards solo a este controlador (aquí, el de API key).
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
// ApiSecurity: indica en Swagger que la ruta pide la API key. ApiTags: agrupa las rutas en Swagger.
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
// Public: deja pasar la ruta sin token JWT.
import { Public } from '../auth/decorators/public.decorator';
// Guard que valida el header x-api-key.
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MaintenancesService } from './maintenances.service';

// CONTROLADOR EXTERNO: pensado para sistemas de terceros (integraciones).
// @Public() hace que el guard de JWT lo deje pasar; en su lugar protege la ruta el ApiKeyGuard.
@ApiTags('External')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
// Prefijo de las rutas: /external
@Controller('external')
export class ExternalController {
  // Nest inyecta el servicio de mantenimientos.
  constructor(private readonly maintenancesService: MaintenancesService) {}

  // GET /external/vehicles/ABC123/maintenances -> historial de mantenimientos completados de un vehículo por placa.
  @Get('vehicles/:plate/maintenances')
  historialPorPlaca(@Param('plate') plate: string) {
    return this.maintenancesService.historialExternoPorPlaca(plate);
  }
}
