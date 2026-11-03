import { NextResponse } from 'next/server';

const ADMIN_PIN = process.env.ADMIN_PIN || '9876';

export interface AdminAuthResult {
  isAuthorized: boolean;
  response?: NextResponse;
}

/**
 * Validates whether the incoming request is authorized by the CEO / Admin.
 * Checks 'x-admin-pin' header or 'authorization' bearer token against process.env.ADMIN_PIN.
 */
export function verifyAdminAuth(req: Request): AdminAuthResult {
  const pinHeader = req.headers.get('x-admin-pin');
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

  const candidatePin = (pinHeader || bearerToken || '').trim();

  if (candidatePin === ADMIN_PIN || candidatePin === `ceo_token_${ADMIN_PIN}`) {
    return { isAuthorized: true };
  }

  return {
    isAuthorized: false,
    response: NextResponse.json(
      {
        success: false,
        error:
          'ACCESS_DENIED: Executive CEO authorization required. You do not have permission to access CEO metrics, inventory acquisitions, or financial exports.',
        code: 'FORBIDDEN_WORKER_ACCESS',
      },
      { status: 403 }
    ),
  };
}

export function getAdminPin(): string {
  return ADMIN_PIN;
}

