"use client";
import { useEffect, useRef } from 'react';

const CursorTrail = () => {
    const canvasRef = useRef(null);
    const trailsRef = useRef([]);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
            // Add new particle on move
            trailsRef.current.push({
                x: e.clientX,
                y: e.clientY,
                size: Math.random() * 8 + 4, // Random size 4-12px
                color: Math.random() > 0.5 ? '#8CDDAB' : '#FFFFFF', // Mix of green and white
                alpha: 1,
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2
                }
            });
        };

        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw trails
            for (let i = trailsRef.current.length - 1; i >= 0; i--) {
                const p = trailsRef.current[i];

                // Update
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.alpha -= 0.02; // Fade out speed
                p.size -= 0.1; // Shrink speed

                // Remove dead particles
                if (p.alpha <= 0 || p.size <= 0) {
                    trailsRef.current.splice(i, 1);
                    continue;
                }

                // Draw
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.restore();
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9999,
                background: 'transparent'
            }}
        />
    );
};

export default CursorTrail;
