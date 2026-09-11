import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { verifySiweAuth } from '@/lib/siweVerifier';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();

    const { message, signature } = body || {};

    if (!message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: message and signature.' },
        { status: 400 }
      );
    }

    const expectedSessionNonce = session.nonce;

    // Clear the nonce from session immediately to prevent reuse via current session
    session.nonce = undefined;

    // Run complete SIWE verification engine (nonce, domain, chainId, timestamps, EOA & ERC-1271 signatures)
    const verification = await verifySiweAuth(message, signature, expectedSessionNonce);

    if (!verification.success || !verification.address) {
      await session.save();
      return NextResponse.json(
        { success: false, error: verification.error || 'SIWE verification failed.' },
        { status: 422 }
      );
    }

    // CRITICAL SECURITY REQUIREMENT: Store the VERIFIED wallet address in session identity.
    // Never trust req.body.address or client-supplied claims.
    session.address = verification.address;
    await session.save();

    return NextResponse.json({
      success: true,
      address: verification.address,
      message: 'Successfully authenticated session.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during SIWE verification.' },
      { status: 500 }
    );
  }
}
