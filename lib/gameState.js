
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ADMIN_SECRET || 'default-secret-key-change-in-prod';
// Derive a 32-byte key from the string secret
const KEY = createHash('sha256').update(String(SECRET_KEY)).digest();

function getPrng(seed) {
    // Simple mulberry32 PRNG
    // Seed must be an integer
    let a = typeof seed === 'number' ? seed : parseInt(seed.slice(0, 8), 16); // Use first 8 chars of hex/uuid if string

    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function deterministicShuffle(array, seed) {
    const random = getPrng(seed);
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function encryptSession(data) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decryptSession(token) {
    const textParts = token.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

export const MAX_WINNER_TURNS = 1;
