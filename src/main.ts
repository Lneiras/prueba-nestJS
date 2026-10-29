// ValidationPipe: revisa que el cuerpo (body) de cada petición cumpla con su DTO.
import { ValidationPipe } from '@nestjs/common';
// ConfigService: permite leer las variables del archivo .env (por ejemplo PORT).
import { ConfigService } from '@nestjs/config';
// NestFactory: crea la aplicación de Nest a partir del módulo raíz.
import { NestFactory } from '@nestjs/core';
// DocumentBuilder arma la configuración de Swagger; SwaggerModule genera la documentación.
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// Módulo raíz: desde aquí se cargan todos los demás módulos de la aplicación.
import { AppModule } from './app.module';

// Función principal que arranca el servidor.
// Es async porque hay que esperar a que la aplicación y la base de datos estén listas.
async function bootstrap() {
  // Crea la aplicación Nest usando AppModule como punto de partida.
  const app = await NestFactory.create(AppModule);

  // Valida automáticamente los DTO de cada petición.
  // whitelist: elimina los campos que el DTO no declara.
  // forbidNonWhitelisted: responde 400 si llegan campos que no existen.
  // transform: convierte los datos al tipo del DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger (documentación interactiva de la API).
  // addBearerAuth: agrega el botón "Authorize" para pegar el token JWT.
  // addApiKey: agrega el campo para la clave x-api-key (usada por la ruta externa).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setDescription('API de mantenimiento de la flota de vehículos')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  // Publica la documentación en la ruta /docs.
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Lee el puerto desde el .env (PORT). Si no existe, usa el 3000 por defecto.
  const puerto = app.get(ConfigService).get<number>('PORT') ?? 3000;
  // Enciende el servidor HTTP en ese puerto.
  await app.listen(puerto);
}
// Llamamos a bootstrap para arrancar la aplicación.
// "void" indica que no esperamos su resultado aquí.
void bootstrap();
