import React, { useState } from 'react';
import Image from 'next/image';
import { getLaunchpadName } from '@/lib/utils';
import AnimatedMarketCap from './AnimatedMarketCap';

export default function GameCard({ coin, side, resultState, selectedSide, isAnimating, exitingSide, enteringSide, onClick, showValue }) {
    const [imageError, setImageError] = useState(false);

    // Helper to determine if we should use next/image or fallback
    const isValidUrl = (url) => {
        return url && (url.startsWith('http') || url.startsWith('/'));
    };

    if (!coin) return null;

    return (
        <div
            className={`coin-side ${resultState || ''} ${selectedSide === side ? 'selected' : ''} ${isAnimating ? 'disabled' : ''} ${exitingSide === side ? 'slide-up' : ''} ${enteringSide === side ? 'slide-in' : ''}`}
            onClick={() => onClick(side)}
        >
            <div
                className="coin-background"
                style={{
                    background: `
                        linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)),
                        radial-gradient(circle at center, ${coin.color || '#444'}40 0%, rgba(0,0,0,0.9) 100%)
                    `,
                    backgroundColor: '#111' // Fallback dark base
                }}
            >
                {/* Background Image Layer - using simpler img tag or div for background blur effect if needed, keeping simple color/image from original for now. 
                    Original used background-image on div. We can replicate with Image component with fill prop and object-cover if desired, 
                    but to match "coin-background" CSS behavior, we might need to adjust CSS. 
                    For now, invalid/broken background images just fall back to color.
                */}
                {!imageError && isValidUrl(coin.logo) && (
                    <Image
                        src={coin.logo}
                        alt=""
                        fill
                        className="coin-bg-image"
                        style={{ objectFit: 'cover', opacity: 0.4 }}
                        onError={() => setImageError(true)}
                        unoptimized={true} // Allow external images initially to avoid next/image whitelist issues if config missed some
                    />
                )}
            </div>

            <div className="coin-info-container">
                {!imageError && isValidUrl(coin.logo) ? (
                    <div className="coin-logo-wrapper" style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '1rem' }}>
                        <Image
                            key={coin.id}
                            src={coin.logo}
                            alt={coin.name}
                            fill
                            className="coin-logo-large"
                            style={{ objectFit: 'cover', borderRadius: '50%' }}
                            onError={() => setImageError(true)}
                            unoptimized={true}
                        />
                    </div>
                ) : (
                    <div className="coin-logo-placeholder">
                        {coin.symbol?.[0] || '?'}
                    </div>
                )}

                <div className="coin-ticker">{coin.symbol}</div>
                <div className="coin-name">{coin.name}</div>
                <div className="coin-launchpad">{getLaunchpadName(coin.platform)}</div>

                <AnimatedMarketCap
                    value={coin.marketCap}
                    show={showValue}
                />
            </div>
        </div>
    );
}
