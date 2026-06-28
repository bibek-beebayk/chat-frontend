import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const DEV_SIGNING_SECRET = 'd5bbba615b1c64f5ee84234f66eaa20b12676e7dbf181005904d06b4abb075ef';
const ALLOWED_SOURCES = new Set(['scratch', 'win']);

export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV === 'production' && process.env.BONUS_TEST_PAGE_ENABLED !== 'true') {
        return NextResponse.json(
            { error: 'Bonus test signing is disabled in production.' },
            { status: 403 },
        );
    }

    const body = await request.json().catch(() => null);
    const source = String(body?.source || '').trim().toLowerCase();
    const amount = String(body?.amount || '').trim();
    const rewardId = String(body?.reward_id || '').trim();
    const expiresInMinutes = Number(body?.expires_in_minutes || 15);

    if (!ALLOWED_SOURCES.has(source)) {
        return NextResponse.json({ error: 'Source must be scratch or win.' }, { status: 400 });
    }

    if (!/^\d+(\.\d{2})$/.test(amount) || Number(amount) <= 0) {
        return NextResponse.json(
            { error: 'Amount must use two decimal places, for example 5.00.' },
            { status: 400 },
        );
    }

    if (!rewardId) {
        return NextResponse.json({ error: 'Reward ID is required.' }, { status: 400 });
    }

    if (!Number.isFinite(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 120) {
        return NextResponse.json(
            { error: 'Expiry must be between 1 and 120 minutes.' },
            { status: 400 },
        );
    }

    const secret = process.env.SCRATCH_REWARD_SIGNING_SECRET || DEV_SIGNING_SECRET;
    const expires = Math.floor(Date.now() / 1000) + Math.round(expiresInMinutes * 60);
    const message = `${source}|${amount}|${rewardId}|${expires}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

    const params = new URLSearchParams({
        source,
        amount,
        reward_id: rewardId,
        expires: String(expires),
        signature,
    });

    const origin = request.nextUrl.origin;
    const redeemUrl = `${origin}/redeem?${params.toString()}`;

    return NextResponse.json({
        redeem_url: redeemUrl,
        message,
        payload: {
            source,
            amount,
            reward_id: rewardId,
            expires: String(expires),
            signature,
        },
    });
}
