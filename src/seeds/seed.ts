import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { AppModule } from '../app.module';
import {
  Maintenance,
  MaintenanceStatus,
  MaintenanceType,
} from '../maintenances/entities/maintenance.entity';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Vehicle, VehicleStatus } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';

// SEEDER: llena la base de datos con datos de prueba.
// Es IDEMPOTENTE: antes de crear cada registro lo busca; si ya existe, no lo duplica.
// Así se puede ejecutar varias veces sin problema.
//   Local:  npm run seed
//   Docker: docker compose exec app npm run seed:prod
async function buscarOCrear<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  datos: DeepPartial<T>,
): Promise<T> {
  const existente = await repo.findOneBy(where);
  if (existente) return existente;
  return repo.save(repo.create(datos));
}

async function seed() {
  // Arranca la aplicación SIN servidor HTTP, solo para usar la conexión a la base de datos.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);

  const users = dataSource.getRepository(User);
  const mechanics = dataSource.getRepository(Mechanic);
  const workshops = dataSource.getRepository(Workshop);
  const vehicles = dataSource.getRepository(Vehicle);
  const maintenances = dataSource.getRepository(Maintenance);

  // Usuarios: 1 ADMIN y 2 TECHNICIAN
  const hashAdmin = await bcrypt.hash('Admin123*', 10);
  const hashTecnico = await bcrypt.hash('Tecnico123*', 10);

  const admin = await buscarOCrear(
    users,
    { email: 'admin@fleetcore.com' },
    {
      name: 'Admin FleetCore',
      email: 'admin@fleetcore.com',
      password: hashAdmin,
      role: UserRole.ADMIN,
    },
  );
  void admin;
  const tecnico1 = await buscarOCrear(
    users,
    { email: 'tecnico1@fleetcore.com' },
    {
      name: 'Carlos Pérez',
      email: 'tecnico1@fleetcore.com',
      password: hashTecnico,
      role: UserRole.TECHNICIAN,
    },
  );
  const tecnico2 = await buscarOCrear(
    users,
    { email: 'tecnico2@fleetcore.com' },
    {
      name: 'Laura Gómez',
      email: 'tecnico2@fleetcore.com',
      password: hashTecnico,
      role: UserRole.TECHNICIAN,
    },
  );

  // Mecánicos: 2 activos (ligados a los técnicos) y 1 inactivo
  const carlos = await buscarOCrear(
    mechanics,
    { email: 'carlos.perez@fleetcore.com' },
    {
      name: 'Carlos Pérez',
      email: 'carlos.perez@fleetcore.com',
      specialty: 'Motor',
      isActive: true,
      userId: tecnico1.id,
    },
  );
  const laura = await buscarOCrear(
    mechanics,
    { email: 'laura.gomez@fleetcore.com' },
    {
      name: 'Laura Gómez',
      email: 'laura.gomez@fleetcore.com',
      specialty: 'Frenos',
      isActive: true,
      userId: tecnico2.id,
    },
  );
  await buscarOCrear(
    mechanics,
    { email: 'pedro.ruiz@fleetcore.com' },
    {
      name: 'Pedro Ruiz',
      email: 'pedro.ruiz@fleetcore.com',
      specialty: 'Electricidad',
      isActive: false,
    },
  );

  // Talleres: 1 activo y 1 inactivo
  const tallerCentro = await buscarOCrear(
    workshops,
    { name: 'Taller Centro' },
    { name: 'Taller Centro', address: 'Calle 10 # 5-20', isActive: true },
  );
  await buscarOCrear(
    workshops,
    { name: 'Taller Norte' },
    { name: 'Taller Norte', address: 'Carrera 50 # 80-15', isActive: false },
  );

  // Vehículos: 2 AVAILABLE, 1 IN_MAINTENANCE y 1 INACTIVE
  const abc = await buscarOCrear(
    vehicles,
    { plate: 'ABC123' },
    {
      plate: 'ABC123',
      brand: 'Chevrolet',
      model: 'NPR',
      year: 2020,
      mileage: 45000,
      status: VehicleStatus.AVAILABLE,
    },
  );
  await buscarOCrear(
    vehicles,
    { plate: 'DEF456' },
    {
      plate: 'DEF456',
      brand: 'Hino',
      model: '300',
      year: 2021,
      mileage: 20000,
      status: VehicleStatus.AVAILABLE,
    },
  );
  const ghi = await buscarOCrear(
    vehicles,
    { plate: 'GHI789' },
    {
      plate: 'GHI789',
      brand: 'Isuzu',
      model: 'NHR',
      year: 2019,
      mileage: 80000,
      status: VehicleStatus.IN_MAINTENANCE,
    },
  );
  await buscarOCrear(
    vehicles,
    { plate: 'JKL012' },
    {
      plate: 'JKL012',
      brand: 'Renault',
      model: 'Master',
      year: 2015,
      mileage: 150000,
      status: VehicleStatus.INACTIVE,
    },
  );

  // Mantenimientos: 1 COMPLETED (historial) y 1 IN_PROGRESS
  await buscarOCrear(
    maintenances,
    { vehicleId: abc.id, description: 'Cambio de aceite y filtros' },
    {
      type: MaintenanceType.PREVENTIVE,
      description: 'Cambio de aceite y filtros',
      mileage: 44500,
      scheduledAt: new Date('2026-09-15T14:00:00.000Z'),
      scheduledEnd: new Date('2026-09-15T16:00:00.000Z'),
      status: MaintenanceStatus.COMPLETED,
      workDone: 'Se cambió el aceite del motor y los filtros de aceite y aire',
      cost: 350000,
      finishedAt: new Date('2026-09-15T16:30:00.000Z'),
      finalMileage: 45000,
      vehicleId: abc.id,
      mechanicId: laura.id,
      workshopId: tallerCentro.id,
    },
  );
  await buscarOCrear(
    maintenances,
    { vehicleId: ghi.id, description: 'Reemplazo de pastillas de freno' },
    {
      type: MaintenanceType.CORRECTIVE,
      description: 'Reemplazo de pastillas de freno',
      mileage: 80000,
      scheduledAt: new Date('2026-10-27T13:00:00.000Z'),
      scheduledEnd: new Date('2026-10-27T17:00:00.000Z'),
      status: MaintenanceStatus.IN_PROGRESS,
      vehicleId: ghi.id,
      mechanicId: carlos.id,
      workshopId: tallerCentro.id,
    },
  );

  console.log('Seeder ejecutado correctamente');
  await app.close();
}

seed().catch((error) => {
  console.error('Error al ejecutar el seeder:', error);
  process.exit(1);
});
