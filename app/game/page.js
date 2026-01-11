'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import Image from 'next/image';

// Components & Libs
import CursorTrail from '../components/CursorTrail';
import GameCard from '../components/GameCard';
import { GAME_CONFIG } from '@/lib/gameConfig';
import { shuffleArray, formatTime } from '@/lib/utils';

export default function GamePage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState('');
    const [currentScore, setCurrentScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [leftCoin, setLeftCoin] = useState(null);
    const [rightCoin, setRightCoin] = useState(null);
    const [showLeftValue, setShowLeftValue] = useState(false);
    const [showRightValue, setShowRightValue] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [showScorePopup, setShowScorePopup] = useState(false);
    const [popupScore, setPopupScore] = useState(0);
    const [resultState, setResultState] = useState({ left: null, right: null });
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [exitingSide, setExitingSide] = useState(null);
    const [enteringSide, setEnteringSide] = useState(null);
    const [leftCoinTurns, setLeftCoinTurns] = useState(0);
    const [rightCoinTurns, setRightCoinTurns] = useState(0);
    const [selectedSide, setSelectedSide] = useState(null);
    const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.INITIAL_TIME);
    const [gameOverImage, setGameOverImage] = useState('/crying-kid.gif');

    // Dynamic Data State
    const [coins, setCoins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Speed Mode States
    const [showSpeedModeOverlay, setShowSpeedModeOverlay] = useState(false);
    const [isSpeedMode, setIsSpeedMode] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Dragging State
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - dragPosition.x,
            y: e.clientY - dragPosition.y
        });
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const boxHalfWidth = 200;
        const boxHalfHeight = 150;
        const maxX = (window.innerWidth / 2) - boxHalfWidth;
        const maxY = (window.innerHeight / 2) - boxHalfHeight;

        setDragPosition({
            x: Math.max(Math.min(newX, maxX), -maxX),
            y: Math.max(Math.min(newY, maxY), -maxY)
        });
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (gameOver) {
            const images = ['/crying-kid.gif', '/sad-hamster.gif', '/sad-meme-3.gif', '/sad-meme-4.gif', '/sad-meme-5.gif', '/sad-meme-6.gif'];
            setGameOverImage(images[Math.floor(Math.random() * images.length)]);
            setDragPosition({ x: 0, y: 0 });
        }
    }, [gameOver]);

    const usedCoinsRef = useRef(new Set());
    const availableCoinsRef = useRef([]);

    // Initialize game
    useEffect(() => {
        const savedUsername = localStorage.getItem('meme-game-username');
        const savedUserId = localStorage.getItem('meme-game-active-id');

        if (!savedUsername || !savedUserId) {
            router.push('/');
            return;
        }
        setUsername(savedUsername);
        setUserId(savedUserId);

        if (savedUserId && savedUserId !== 'GUEST') {
            fetch(`/api/leaderboard?walletAddress=${savedUserId}`)
                .then(res => res.json())
                .then(data => setHighScore(data.highScore || 0))
                .catch(() => { });
        }

        fetch('/api/coins')
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                setCoins(data);

                const validCoins = data.filter(c => c.marketCap >= 15000 && c.symbol && c.name);
                const shuffled = shuffleArray(validCoins);
                availableCoinsRef.current = shuffled.slice(2);
                usedCoinsRef.current = new Set([shuffled[0]?.id, shuffled[1]?.id].filter(Boolean));
                setLeftCoin(shuffled[0]);
                setRightCoin(shuffled[1]);
                setLeftCoinTurns(0);
                setRightCoinTurns(0);
                setTimeLeft(GAME_CONFIG.INITIAL_TIME);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load coins:", err);
                setIsLoading(false);
            });
    }, [router]);

    // Secure Score Submission
    const submitScoreSecurely = async (finalScore) => {
        if (!userId || userId === 'GUEST') return;

        // Simple obfuscation via signature
        const signature = btoa(`${finalScore}-${userId}-MEME_SECRET`);

        try {
            await fetch('/api/leaderboard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-score-signature': signature
                },
                body: JSON.stringify({ username, score: finalScore, walletAddress: userId })
            });
            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch (e) {
            console.error("Score submission failed", e);
        }
    };


    // Timer Logic
    const timerEndTimeRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const cleanup = () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        if (gameOver || showLeaderboard || isPaused || showSpeedModeOverlay || isAnimating) {
            cleanup();
            return;
        }

        if (timerEndTimeRef.current === null) {
            timerEndTimeRef.current = Date.now() + timeLeft;
        }

        const tick = () => {
            const now = Date.now();
            const remaining = timerEndTimeRef.current - now;

            if (remaining <= 0) {
                timerEndTimeRef.current = null;
                setTimeLeft(0);
                setGameOver(true);
                setResultState({ left: 'wrong', right: 'wrong' });
                submitScoreSecurely(currentScore);
                return;
            }

            setTimeLeft(remaining);
            animationFrameRef.current = requestAnimationFrame(tick);
        };

        animationFrameRef.current = requestAnimationFrame(tick);
        return cleanup;
    }, [gameOver, isAnimating, showLeaderboard, isPaused, showSpeedModeOverlay, userId, username, currentScore]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && timerEndTimeRef.current !== null) {
                const now = Date.now();
                const remaining = timerEndTimeRef.current - now;
                if (remaining <= 0) {
                    timerEndTimeRef.current = null;
                    setTimeLeft(0);
                    setGameOver(true);
                    setResultState({ left: 'wrong', right: 'wrong' });
                    submitScoreSecurely(currentScore);
                } else {
                    setTimeLeft(remaining); // Correctly resume visual timer
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [userId, username, currentScore]);

    useEffect(() => {
        if (timeLeft >= (GAME_CONFIG.INITIAL_TIME - 100) && !gameOver && !isAnimating) {
            timerEndTimeRef.current = Date.now() + timeLeft;
        }
    }, [timeLeft, gameOver, isAnimating]);


    const getNextCoin = useCallback((excludeCoins = []) => {
        const excludeSet = new Set([
            ...excludeCoins.map(c => c?.id).filter(Boolean),
            leftCoin?.id,
            rightCoin?.id,
            ...usedCoinsRef.current
        ].filter(Boolean));

        let nextCoin = null;
        while (availableCoinsRef.current.length > 0) {
            const candidate = availableCoinsRef.current.shift();
            if (candidate && !excludeSet.has(candidate.id)) {
                nextCoin = candidate;
                break;
            }
        }

        if (!nextCoin) {
            const validCoins = coins.filter(c => c.marketCap >= 15000 && c.symbol && c.name && !excludeSet.has(c.id));
            const shuffled = shuffleArray(validCoins);
            availableCoinsRef.current = shuffled.slice(1);
            nextCoin = shuffled[0];
            usedCoinsRef.current.clear();
        }

        if (nextCoin) usedCoinsRef.current.add(nextCoin.id);
        return nextCoin;
    }, [leftCoin, rightCoin, coins]);


    const handleCoinClick = async (clickedSide) => {
        if (!leftCoin || !rightCoin || isAnimating || gameOver || isPaused) return;

        setIsAnimating(true);
        setSelectedSide(clickedSide);

        const clickedCoin = clickedSide === 'left' ? leftCoin : rightCoin;
        const otherCoin = clickedSide === 'left' ? rightCoin : leftCoin;
        const isCorrect = Number(clickedCoin.marketCap) >= Number(otherCoin.marketCap);

        if (clickedSide === 'left') setShowLeftValue(true);
        else setShowRightValue(true);

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.ANIMATION_DURATION));

        if (clickedSide === 'left') setShowRightValue(true);
        else setShowLeftValue(true);

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.ANIMATION_DURATION));

        if (isCorrect) {
            const newScore = currentScore + 1;
            setCurrentScore(newScore);
            setResultState({
                left: clickedSide === 'left' ? 'correct' : null,
                right: clickedSide === 'right' ? 'correct' : null
            });
            setPopupScore(newScore);

            setTimeout(() => {
                setShowScorePopup(true);
            }, GAME_CONFIG.BOUNCE_DELAY);

            if (newScore > highScore) setHighScore(newScore);

            // SPEED MODE
            if (newScore === GAME_CONFIG.SPEED_MODE_THRESHOLD) {
                setTimeout(() => {
                    setIsPaused(true);
                    setShowSpeedModeOverlay(true);
                    setIsSpeedMode(true);
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FF6B35', '#ffffff'] });
                    setTimeout(() => {
                        setShowSpeedModeOverlay(false);
                        setIsPaused(false);
                    }, 4000);
                }, 2000);
                await new Promise(resolve => setTimeout(resolve, 6000));
            }

            setTimeout(async () => {
                setShowScorePopup(false);
                setResultState({ left: null, right: null });
                setSelectedSide(null);
                setTimeLeft(newScore >= GAME_CONFIG.SPEED_MODE_THRESHOLD ? GAME_CONFIG.SPEED_MODE_TIME : GAME_CONFIG.INITIAL_TIME);

                const winnerTurns = clickedSide === 'left' ? leftCoinTurns : rightCoinTurns;
                const loserCoin = clickedSide === 'left' ? rightCoin : leftCoin;

                // Logic for winner staying/leaving based on turns
                setExitingSide(winnerTurns >= GAME_CONFIG.MAX_WINNER_TURNS ? clickedSide : (clickedSide === 'left' ? 'right' : 'left'));

                await new Promise(resolve => setTimeout(resolve, 500));

                if (winnerTurns >= GAME_CONFIG.MAX_WINNER_TURNS) {
                    // Winner leaves (replaced), loser stays
                    const newCoin = getNextCoin([loserCoin]);
                    if (clickedSide === 'left') {
                        setLeftCoin(newCoin);
                        setLeftCoinTurns(0);
                        setRightCoinTurns(0);
                        setEnteringSide('left');
                        setShowLeftValue(false);
                        setShowRightValue(true);
                    } else {
                        setRightCoin(newCoin);
                        setRightCoinTurns(0);
                        setLeftCoinTurns(0);
                        setEnteringSide('right');
                        setShowLeftValue(true);
                        setShowRightValue(false);
                    }
                } else {
                    // Winner stays, loser leaves (replaced)
                    if (clickedSide === 'left') {
                        setRightCoin(getNextCoin([leftCoin]));
                        setLeftCoinTurns(leftCoinTurns + 1);
                        setRightCoinTurns(0);
                        setEnteringSide('right');
                        setShowLeftValue(true);
                        setShowRightValue(false);
                    } else {
                        setLeftCoin(getNextCoin([rightCoin]));
                        setRightCoinTurns(rightCoinTurns + 1);
                        setLeftCoinTurns(0);
                        setEnteringSide('left');
                        setShowRightValue(true);
                        setShowLeftValue(false);
                    }
                }

                setExitingSide(null);
                setIsAnimating(false);
                setTimeout(() => setEnteringSide(null), 500);

            }, newScore === GAME_CONFIG.SPEED_MODE_THRESHOLD ? 500 : GAME_CONFIG.NEXT_ROUND_DELAY_NORMAL);

        } else {
            setResultState({
                left: clickedSide === 'left' ? 'wrong' : null,
                right: clickedSide === 'right' ? 'wrong' : null
            });
            submitScoreSecurely(currentScore);
            setTimeout(() => {
                setGameOver(true);
                setIsAnimating(false);
            }, 1500);
        }
    };

    const restartGame = () => {
        const validCoins = coins.filter(c => c.marketCap >= 15000 && c.symbol && c.name);
        const shuffled = shuffleArray(validCoins);
        availableCoinsRef.current = shuffled.slice(2);
        usedCoinsRef.current = new Set([shuffled[0]?.id, shuffled[1]?.id].filter(Boolean));
        setLeftCoin(shuffled[0]);
        setRightCoin(shuffled[1]);
        setCurrentScore(0);
        setShowLeftValue(false);
        setShowRightValue(false);
        setGameOver(false);
        setResultState({ left: null, right: null });
        setSelectedSide(null);
        setLeftCoinTurns(0);
        setRightCoinTurns(0);
        setTimeLeft(GAME_CONFIG.INITIAL_TIME);
        setIsSpeedMode(false);
        setShowSpeedModeOverlay(false);
    };

    if (isLoading || !leftCoin || !rightCoin) {
        return <div className="game-container center-content"><p>Loading Game Data...</p></div>;
    }

    return (
        <>
            <div className="game-container">
                <div className="score-display high-score">
                    <div className="score-label">High Score</div>
                    <div className="score-value">{highScore}</div>
                </div>
                <div className="score-display current-score">
                    <div className="score-label">Score</div>
                    <div className="score-value">{currentScore}</div>
                </div>
                <div className="timer-container">
                    <div className={`timer-value ${timeLeft < 3000 ? 'danger' : ''} ${isSpeedMode ? 'speed-active' : ''}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
                <div className="leaderboard-toggle">
                    <button className="toggle-button" onClick={() => {
                        fetch('/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data.leaderboard || []));
                        setShowLeaderboard(true);
                    }}>🏆 Leaderboard</button>
                </div>

                <GameCard
                    side="left"
                    coin={leftCoin}
                    resultState={resultState.left}
                    selectedSide={selectedSide}
                    isAnimating={isAnimating}
                    exitingSide={exitingSide}
                    enteringSide={enteringSide}
                    onClick={handleCoinClick}
                    showValue={showLeftValue}
                />

                {/* Central Pill */}
                <div className={`pill-container 
                    ${resultState.left === 'correct' ? 'left-correct' : ''} 
                    ${resultState.right === 'correct' ? 'right-correct' : ''}
                    ${resultState.left === 'wrong' ? 'left-wrong' : ''} 
                    ${resultState.right === 'wrong' ? 'right-wrong' : ''}
                    ${isDragging ? 'grabbing' : ''}
                `}
                    style={{
                        transform: `translate(calc(-50% + ${dragPosition.x}px), calc(-50% + ${dragPosition.y}px))`
                    }}
                    onMouseDown={handleMouseDown}
                >
                    <img src="/vs-pill-v2.png" alt="VS" className={`pill-image ${showScorePopup || resultState.left === 'wrong' || resultState.right === 'wrong' ? 'hidden' : ''}`} draggable="false" />
                    <img src="/pill-broken.jpg" alt="Defeat" className={`pill-image-broken ${resultState.left === 'wrong' || resultState.right === 'wrong' ? 'visible' : ''}`} draggable="false" />
                    <div className={`pill-score ${showScorePopup ? 'visible' : ''}`}>{popupScore}</div>
                </div>

                <GameCard
                    side="right"
                    coin={rightCoin}
                    resultState={resultState.right}
                    selectedSide={selectedSide}
                    isAnimating={isAnimating}
                    exitingSide={exitingSide}
                    enteringSide={enteringSide}
                    onClick={handleCoinClick}
                    showValue={showRightValue}
                />

                <div className="version-label" style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.7, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none', zIndex: 5 }}>
                    {GAME_CONFIG.GAME_VERSION}
                </div>
            </div>

            {/* Speed Mode Overlay */}
            {showSpeedModeOverlay && (
                <div className="speed-mode-overlay">
                    <div className="speed-mode-content">
                        <img src="/speed-mode-character.png" alt="Speed Mode" className="speed-mode-logo" />
                        <div className="speed-mode-text">
                            CONGRATULATIONS!<br />SPEED MODE ACTIVATED!<br />TIMER REDUCED TO 5 SECONDS!
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <>
                    <div className="leaderboard-modal-backdrop" onClick={() => setShowLeaderboard(false)} />
                    <div className="leaderboard-modal">
                        <button className="modal-close" onClick={() => setShowLeaderboard(false)}>✕</button>
                        <h3 className="leaderboard-title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🏆 Top Players</h3>
                        <div className="leaderboard-list">
                            {leaderboard.map((entry, index) => (
                                <div key={index} className="leaderboard-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="username">{entry.username}</span>
                                    <span className="score">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Game Over */}
            {gameOver && (
                <div className="game-over-overlay">
                    <div
                        className="game-over-background"
                        style={{ backgroundImage: `url(${gameOverImage})` }}
                    />
                    <div
                        className="game-over-content"
                        onMouseDown={handleMouseDown}
                        style={{
                            transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                    >
                        <div className="drag-hint">
                            <span>✢ Drag to move</span>
                        </div>
                        <div className="game-over-title">You scored</div>
                        <div className="game-over-score">{currentScore}</div>
                        <div className="game-over-buttons">
                            <button
                                className="game-over-btn-image-container"
                                onClick={restartGame}
                            >
                                <img src="/btn-play-again.png" alt="Play Again" />
                            </button>

                            <button
                                className="game-over-btn-image-container"
                                onClick={() => {
                                    const text = `🔥 I just scored ${currentScore} on @pumpordumpgame!\n\nCan you beat my record? 🚀\n\nPlay now 👇\npumpordumpgame.fun`;
                                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                            >
                                <img src="/btn-share.png" alt="Share Score" />
                            </button>

                            <button
                                className="game-over-btn-image-container"
                                onClick={() => router.push('/')}
                            >
                                <img src="/btn-home.png" alt="Home" />
                            </button>
                        </div>
                    </div>
                    <div className="version-label" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.7, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
                        {GAME_CONFIG.GAME_VERSION}
                    </div>
                </div>
            )}

            {/* Social Link */}
            <a
                href="https://x.com/pumpordumpgame"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link-container"
            >
                <img src="/x-logo.svg" alt="X (Twitter)" className="social-icon" />
            </a>

            <div className="ca-label">
                CA: <span>Coming Soon..</span>
            </div>

            <CursorTrail />
        </>
    );
}
