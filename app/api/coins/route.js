import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'coins.json');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const coins = JSON.parse(fileContents);
        return NextResponse.json(coins);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to load coins' }, { status: 500 });
    }
}
