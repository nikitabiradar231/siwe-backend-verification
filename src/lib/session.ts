import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  nonce?: string;
  address?: `0x${string}`;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'kitaab_bazaar_super_secret_session_key_32bytes_long_random_string',
  cookieName: 'kitaab_bazaar_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession() {
  const cookieStore = cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
