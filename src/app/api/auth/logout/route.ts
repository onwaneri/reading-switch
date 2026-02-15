import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/sessionManager';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
