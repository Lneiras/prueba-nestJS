// Body: toma el cuerpo de la petición. Controller: marca la clase como controlador.
// HttpCode: cambia el código HTTP de la respuesta. Post: define rutas que reciben POST.
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
// ApiTags: agrupa estas rutas bajo una sección en Swagger.
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
// Public: marca las rutas que NO requieren token.
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Controlador de autenticación. Todas sus rutas son públicas (no piden token).
@ApiTags('Auth')
@Public()
// Prefijo de todas las rutas de este controlador: /auth/...
@Controller('auth')
export class AuthController {
  // Nest inyecta AuthService automáticamente (inyección de dependencias).
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register -> 201 Created (Nest responde 201 por defecto en POST).
  @Post('register')
  register(@Body() dto: RegisterDto) {
    // El controlador solo recibe la petición y delega en el servicio.
    return this.authService.register(dto);
  }

  // POST /auth/login -> 200 OK (por defecto POST responde 201; HttpCode(200) lo cambia).
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
