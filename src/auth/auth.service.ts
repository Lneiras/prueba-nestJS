// Injectable: permite que Nest administre el servicio y lo inyecte en otras clases.
// UnauthorizedException: error 401 (no sabemos quién eres o tus credenciales no sirven).
import { Injectable, UnauthorizedException } from '@nestjs/common';
// JwtService: herramienta para firmar tokens JWT.
import { JwtService } from '@nestjs/jwt';
// bcrypt: librería que compara contraseñas contra su hash (nunca guardamos la contraseña real).
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Servicio de autenticación: aquí vive la lógica de registro y de login.
@Injectable()
export class AuthService {
  // Nest entrega automáticamente UsersService y JwtService (inyección de dependencias).
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Registra un usuario nuevo (la contraseña se guarda con hash dentro de UsersService).
  register(dto: RegisterDto) {
    return this.usersService.crear(dto);
  }

  // Valida correo y contraseña y, si son correctos, devuelve un JWT.
  async login(dto: LoginDto) {
    // Buscamos el usuario por correo, incluyendo su contraseña (hash) para poder compararla.
    const usuario = await this.usersService.buscarPorCorreoConPassword(
      dto.email,
    );

    // bcrypt.compare compara la contraseña escrita con el hash guardado en la base.
    // Devuelve true si coinciden. Si no hay usuario, esta expresión queda en undefined/false.
    const passwordValida =
      usuario && (await bcrypt.compare(dto.password, usuario.password));
    // Usamos el MISMO mensaje si falla el correo o la contraseña, para no revelar cuál estaba mal.
    if (!usuario || !passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // Contenido (payload) del token. "sub" (subject) es el nombre estándar del id dentro de un JWT.
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    };
    // Firmamos el token con JWT_SECRET y lo devolvemos al cliente.
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
