// ServiceUnavailableException: error 503 (la aplicación está arriba pero un servicio no responde).
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
// DataSource: la conexión a la base de datos que TypeORM ya tiene abierta.
import { DataSource } from 'typeorm';

// Servicio de salud: comprueba que la API puede hablar con la base de datos.
@Injectable()
export class HealthService {
  // Nest entrega el DataSource (la conexión a la base) ya configurada.
  constructor(private readonly dataSource: DataSource) {}

  // Comprueba que la aplicación está viva Y que la base de datos responde.
  async verificar() {
    try {
      // "SELECT 1" es una consulta mínima: solo confirma que PostgreSQL contesta.
      await this.dataSource.query('SELECT 1');
    } catch {
      // Si la base no responde, respondemos 503 (Service Unavailable).
      // Así Docker/Jenkins se enteran de que la API no puede usar la base.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    // Si todo está bien, respondemos que la base está arriba.
    return { status: 'ok', database: 'up' };
  }
}
