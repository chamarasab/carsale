import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { serverEnvironment } from './server-environment';

const { apiUrl, googleClientId, googleClientSecret, nextAuthSecret, siteUrl } = serverEnvironment;
const AUTH_API_TIMEOUT_MS = 45_000;

function authApiSignal() {
  return AbortSignal.timeout(AUTH_API_TIMEOUT_MS);
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        let response: Response;
        try {
          response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
            signal: authApiSignal(),
          });
        } catch (error) {
          console.error('[credentials-auth] API sign-in request failed', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
        if (!response.ok) return null;
        const result = (await response.json()) as {
          accessToken: string;
          refreshToken?: string;
          user: { id: string; email: string; name: string; role: 'ADMIN' | 'USER' };
        };
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== 'google') return true;
      if (!account.id_token) return false;

      let response: Response;
      try {
        response = await fetch(`${apiUrl}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: account.id_token }),
          signal: authApiSignal(),
        });
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'TimeoutError';
        console.error('[google-auth] API sign-in request failed', {
          message: error instanceof Error ? error.message : 'Unknown error',
          timeout: isTimeout,
        });
        return new URL(
          `/login?error=${isTimeout ? 'BackendTimeout' : 'AuthServiceUnavailable'}`,
          siteUrl,
        ).toString();
      }

      if (!response.ok) {
        console.error('[google-auth] API rejected the verified Google identity', { status: response.status });
        if (response.status >= 500) {
          return new URL('/login?error=AuthServiceUnavailable', siteUrl).toString();
        }
        return false;
      }

      const result = (await response.json()) as {
        status: 'PENDING' | 'AUTHENTICATED';
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; email: string; name: string; role: 'ADMIN' | 'USER' };
      };
      if (result.status === 'PENDING') {
        return new URL('/home?signup=pending', siteUrl).toString();
      }
      if (!result.user || !result.accessToken) return false;

      user.id = result.user.id;
      user.email = result.user.email;
      user.name = result.user.name;
      user.role = result.user.role;
      user.accessToken = result.accessToken;
      user.refreshToken = result.refreshToken;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.accessTokenExpiresAt = accessTokenExpiresAt(user.accessToken);
        token.refreshToken = user.refreshToken;
        token.userId = user.id;
        delete token.authError;
        return token;
      }

      if (!token.accessToken || !token.refreshToken) return token;
      if ((token.accessTokenExpiresAt ?? 0) - Date.now() > 5 * 60 * 1000) return token;
      return refreshApiSession(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.authError = token.authError;
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60,
  },
};

async function refreshApiSession(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
      cache: 'no-store',
      signal: authApiSignal(),
    });
    if (!response.ok) throw new Error(`API refresh returned ${response.status}`);

    const result = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; role: 'ADMIN' | 'USER' };
    };
    return {
      ...token,
      accessToken: result.accessToken,
      accessTokenExpiresAt: accessTokenExpiresAt(result.accessToken),
      refreshToken: result.refreshToken,
      userId: result.user.id,
      role: result.user.role,
      authError: undefined,
    };
  } catch (error) {
    console.error('[auth-session] Could not refresh the API access token', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      authError: 'RefreshAccessTokenError',
    };
  }
}

function accessTokenExpiresAt(accessToken?: string) {
  if (!accessToken) return 0;
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

