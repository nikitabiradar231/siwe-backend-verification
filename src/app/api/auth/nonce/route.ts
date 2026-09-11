import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { getSession } from '@/lib/session';
import { registerNonce } from '@/lib/nonceStore';

export async function GET() {
  try {
    const session = await getSession();
    
    // Generate secure random SIWE nonce
    const nonce = generateNonce();
    
    // Store in server-side session and in-memory store
    session.nonce = nonce;
    await session.save();
    registerNonce(nonce);

    return NextResponse.json({ nonce });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate nonce.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
