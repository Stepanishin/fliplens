import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Verifies a Google Identity Services ID token (the `credential` from the Sign in with Google button). */

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<VerifiedGoogleUser> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('token without sub/email');
  if (payload.email_verified !== true) throw new Error('email not verified');
  return {
    sub: payload.sub,
    email: payload.email,
    ...(typeof payload.name === 'string' && { name: payload.name }),
    ...(typeof payload.picture === 'string' && { picture: payload.picture }),
  };
}
