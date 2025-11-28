import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  console.log('Webhook params:', { mode, token, challenge });

  if (mode === 'subscribe' && token === 'E2W_LMP_META_WEBHOOK_2025') {
    return new NextResponse(challenge || 'OK', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST() {
  return NextResponse.json({ received: true });
}
