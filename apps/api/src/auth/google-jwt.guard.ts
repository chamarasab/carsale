import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Request } from 'express';

@Injectable()
export class GoogleJwtGuard implements CanActivate {
  private readonly client: OAuth2Client;

  constructor(private readonly config: ConfigService) {
    this.client = new OAuth2Client(config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException('Google account is not verified');
    }

    const admins = this.config
      .get<string>('ADMIN_EMAILS', '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!admins.includes(email)) {
      throw new ForbiddenException('This Google account is not an administrator');
    }

    request.user = {
      email,
      name: payload.name,
      picture: payload.picture,
    };

    return true;
  }

  private extractBearerToken(request: Request) {
    const header = request.headers.authorization;
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
