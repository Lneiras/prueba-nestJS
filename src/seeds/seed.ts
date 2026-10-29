// NestFactory: crea la aplicación de Nest (aquí, sin servidor HTTP).
import { NestFactory } from '@nestjs/core';
// bcrypt: para guardar las contraseñas de prueba con hash.
import * as bcrypt from 'bcrypt';
// Herramientas de TypeORM: DataSource (conexión), tipos auxiliares y Repository.
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
// Módulo raíz: lo usamos para tener la conexión a la base lista.
import { AppModule } from '../app.module';
// Entidades que vamos a llenar con datos de prueba.
import {
  Maintenance,
  MaintenanceStatus,
  MaintenanceType,
} from '../maintenances/entities/maintenance.entity';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Vehicle, VehicleStatus } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';

// SEEDER: llena la base de datos con datos de prueba para poder hacer las pruebas de la API.
// Es IDEMPOTENTE: antes de crear cada registro lo busca; si ya existe, no lo duplica.
// Así se puede ejecutar varias veces sin que aparezcan datos repetidos.
//   Local:  npm run seed
//   Docker: docker compose exec app npm run seed:prod
// Función auxiliar genérica: busca un registro por un campo único; si no existe, lo crea.
//   repo: la tabla donde buscar. where: condición de búsqueda. datos: lo que se crea si no existe.
async function buscarOCrear<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  datos: DeepPartial<T>,
): Promise<T> {
  // ¿Ya existe?
  const existente = await repo.findOneBy(where);
  // Sí: lo devolvemos sin tocar nada.
  if (existente) return existente;
  // No: lo creamos y devolvemos el registro guardado.
  return repo.save(repo.create(datos));
}

// Función principal del seeder.
async function seed() {
  // Arranca la aplicación SIN servidor HTTP: solo nos interesa la conexión a la base de datos.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'], // solo muestra errores y advertencias para no llenar la consola
  });
  // Obtenemos la conexión a la base ya creada por la aplicación.
  const dataSource = app.get(DataSource);

  // Repositorios de cada tabla que vamos a llenar.
  const users = dataSource.getRepository(User);
  const mechanics = dataSource.getRepository(Mechanic);
  const workshops = dataSource.getRepository(Workshop);
  const vehicles = dataSource.getRepository(Vehicle);
  const maintenances = dataSource.getRepository(Maintenance);

  // USUARIOS: 1 ADMIN y 2 TECHNICIAN.
  // Las contraseñas de prueba se guardan con hash, igual que en la API real.
  const hashAdmin = await bcrypt.hash('Admin123*', 10);
  const hashTecnico = await bcrypt.hash('Tecnico123*', 10);

  // Administrador de prueba.
  const admin = await buscarOCrear(
    users,
    { email: 'admin@fleetcore.com' }, // cómo buscarlo (por correo, que es único)
    {
      name: 'Admin FleetCore',
      email: 'admin@fleetcore.com',
      password: hashAdmin,
      role: UserRole.ADMIN,
    },
  );
  // "void admin" evita la advertencia de variable sin usar (el admin solo se crea, no se reutiliza).
  void admin;
  // Técnico 1 (será el usuario de Carlos).
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
  // Técnico 2 (será el usuario de Laura).
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

  // MECÁNICOS: 2 activos (ligados a los técnicos) y 1 inactivo.
  // Carlos: activo y ligado al técnico 1 (userId).
  const carlos = await buscarOCrear(
    mechanics,
    { email: 'carlos.perez@fleetcore.com' },
    {
      name: 'Carlos Pérez',
      email: 'carlos.perez@fleetcore.com',
      specialty: 'Motor',
      isActive: true,
      userId: tecnico1.id, // liga el mecánico con su usuario TECHNICIAN
    },
  );
  // Laura: activa y ligada al técnico 2.
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
  // Pedro: INACTIVO y sin usuario. Sirve para probar que no se le pueden asignar mantenimientos.
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

  // TALLERES: 1 activo y 1 inactivo.
  // "Taller Centro" activo: se puede asignar mantenimientos.
  const tallerCentro = await buscarOCrear(
    workshops,
    { name: 'Taller Centro' },
    { name: 'Taller Centro', address: 'Calle 10 # 5-20', isActive: true },
  );
  // "Taller Norte" inactivo: sirve para probar que no se le pueden asignar mantenimientos.
  await buscarOCrear(
    workshops,
    { name: 'Taller Norte' },
    { name: 'Taller Norte', address: 'Carrera 50 # 80-15', isActive: false },
  );

  // VEHÍCULOS: 2 AVAILABLE, 1 IN_MAINTENANCE y 1 INACTIVE.
  // ABC123: disponible.
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
  // DEF456: disponible.
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
  // GHI789: en mantenimiento (tiene un mantenimiento IN_PROGRESS).
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
  // JKL012: inactivo (dado de baja). No puede recibir mantenimientos.
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

  // MANTENIMIENTOS: 1 COMPLETED (para tener historial) y 1 IN_PROGRESS.
  // Mantenimiento COMPLETADO del vehículo ABC123: aparece en su historial.
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
  // Mantenimiento EN PROCESO del vehículo GHI789: por eso ese vehículo está IN_MAINTENANCE.
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

  // Mensaje de éxito en la consola.
  console.log('Seeder ejecutado correctamente');
  // Cerramos la aplicación para liberar la conexión a la base de datos.
  await app.close();
}

// Ejecutamos el seeder. Si algo falla, mostramos el error y salimos con código 1 (error).
seed().catch((error) => {
  console.error('Error al ejecutar el seeder:', error);
  process.exit(1);
});
