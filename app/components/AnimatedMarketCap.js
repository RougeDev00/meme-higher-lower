import React, { useState, useEffect, useRef } from 'react';
import { formatMarketCap } from '@/lib/utils';
import { GAME_CONFIG } from '@/lib/gameConfig';

export default function AnimatedMarketCap({ value, show }) {
    const [displayValue, setDisplayValue] = useState(0);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!show) {
            setDisplayValue(0);
            return;
        }

        const duration = GAME_CONFIG.ANIMATION_DURATION;
        const startTime = Date.now();
        const startValue = 0;
        const endValue = value;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (endValue - startValue) * easeOutQuart;

            setDisplayValue(Math.floor(currentValue));

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [show, value]);

    if (!show) return null;

    return (
        <div className="coin-marketcap">
            {formatMarketCap(displayValue)}
        </div>
    );
}
