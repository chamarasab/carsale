import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
    authError?: 'RefreshAccessTokenError';
    user: DefaultSession['user'] & {
      id?: string;
      role?: 'ADMIN' | 'USER';
    };
  }

  interface User {
    role?: 'ADMIN' | 'USER';
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    accessTokenExpiresAt?: number;
    refreshToken?: string;
    authError?: 'RefreshAccessTokenError';
    userId?: string;
    role?: 'ADMIN' | 'USER';
  }
}
