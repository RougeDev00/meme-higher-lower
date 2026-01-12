import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.ADMIN_SECRET || 'default-secret-key-change-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request) {
    // Only run on /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Allow access to login page
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        const session = request.cookies.get('admin_session');

        if (!session?.value) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        try {
            await jwtVerify(session.value, key, { algorithms: ['HS256'] });
            return NextResponse.next();
        } catch (error) {
            // Invalid token
            const response = NextResponse.redirect(new URL('/admin/login', request.url));
            response.cookies.delete('admin_session');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
