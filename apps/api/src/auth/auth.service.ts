import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto';
import { CreateUserDto } from '../users/dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findForLogin(dto.email);
    if (!user || !user.active || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
      }),
      user: authUser,
    };
  }

  async signup(dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
      }),
      user: authUser,
    };
  }
}
