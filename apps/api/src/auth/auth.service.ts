import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto';
import { GoogleLoginDto, LoginDto, RefreshTokenDto } from './dto';
import { googleClientIdFingerprint } from '../config/environment';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findForLogin(dto.email);
    if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user);
  }

  async googleLogin(dto: GoogleLoginDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified) {
        throw new UnauthorizedException('Google account email is not verified');
      }

      const { user, created } = await this.usersService.findOrCreateGoogleUser({
        googleSubject: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
      });
      if (!user.active) {
        return { status: 'PENDING' as const, created };
      }
      return { status: 'AUTHENTICATED' as const, ...(await this.createSession(user)) };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
  }

  googleAuthReadiness() {
    return {
      ready: true,
      provider: 'google' as const,
      clientIdFingerprint: googleClientIdFingerprint(this.config.getOrThrow<string>('GOOGLE_CLIENT_ID')),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; tokenType?: string }>(dto.refreshToken);
      if (payload.tokenType !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

      const user = await this.usersService.findActiveById(payload.sub);
      if (!user) throw new UnauthorizedException('Account is inactive or unavailable');
      return this.createSession(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async signup(dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);
    return this.createSession(user);
  }

  private async createSession(user: {
    id?: string;
    _id?: unknown;
    email: string;
    name: string;
    role: 'ADMIN' | 'USER';
  }) {
    const authUser = {
      id: String(user.id ?? user._id),
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
        tokenType: 'access',
      }),
      refreshToken: await this.jwtService.signAsync(
        { sub: authUser.id, tokenType: 'refresh' },
        { expiresIn: '30d' },
      ),
      user: authUser,
    };
  }
}
