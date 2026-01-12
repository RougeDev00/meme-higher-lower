import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.ADMIN_SECRET || 'default-secret-key-change-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);

export async function signSession(payload) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24; // 24 hours

    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setExpirationTime(exp)
        .setIssuedAt(iat)
        .setNotBefore(iat)
        .sign(key);
}

export async function verifySession(token) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies(); // cookie() is async in Next 15+
    const session = cookieStore.get('admin_session');
    if (!session?.value) return null;
    return await verifySession(session.value);
}
