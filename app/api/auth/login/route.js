import { NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JodyMerda10.'; // Fallback only for migration, should be env

export async function POST(request) {
    try {
        const { password } = await request.json();

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Generate Token
        const token = await signSession({ role: 'admin' });

        const response = NextResponse.json({ success: true });

        // Set Cookie
        response.cookies.set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
