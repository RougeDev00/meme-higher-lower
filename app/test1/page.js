'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import coins from '@/data/coins.json';
import confetti from 'canvas-confetti';
import CursorTrail from '../components/CursorTrail';

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Format market cap number
function formatMarketCap(num) {
    if (num >= 1e9) {
        return '$' + (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return '$' + (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return '$' + (num / 1e3).toFixed(2) + 'K';
    }
    return '$' + num.toLocaleString();
}

// Get launchpad display name
function getLaunchpadName(platform) {
    const platformMap = {
        'pump.fun': 'Pump.fun',
        'pumpswap': 'Pump.fun',
        'raydium': 'Raydium',
        'meteora': 'Meteora',
        'orca': 'Orca',
        'bonk.fun': 'BONK.fun',
        'moonshot': 'Moonshot',
        'various': 'Multiple DEXs',
        'unknown': 'Unknown'
    };
    return platformMap[platform?.toLowerCase()] || platform || 'Unknown';
}

// Animated counter component
function AnimatedMarketCap({ value, show }) {
    const [displayValue, setDisplayValue] = useState(0);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!show) {
            setDisplayValue(0);
            return;
        }

        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        const startValue = 0;
        const endValue = value;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
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

export default function SpeedModePage() {
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
    const [timeLeft, setTimeLeft] = useState(10000);
    const [gameOverImage, setGameOverImage] = useState('/crying-kid.gif');

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

    useEffect(() => {
        const savedUsername = localStorage.getItem('meme-game-username');
        const savedUserId = localStorage.getItem('meme-game-active-id');

        if (!savedUsername) { // Allow testing without redirect if just checking UI, but better to enforce mocked
            // For /prova1 specific test, we can mock if empty
            setUsername('TestUser');
            setUserId('GUEST');
        } else {
            setUsername(savedUsername);
            setUserId(savedUserId);
        }

        if (savedUserId && savedUserId !== 'GUEST') {
            fetch(`/api/leaderboard?walletAddress=${savedUserId}`)
                .then(res => res.json())
                .then(data => setHighScore(data.highScore || 0))
                .catch(() => { });
        }

        const validCoins = coins.filter(c =>
            c.marketCap >= 15000 &&
            c.symbol &&
            c.name
        );
        const shuffled = shuffleArray(validCoins);
        availableCoinsRef.current = shuffled.slice(2);
        usedCoinsRef.current = new Set([shuffled[0]?.id, shuffled[1]?.id].filter(Boolean));
        setLeftCoin(shuffled[0]);
        setRightCoin(shuffled[1]);
        setLeftCoinTurns(0);
        setRightCoinTurns(0);
        setTimeLeft(10000);
    }, [router]);

    // Timer Logic
    useEffect(() => {
        if (gameOver || isAnimating || timeLeft <= 0 || showLeaderboard || isPaused || showSpeedModeOverlay) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 10) {
                    clearInterval(interval);
                    setGameOver(true);
                    setResultState({ left: 'wrong', right: 'wrong' });

                    if (userId && userId !== 'GUEST') {
                        fetch('/api/leaderboard', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, score: currentScore, walletAddress: userId })
                        }).then(() => {
                            fetch('/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data.leaderboard || []));
                        });
                    }

                    return 0;
                }
                return prev - 10;
            });
        }, 10);

        return () => clearInterval(interval);
    }, [gameOver, isAnimating, showLeaderboard, currentScore, username, userId, isPaused, showSpeedModeOverlay]);

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
    };

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
            const validCoins = coins.filter(c =>
                c.marketCap >= 15000 &&
                c.symbol &&
                c.name &&
                !excludeSet.has(c.id)
            );
            const shuffled = shuffleArray(validCoins);
            availableCoinsRef.current = shuffled.slice(1);
            nextCoin = shuffled[0];
            usedCoinsRef.current.clear();
        }

        if (nextCoin) {
            usedCoinsRef.current.add(nextCoin.id);
        }

        return nextCoin;
    }, [leftCoin, rightCoin]);

    const handleCoinClick = async (clickedSide) => {
        if (!leftCoin || !rightCoin || isAnimating || gameOver || isPaused) return;

        setIsAnimating(true);
        setSelectedSide(clickedSide);

        const clickedCoin = clickedSide === 'left' ? leftCoin : rightCoin;
        const otherCoin = clickedSide === 'left' ? rightCoin : leftCoin;
        const isCorrect = Number(clickedCoin.marketCap) >= Number(otherCoin.marketCap);

        if (clickedSide === 'left') {
            setShowLeftValue(true);
        } else {
            setShowRightValue(true);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (clickedSide === 'left') {
            setShowRightValue(true);
        } else {
            setShowLeftValue(true);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

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
            }, 1000);

            if (newScore > highScore) {
                setHighScore(newScore);
            }

            // SPEED MODE TRIGGER
            if (newScore === 10) {
                setTimeout(() => {
                    setIsPaused(true);
                    setShowSpeedModeOverlay(true);
                    setIsSpeedMode(true);
                    // Use confetti for extra flair
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FF6B35', '#ffffff']
                    });

                    setTimeout(() => {
                        setShowSpeedModeOverlay(false);
                        setIsPaused(false);
                        // Timer will reset to 5s in the next block flow or we ensure it here?
                        // The flow continues below to reset timer.
                    }, 4000);
                }, 2000); // Wait a bit after score popup appears

                // We need to wait for the overlay to finish before proceeding with the round reset logic?
                // Yes.
                await new Promise(resolve => setTimeout(resolve, 6000)); // 2000 delay + 4000 duration
            }

            setTimeout(async () => {
                setShowScorePopup(false);
                setResultState({ left: null, right: null });
                setResultState({ left: null, right: null });
                setSelectedSide(null);

                // Reset timer: Use 5000 if speed mode, else 10000
                // Note: newScore is already updated to currentScore+1
                // logic: if newScore >= 10, then 5s.
                setTimeLeft(newScore >= 10 ? 5000 : 10000);

                const winnerTurns = clickedSide === 'left' ? leftCoinTurns : rightCoinTurns;
                const loserCoin = clickedSide === 'left' ? rightCoin : leftCoin;
                let exitSide = '';

                if (winnerTurns >= 1) {
                    exitSide = clickedSide;
                    setExitingSide(exitSide);
                } else {
                    exitSide = clickedSide === 'left' ? 'right' : 'left';
                    setExitingSide(exitSide);
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                if (winnerTurns >= 1) {
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

            }, newScore === 10 ? 500 : 3500); // If speed mode triggered, we waited already above with await, so this timeout should be short? 
            // Wait, if I await 6000ms above, the code halts there.
            // But the setTimeout(..., 3500) was originally scheduling the reset.
            // If I just await inline inside execution, I need to make sure I don't double wait or conflict.
            // Let's refactor slightly:
            // The original logic had one big setTimeout(..., 3500).
            // I should put my speed mode pause INSIDE that timeout or reorganize.

        } else {
            // Wrong guess logic (same as original)
            setResultState({
                left: clickedSide === 'left' ? 'wrong' : null,
                right: clickedSide === 'right' ? 'wrong' : null
            });

            if (userId && userId !== 'GUEST') {
                await fetch('/api/leaderboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, score: currentScore, walletAddress: userId })
                });
            }

            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);

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
        setTimeLeft(10000);
        setIsSpeedMode(false); // Reset speed mode
        setShowSpeedModeOverlay(false);
    };

    const goHome = () => {
        router.push('/');
    };

    if (!leftCoin || !rightCoin) {
        return (
            <div className="game-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <p>Loading...</p>
            </div>
        );
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
                    <button
                        className="toggle-button"
                        onClick={() => {
                            fetch('/api/leaderboard')
                                .then(res => res.json())
                                .then(data => setLeaderboard(data.leaderboard || []));
                            setShowLeaderboard(true);
                        }}
                    >
                        🏆 Leaderboard
                    </button>
                </div>

                <div
                    className={`coin-side ${resultState.left || ''} ${selectedSide === 'left' ? 'selected' : ''} ${isAnimating ? 'disabled' : ''} ${exitingSide === 'left' ? 'slide-up' : ''} ${enteringSide === 'left' ? 'slide-in' : ''}`}
                    onClick={() => handleCoinClick('left')}
                >
                    <div
                        className="coin-background"
                        style={{
                            backgroundImage: leftCoin.logo?.startsWith('http')
                                ? `url(${leftCoin.logo})`
                                : undefined,
                            backgroundColor: leftCoin.color || '#1a1a2e'
                        }}
                    />
                    <div className="coin-info-container">
                        {leftCoin.logo?.startsWith('http') ? (
                            <img
                                key={leftCoin.id}
                                src={leftCoin.logo}
                                alt={leftCoin.name}
                                className="coin-logo-large"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className="coin-logo-placeholder"
                            style={{ display: leftCoin.logo?.startsWith('http') ? 'none' : 'flex' }}
                        >
                            {leftCoin.symbol?.[0] || '?'}
                        </div>

                        <div className="coin-ticker">{leftCoin.symbol}</div>
                        <div className="coin-name">{leftCoin.name}</div>
                        <div className="coin-launchpad">{getLaunchpadName(leftCoin.platform)}</div>
                        <AnimatedMarketCap
                            value={leftCoin.marketCap}
                            show={showLeftValue}
                        />
                    </div>
                </div>

                <div className={`pill-container 
                    ${resultState.left === 'correct' ? 'left-correct' : ''} 
                    ${resultState.right === 'correct' ? 'right-correct' : ''}
                    ${resultState.left === 'wrong' ? 'left-wrong' : ''} 
                    ${resultState.right === 'wrong' ? 'right-wrong' : ''}
                `}>
                    <img
                        src="/vs-pill-v2.png"
                        alt="VS"
                        className={`pill-image ${showScorePopup || resultState.left === 'wrong' || resultState.right === 'wrong' ? 'hidden' : ''}`}
                    />
                    <img
                        src="/pill-broken.jpg"
                        alt="Defeat"
                        className={`pill-image-broken ${resultState.left === 'wrong' || resultState.right === 'wrong' ? 'visible' : ''}`}
                    />
                    <div className={`pill-score ${showScorePopup ? 'visible' : ''}`}>
                        {popupScore}
                    </div>
                </div>

                <div
                    className={`coin-side ${resultState.right || ''} ${selectedSide === 'right' ? 'selected' : ''} ${isAnimating ? 'disabled' : ''} ${exitingSide === 'right' ? 'slide-up' : ''} ${enteringSide === 'right' ? 'slide-in' : ''}`}
                    onClick={() => handleCoinClick('right')}
                >
                    <div
                        className="coin-background"
                        style={{
                            backgroundImage: rightCoin.logo?.startsWith('http')
                                ? `url(${rightCoin.logo})`
                                : undefined,
                            backgroundColor: rightCoin.color || '#16213e'
                        }}
                    />
                    <div className="coin-info-container">
                        {rightCoin.logo?.startsWith('http') ? (
                            <img
                                key={rightCoin.id}
                                src={rightCoin.logo}
                                alt={rightCoin.name}
                                className="coin-logo-large"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className="coin-logo-placeholder"
                            style={{ display: rightCoin.logo?.startsWith('http') ? 'none' : 'flex' }}
                        >
                            {rightCoin.symbol?.[0] || '?'}
                        </div>

                        <div className="coin-ticker">{rightCoin.symbol}</div>
                        <div className="coin-name">{rightCoin.name}</div>
                        <div className="coin-launchpad">{getLaunchpadName(rightCoin.platform)}</div>
                        <AnimatedMarketCap
                            value={rightCoin.marketCap}
                            show={showRightValue}
                        />
                    </div>
                </div>
            </div>

            {/* Speed Mode Overlay */}
            {showSpeedModeOverlay && (
                <div className="speed-mode-overlay">
                    <div className="speed-mode-content">
                        <img
                            src="/logo-pump-or-dump.png"
                            alt="Speed Mode"
                            className="speed-mode-logo"
                        />
                        <div className="speed-mode-text">
                            CONGRATULATIONS!<br />
                            SPEED MODE ACTIVATED!<br />
                            TIMER REDUCED TO 5 SECONDS!
                        </div>
                    </div>
                </div>
            )}

            {showLeaderboard && (
                <>
                    <div
                        className="leaderboard-modal-backdrop"
                        onClick={() => setShowLeaderboard(false)}
                    />
                    <div className="leaderboard-modal">
                        <button
                            className="modal-close"
                            onClick={() => setShowLeaderboard(false)}
                        >
                            ✕
                        </button>
                        <h3 className="leaderboard-title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            🏆 Top Players
                        </h3>
                        {leaderboard.map((entry, index) => (
                            <div key={index} className="leaderboard-entry">
                                <span className={`leaderboard-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''
                                    }`}>
                                    #{index + 1}
                                </span>
                                <span className="leaderboard-name">{entry.username}</span>
                                <span className="leaderboard-score">{entry.score}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

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

                            <button className="game-over-btn-image-container">
                                <img src="/btn-share.png" alt="Share Score" />
                            </button>

                            <button
                                className="game-over-btn-image-container"
                                onClick={goHome}
                            >
                                <img src="/btn-home.png" alt="Home" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {gameOver && <CursorTrail />}
        </>
    );
}
