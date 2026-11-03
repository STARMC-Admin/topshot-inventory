import { NextResponse } from 'next/server';
import { getAdminPin } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, pin, workerName } = body;

    if (!role || (role !== 'worker' && role !== 'ceo')) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified. Must be "worker" or "ceo".' },
        { status: 400 }
      );
    }

    if (role === 'worker') {
      return NextResponse.json({
        success: true,
        role: 'worker',
        name: (workerName || 'Warehouse Worker').trim(),
        message: 'Signed in as Warehouse Worker. Access limited to Order Dispatches and Returns/Refunds.',
      });
    }

    // Role is CEO
    const adminPin = getAdminPin();
    const candidatePin = (pin || '').trim();

    if (!candidatePin) {
      return NextResponse.json(
        { success: false, error: 'CEO Security PIN is required.' },
        { status: 400 }
      );
    }

    if (candidatePin !== adminPin) {
      return NextResponse.json(
        { success: false, error: 'Incorrect CEO Security PIN. Access denied.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      role: 'ceo',
      token: `ceo_token_${adminPin}`,
      name: 'Executive CEO / Administrator',
      message: 'CEO Authentication successful. Full administrative access granted.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication error' },
      { status: 500 }
    );
  }
}

