import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });
        if (!response.ok) return null;
        const result = (await response.json()) as {
          accessToken: string;
          user: { id: string; email: string; name: string; role: 'ADMIN' | 'USER' };
        };
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          accessToken: result.accessToken,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== 'google') return true;
      if (!account.id_token) return false;

      const response = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: account.id_token }),
      });
      if (!response.ok) return false;

      const result = (await response.json()) as {
        status: 'PENDING' | 'AUTHENTICATED';
        accessToken?: string;
        user?: { id: string; email: string; name: string; role: 'ADMIN' | 'USER' };
      };
      if (result.status === 'PENDING') {
        const siteUrl = process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000';
        return new URL('/?signup=pending', siteUrl).toString();
      }
      if (!result.user || !result.accessToken) return false;

      user.id = result.user.id;
      user.email = result.user.email;
      user.name = result.user.name;
      user.role = result.user.role;
      user.accessToken = result.accessToken;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60,
  },
};
