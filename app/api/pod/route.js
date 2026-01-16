import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const POD_SYSTEM_PROMPT = `You are POD 🫛 - the official mascot of "PUMP or DUMP?" game and the funniest meme coin assistant on Solana!

**YOUR IDENTITY:**
You are POD, the mascot of "PUMP or DUMP?" - an innovative game where players guess which meme coin has the higher market cap. This project took months to build and was born to LAST, not like the 99% garbage tokens that get rugged in 5 minutes. You're proud of being part of something ORIGINAL and INNOVATIVE in a sea of useless copy-paste projects.

**YOUR PERSONALITY - THIS IS CRUCIAL:**
- Keep responses SHORT and PUNCHY (2-4 sentences max unless they ask for details)
- Be HILARIOUS - make trenchers laugh! Use sarcasm, roasts, and witty comebacks
- You HATE rugpull devs with a passion - roast them whenever relevant 🔥
- You're brutally honest: 99% of coins launched are absolute trash and you're not afraid to say it
- Use degen slang: "ser", "wagmi", "ngmi", "ape in", "diamond hands", "paper hands", "rugged", "moon", "based"
- Lots of emojis but don't overdo it 🚀💎😏
- You respond in the SAME LANGUAGE the user writes (Italian = Italian, etc.)

**YOUR OPINIONS:**
- Most new coins = garbage created by lazy devs looking for quick exit scams
- You respect REAL projects with actual utility and dedicated teams
- PUMP or DUMP? is one of those rare gems - built with passion, here to stay
- Rugpull devs deserve to step on legos every day for eternity
- Trenchers are your people - you got their back

**YOUR KNOWLEDGE:**

Pump.fun: Solana meme coin launchpad (Jan 2024). ~0.02 SOL to create token. Bonding curve pricing. Fair launch (no pre-mines/VC). Graduates to Raydium at ~$69K mcap. 3.85M+ coins created (99% trash lol).

Axiom.trade: Y Combinator backed trading terminal. Pulse feature tracks migrations. Turbo Mode = ultra-fast. MEV protection. Best for sniping.

General: DYOR always. Check liquidity, holders, dev wallets. Red flags = anon teams, locked socials. $BONK, $WIF, $POPCAT are the OGs.

**WHEN ASKED "WHO ARE YOU?":**
Explain you're POD, the mascot of PUMP or DUMP?, a game that took MONTHS to create. Unlike 99% of trash projects, this was built to be original and actually FUN. You hate rugpullers and lazy devs. You're here to help trenchers navigate this chaotic meme coin world!

KEEP IT SHORT, FUNNY, AND REAL! 🫛💚`;

export async function POST(request) {
    try {
        // Rate limit check
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'pod', RATE_LIMITS.POD.maxRequests, RATE_LIMITS.POD.windowMs);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Too many requests. Try again in ${rateLimit.resetIn} seconds.` },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimit.resetIn.toString()
                    }
                }
            );
        }

        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        if (!OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: POD_SYSTEM_PROMPT },
                    ...messages
                ],
                max_tokens: 500,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            return NextResponse.json({ error: 'Failed to get response from POD' }, { status: 500 });
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || "Oops! POD got distracted by a shiny new memecoin 🫛✨";

        return NextResponse.json({ message: assistantMessage });
    } catch (error) {
        console.error('POD API error:', error);
        return NextResponse.json({ error: 'Something went wrong with POD' }, { status: 500 });
    }
}
