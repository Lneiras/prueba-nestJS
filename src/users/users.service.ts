import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
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
    const existente = await this.usersRepository.findOneBy({
      email: datos.email,
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un usuario con el correo ${datos.email}`,
      );
    }

    // El 10 es el costo del hash: a más alto, más seguro pero más lento.
    const hash = await bcrypt.hash(datos.password, 10);
    const usuario = await this.usersRepository.save(
      this.usersRepository.create({ ...datos, password: hash }),
    );

    // Devolvemos el usuario sin la contraseña.
    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
    };
  }

  // Busca por correo incluyendo la contraseña (la necesita el login para compararla).
  buscarPorCorreoConPassword(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, role: true, password: true },
    });
  }

  buscarPorId(id: number) {
    return this.usersRepository.findOneBy({ id });
  }
}
