'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CursorTrail from './components/CursorTrail';
import GamePage from './game/page';
import { GAME_CONFIG } from '@/lib/gameConfig';

export default function Home() {
  const [username, setUsername] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioned, setIsTransitioned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load leaderboard
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Check for saved username and wallet
    const savedUsername = localStorage.getItem('meme-game-username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    const savedWallet = localStorage.getItem('meme-game-wallet');
    if (savedWallet) {
      setWalletAddress(savedWallet);
    }
  }, []);

  const handleStart = () => {
    if (username.trim()) {
      localStorage.setItem('meme-game-username', username.trim());

      let finalId = walletAddress.trim();

      if (finalId) {
        // User provided wallet - they can save score
        localStorage.setItem('meme-game-wallet', finalId);
        localStorage.setItem('meme-game-active-id', finalId);
      } else {
        // No wallet - GUEST mode - no score saving
        localStorage.setItem('meme-game-active-id', 'GUEST');
      }

      setIsPlaying(true);
      setTimeout(() => setIsTransitioned(true), 850); // Slightly longer than 0.8s animation
    }
  };

  const handleGoHome = () => {
    setIsPlaying(false);
    setIsTransitioned(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username.trim()) {
      handleStart();
    }
  };

  const getRankClass = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  return (
    <div className="username-screen">
      {/* Background */}
      <div className="home-background" />

      {/* Content */}
      <div className="home-content">
        {/* Pump.fun Logo */}
        <img
          src="/logo-new.png"
          alt="Pump.fun"
          className="pump-logo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        <img
          src="/logo-pump-or-dump.png"
          alt="PUMP or DUMP?"
          className="game-title-image"
        />
        <p className="game-subtitle">
          Guess which <span className="highlight-solana">Solana meme coin</span> has the <span className="highlight-green">higher market cap</span> to compete with trenchers and <span className="highlight-orange">win Solana</span>!
        </p>

        <div className="username-form">
          <input
            type="text"
            className="username-input"
            placeholder="Enter your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={20}
            autoFocus
          />
          <input
            type="text"
            className="username-input wallet-input"
            placeholder="Insert Wallet to join Leaderboard"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            style={{ marginTop: '10px', fontSize: '0.9rem', width: '100%', maxWidth: '300px' }}
          />

          <button
            className="start-button-image-container"
            onClick={handleStart}
            disabled={!username.trim()}
          >
            <img
              src="/play-button.png"
              alt="Play Now"
              className="start-button-image"
            />
          </button>
          <button className="info-button" onClick={() => setShowInfo(true)}>
            INFO
          </button>
        </div>

        <div className="leaderboard-preview">
          <h3 className="leaderboard-title">🏆 Top Players</h3>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '1rem 0' }}>Loading...</p>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <div key={index} className="leaderboard-entry">
                <span className={`leaderboard-rank ${getRankClass(index)}`}>
                  #{index + 1}
                </span>
                <span className="leaderboard-name">
                  {entry.username}
                  {entry.wallet_address && (
                    <span
                      style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem', fontWeight: 400, opacity: 0.7, cursor: 'pointer', textDecoration: 'underline dotted' }}
                      title="Click to copy full address"
                      onClick={(e) => {
                        navigator.clipboard.writeText(entry.wallet_address);
                        const originalText = e.target.innerText;
                        e.target.innerText = 'Copied!';
                        setTimeout(() => { e.target.innerText = originalText; }, 1000);
                      }}
                    >
                      {entry.wallet_address.slice(0, 4)}...{entry.wallet_address.slice(-4)}
                    </span>
                  )}
                </span>
                <span className="leaderboard-score">{entry.score}</span>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#888', padding: '1rem 0' }}>
              No scores yet. Be the first!
            </p>
          )}
        </div>
      </div>

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

      <div className="version-label" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.7, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
        {GAME_CONFIG.GAME_VERSION}
      </div>

      {/* Hide home content after game is fully loaded to prevent interaction/rendering underneath */}
      <style jsx global>{`
        .home-content, .home-background, .social-link-container, .ca-label {
          display: ${isTransitioned ? 'none' : 'flex'};
        }
      `}</style>

      {/* Info Modal */}
      {showInfo && (
        <>
          <div className="leaderboard-modal-backdrop" onClick={() => setShowInfo(false)} />
          <div className="leaderboard-modal" style={{ maxWidth: '600px', width: '90%', textAlign: 'left', lineHeight: '1.4', fontSize: '0.82rem', padding: '1.5rem' }}>
            <button className="modal-close" onClick={() => setShowInfo(false)}>✕</button>
            <h3 style={{ marginBottom: '0.8rem', textAlign: 'center', fontSize: '1.3rem', marginTop: '0' }}>Welcome to PUMP or DUMP? 🚀</h3>
            <div>
              <p style={{ marginBottom: '0.8rem' }}>Inspired by the classic Higher-Lower mechanic, adapted for the <strong>pump.fun</strong> ecosystem.</p>

              <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>🎮 Gameplay & Leaderboard</h4>
              <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>Enter a username to start playing immediately. However, to track your progress and climb the ranks, <strong>wallet insertion is required</strong>. Only verified wallets will be inserted into the database and have their score stored. Your wallet address serves as your secure login, ensuring a verified leaderboard. Returning players can improve their stored scores simply by re-entering the same wallet.</p>

              <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>💸 Hourly Rewards</h4>
              <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>We believe in rewarding skill. Every hour, the <strong>top 3 players</strong> on the leaderboard receive <strong>2% of the creator fees</strong> generated on pump.fun. Winners are subsequently moved to the "Rewarded Users" section, keeping the competition fresh every round.</p>

              <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>📊 Powered by Dexscreener API</h4>
              <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>We prioritize accuracy. All coin data and Market Caps are fetched directly from the <strong>Dexscreener API</strong> and updated hourly in real-time.</p>

              <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>🚀 Our Mission</h4>
              <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>PUMP or DUMP? was born to last. In a chaotic market, we are building a project that is unique, engaging, and genuinely fun to use.</p>

              <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>🪙 Token Launch</h4>
              <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>The official project token is launching soon on <strong>pump.fun</strong>. <br />
                <em style={{ color: '#ff4444' }}>Note: The Contract Address (CA) will only be communicated via our official channels. Please beware of imitations; we hold no responsibility for tokens launched outside our control.</em></p>

              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem' }}>Good game! 🍀</p>
            </div>
          </div>
        </>
      )}

      <CursorTrail />

      {isPlaying && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
            <GamePage onGoHome={handleGoHome} />
          </div>
        </div>
      )}
    </div>
  );
}
