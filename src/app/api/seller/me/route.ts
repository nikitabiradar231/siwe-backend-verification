import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSellerByAddress } from '@/lib/sellerStore';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    // 1. Enforce Authentication Check: session must contain verified wallet address
    if (!session.address) {
      return NextResponse.json(
        { error: 'Unauthorized: Access restricted to authenticated sellers.' },
        { status: 401 }
      );
    }

    // 2. CRITICAL SECURITY RULE: Derive identity STRICTLY from verified session.address.
    // Client-supplied parameters (e.g. ?address=0x... or headers) are IGNORED.
    const authenticatedAddress = session.address;

    // 3. Query seller profile bound to authenticated address
    const sellerData = getSellerByAddress(authenticatedAddress);

    return NextResponse.json({
      success: true,
      seller: sellerData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch seller profile.' },
      { status: 500 }
    );
  }
}
