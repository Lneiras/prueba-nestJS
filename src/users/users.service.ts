// ConflictException: error 409 (choca con un dato que ya existe).
// Injectable: permite que Nest administre el servicio.
// InjectRepository: inyecta el repositorio de TypeORM de una entidad.
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// bcrypt: convierte la contraseña en un hash irreversible.
import * as bcrypt from 'bcrypt';
// Repository: objeto de TypeORM con métodos para consultar y guardar (findOneBy, save...).
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

// Servicio de usuarios: toda la lógica para crear y buscar usuarios.
@Injectable()
export class UsersService {
  // Nest inyecta el repositorio de la entidad User.
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Crea un usuario guardando la contraseña con hash (bcrypt).
  async crear(datos: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    // Primero revisamos que el correo no esté usado por otro usuario.
    const existente = await this.usersRepository.findOneBy({
      email: datos.email,
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un usuario con el correo ${datos.email}`,
      );
    }

    // Convertimos la contraseña en hash. El 10 es el "costo": a más alto, más seguro pero más lento.
    const hash = await bcrypt.hash(datos.password, 10);
    // Guardamos el usuario reemplazando la contraseña escrita por su hash.
    const usuario = await this.usersRepository.save(
      this.usersRepository.create({ ...datos, password: hash }),
    );

    // Devolvemos el usuario SIN la contraseña (ni siquiera el hash).
    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
    };
  }

  // Busca un usuario por correo incluyendo la contraseña (el login la necesita para compararla).
  // "select" pide explícitamente el campo password, que por defecto está oculto.
  buscarPorCorreoConPassword(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, role: true, password: true },
    });
  }

  // Busca un usuario por su id. Devuelve null si no existe.
  buscarPorId(id: number) {
    return this.usersRepository.findOneBy({ id });
  }
}
