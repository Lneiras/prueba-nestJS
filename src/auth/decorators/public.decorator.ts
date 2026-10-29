// SetMetadata: guarda una "etiqueta" (clave + valor) en la ruta, que luego leen los guards.
import { SetMetadata } from '@nestjs/common';

// Nombre de la etiqueta. Se usa tanto al guardarla aquí como al leerla en el JwtAuthGuard.
export const IS_PUBLIC_KEY = 'isPublic';

// Decorador @Public(): marca una ruta como pública, para que pase sin token.
// Ejemplo: @Public() sobre el método login o sobre el controlador de health.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
