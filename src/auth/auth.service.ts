import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Registra un usuario nuevo (la contraseña se guarda con hash en UsersService).
  register(dto: RegisterDto) {
    return this.usersService.crear(dto);
  }

  // Valida correo y contraseña y devuelve un JWT.
  async login(dto: LoginDto) {
    const usuario = await this.usersService.buscarPorCorreoConPassword(
      dto.email,
    );

    // bcrypt.compare compara la contraseña escrita con el hash guardado.
    // Usamos el mismo mensaje si falla el correo o la contraseña,
    const passwordValida =
      usuario && (await bcrypt.compare(dto.password, usuario.password));
    if (!usuario || !passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // "sub" (subject) es el nombre estándar del id dentro de un JWT.
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
