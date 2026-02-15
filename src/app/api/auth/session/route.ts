import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessionManager';

export async function GET() {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        library: user.library,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
