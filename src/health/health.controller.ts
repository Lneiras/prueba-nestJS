import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

// GET /health -> lo usan Docker y Jenkins para saber si la aplicación está sana.
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  verificar() {
    return this.healthService.verificar();
  }
}
