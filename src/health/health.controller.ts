// Controller: marca la clase como controlador. Get: ruta GET.
import { Controller, Get } from '@nestjs/common';
// Public: deja pasar la ruta sin token.
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

// GET /health -> lo usan Docker y Jenkins para saber si la aplicación está sana.
// Es pública (@Public) porque Docker y Jenkins no tienen un token para consultarla.
@Public()
// Prefijo de la ruta: /health
@Controller('health')
export class HealthController {
  // Nest inyecta el servicio que revisa la salud de la aplicación.
  constructor(private readonly healthService: HealthService) {}

  // Responde a GET /health delegando la comprobación al servicio.
  @Get()
  verificar() {
    return this.healthService.verificar();
  }
}
