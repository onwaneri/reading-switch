import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, verifyPassword } from '@/lib/userManager';
import { createSession } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(user, password);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        library: user.library,
      },
      token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
