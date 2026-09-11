import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
