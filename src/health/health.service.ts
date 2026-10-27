import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  // DataSource es la conexión a la base de datos que TypeORM ya tiene abierta.
  constructor(private readonly dataSource: DataSource) {}

  // Comprueba que la aplicación está viva Y que la base de datos responde.
  async verificar() {
    try {
      // "SELECT 1" solo confirma que la base de datos contesta.
      await this.dataSource.query('SELECT 1');
    } catch {
      // 503 Service Unavailable: la API está arriba, pero no puede usar la base de datos.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'up' };
  }
}
