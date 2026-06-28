import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: DefaultSession['user'] & {
      id?: string;
      role?: 'ADMIN' | 'USER';
    };
  }

  interface User {
    role?: 'ADMIN' | 'USER';
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    userId?: string;
    role?: 'ADMIN' | 'USER';
  }
}
