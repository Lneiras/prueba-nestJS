import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

// GET /health -> lo usan Docker y Jenkins para saber si la aplicación está sana.
// Es pública (@Public) porque Docker no tiene token para consultarla.
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  verificar() {
    return this.healthService.verificar();
  }
}
