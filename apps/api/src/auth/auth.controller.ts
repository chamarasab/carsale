import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { GoogleLoginDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreateUserDto } from '../users/dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Get('readiness')
  googleAuthReadiness() {
    return this.authService.googleAuthReadiness();
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request & { user: AuthUser }) {
    return request.user;
  }
}
