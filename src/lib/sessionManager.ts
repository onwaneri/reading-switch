import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { Session, User } from '@/types/auth';
import { findUserById } from './userManager';

// Use global to persist sessions across hot reloads in development
const globalForSessions = global as unknown as { sessions: Map<string, Session> };
const sessions = globalForSessions.sessions || new Map<string, Session>();
if (process.env.NODE_ENV !== 'production') {
  globalForSessions.sessions = sessions;
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string, username: string): Promise<string> {
  const token = randomUUID();
  const session: Session = {
    userId,
    username,
    expiresAt: Date.now() + SESSION_DURATION,
  };

  sessions.set(token, session);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION / 1000,
    sameSite: 'lax',
    path: '/',
  });

  return token;
}

export async function validateSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  const user = await findUserById(session.userId);
  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (token) {
    sessions.delete(token);
  }

  cookieStore.delete('session');
}
