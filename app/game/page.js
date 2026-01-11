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

const GAME_OVER_IMAGES = [
    '/crying-kid.gif',
    '/sad-hamster.gif',
    '/sad-meme-3.gif',
    '/sad-meme-4.gif',
    '/sad-meme-5.gif',
    '/sad-meme-6.gif'
];

export default function GamePage({ onGoHome }) {
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
    const [sessionId, setSessionId] = useState(null);

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

    // Preload Images on Mount
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                GAME_OVER_IMAGES.forEach((src) => {
                    const img = document.createElement('img');
                    img.src = src;
                });
            }
        } catch (e) {
            console.warn("Failed to preload images", e);
        }
    }, []);

    useEffect(() => {
        if (gameOver) {
            setGameOverImage(GAME_OVER_IMAGES[Math.floor(Math.random() * GAME_OVER_IMAGES.length)]);
            setDragPosition({ x: 0, y: 0 });
        }
    }, [gameOver]);

    // Initialize game
    useEffect(() => {
        const savedUsername = localStorage.getItem('meme-game-username');
        const savedUserId = localStorage.getItem('meme-game-active-id');

        if (!savedUsername || !savedUserId) {
            if (onGoHome) {
                onGoHome();
            } else {
                router.push('/');
            }
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

        // Start game session on server
        fetch('/api/game/start', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error('Failed to start game:', data.error);
                    setIsLoading(false);
                    return;
                }
                setSessionId(data.sessionId);
                setLeftCoin(data.leftCoin);
                setRightCoin(data.rightCoin);
                setLeftCoinTurns(0);
                setRightCoinTurns(0);
                setTimeLeft(GAME_CONFIG.INITIAL_TIME);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to start game:', err);
                setIsLoading(false);
            });
    }, [router]);

    // Score submission is now handled server-side in /api/game/guess
    const refreshLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch (e) {
            console.error('Failed to refresh leaderboard', e);
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
                // Submit score via timeout API
                if (sessionId) {
                    fetch('/api/game/timeout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, username, walletAddress: userId })
                    }).then(() => refreshLeaderboard()).catch(console.error);
                }
                return;
            }

            setTimeLeft(remaining);
            animationFrameRef.current = requestAnimationFrame(tick);
        };

        animationFrameRef.current = requestAnimationFrame(tick);
        return cleanup;
    }, [gameOver, isAnimating, showLeaderboard, isPaused, showSpeedModeOverlay, userId, username, currentScore, sessionId]);

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
                    if (sessionId) {
                        fetch('/api/game/timeout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId, username, walletAddress: userId })
                        }).then(() => refreshLeaderboard()).catch(console.error);
                    }
                } else {
                    setTimeLeft(remaining); // Correctly resume visual timer
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [userId, username, currentScore, sessionId]);

    useEffect(() => {
        if (timeLeft >= (GAME_CONFIG.INITIAL_TIME - 100) && !gameOver && !isAnimating) {
            timerEndTimeRef.current = Date.now() + timeLeft;
        }
    }, [timeLeft, gameOver, isAnimating]);


    const handleCoinClick = async (clickedSide) => {
        if (!leftCoin || !rightCoin || isAnimating || gameOver || isPaused || !sessionId) return;

        setIsAnimating(true);
        setSelectedSide(clickedSide);

        // Show animations before server call
        if (clickedSide === 'left') setShowLeftValue(true);
        else setShowRightValue(true);

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.ANIMATION_DURATION));

        // Call server to validate guess
        try {
            const res = await fetch('/api/game/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    guess: clickedSide,
                    username,
                    walletAddress: userId
                })
            });
            const data = await res.json();

            if (data.error) {
                console.error('Guess error:', data.error);
                setIsAnimating(false);
                return;
            }

            // Update coins with revealed market caps for display
            setLeftCoin(prev => ({ ...prev, marketCap: data.leftMarketCap }));
            setRightCoin(prev => ({ ...prev, marketCap: data.rightMarketCap }));

            // Show both values after reveal
            setShowLeftValue(true);
            setShowRightValue(true);

            await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.ANIMATION_DURATION));

            if (data.correct) {
                const newScore = data.score;
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

                    // Animate coin transition
                    setExitingSide(clickedSide === 'left' ? 'right' : 'left');

                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Update with next coins from server
                    if (data.nextLeftCoin) setLeftCoin(data.nextLeftCoin);
                    if (data.nextRightCoin) setRightCoin(data.nextRightCoin);

                    setLeftCoinTurns(0);
                    setRightCoinTurns(0);
                    setEnteringSide(clickedSide === 'left' ? 'right' : 'left');
                    // Left coin always has marketCap from server, right never does
                    setShowLeftValue(true);
                    setShowRightValue(false);

                    setExitingSide(null);
                    setIsAnimating(false);
                    setTimeout(() => setEnteringSide(null), 500);

                }, newScore === GAME_CONFIG.SPEED_MODE_THRESHOLD ? 500 : GAME_CONFIG.NEXT_ROUND_DELAY_NORMAL);

            } else {
                // Wrong guess - game over
                setResultState({
                    left: clickedSide === 'left' ? 'wrong' : null,
                    right: clickedSide === 'right' ? 'wrong' : null
                });
                refreshLeaderboard();
                setTimeout(() => {
                    setGameOver(true);
                    setIsAnimating(false);
                }, 1500);
            }
        } catch (error) {
            console.error('Failed to submit guess:', error);
            setIsAnimating(false);
        }
    };

    const restartGame = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/game/start', { method: 'POST' });
            const data = await res.json();
            if (data.error) {
                console.error('Failed to restart game:', data.error);
                setIsLoading(false);
                return;
            }
            setSessionId(data.sessionId);
            setLeftCoin(data.leftCoin);
            setRightCoin(data.rightCoin);
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
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to restart game:', err);
            setIsLoading(false);
        }
    };

    if (isLoading || !leftCoin || !rightCoin) {
        return null;
    }

    return (
        <>
            <div className="game-container slide-enter">
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
                                onClick={() => {
                                    if (onGoHome) onGoHome();
                                    else router.push('/');
                                }}
                            >
                                <img src="/btn-home.png" alt="Home" />
                            </button>
                        </div>
                    </div>
                    <div className="version-label" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.7, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
                        {GAME_CONFIG.GAME_VERSION}
                    </div>

                    {/* Social Link - Only visible in Game Over */}
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
                </div>
            )}

            <CursorTrail />
        </>
    );
}
