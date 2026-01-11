'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import CursorTrail from './components/CursorTrail';
import GamePage from './game/page';
import InfoModal from './components/InfoModal';
import { GAME_CONFIG } from '@/lib/gameConfig';

export default function Home() {
  const [username, setUsername] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState('');
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
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

  const handleStart = async () => {
    if (username.trim()) {
      // Wallet is already validated when connected via Phantom
      // Conflict check also happens during wallet connection
      proceedToStart(username.trim(), walletAddress);
    }
  };

  const proceedToStart = (finalUsername, finalWallet) => {
    localStorage.setItem('meme-game-username', finalUsername);

    if (finalWallet) {
      localStorage.setItem('meme-game-wallet', finalWallet);
      localStorage.setItem('meme-game-active-id', finalWallet);
    } else {
      localStorage.setItem('meme-game-active-id', 'GUEST');
    }

    setIsPlaying(true);
    setTimeout(() => setIsTransitioned(true), 850);
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

  const connectPhantom = async () => {
    setIsWalletConnecting(true);
    setWalletError('');

    try {
      // Check if Phantom is installed
      const { solana } = window;

      if (!solana?.isPhantom) {
        setWalletError('Phantom wallet not found. Please install it.');
        setIsWalletConnecting(false);
        return;
      }

      // Connect to Phantom (read-only, just gets public key)
      const response = await solana.connect();
      const address = response.publicKey.toString();

      // Check if wallet is already taken by another user
      try {
        const res = await fetch(`/api/user/check?walletAddress=${address}`);
        const data = await res.json();
        if (data.exists && data.username !== username.trim()) {
          setWalletError('Wallet already taken');
          setIsWalletConnecting(false);
          return;
        }
      } catch (e) {
        console.error('Error checking user:', e);
      }

      setWalletAddress(address);
      localStorage.setItem('meme-game-wallet', address);
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      if (error.code === 4001) {
        setWalletError('Connection rejected by user');
      } else {
        setWalletError('Failed to connect wallet');
      }
    }

    setIsWalletConnecting(false);
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletError('');
    localStorage.removeItem('meme-game-wallet');

    // Disconnect from Phantom if connected
    try {
      const { solana } = window;
      if (solana?.isPhantom) {
        solana.disconnect();
      }
    } catch (e) {
      console.error('Error disconnecting:', e);
    }
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
          {/* Wallet Connect Button */}
          {!walletAddress ? (
            <button
              className="wallet-connect-btn"
              onClick={connectPhantom}
              disabled={isWalletConnecting}
            >
              <div className="wallet-logos">
                <img src="/phantom-logo.svg" alt="Phantom" className="wallet-logo" />
                <img src="/metamask-logo.svg" alt="MetaMask" className="wallet-logo wallet-logo-disabled" title="Coming soon" />
              </div>
              <span>{isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : (
            <div className="wallet-connected">
              <span className="wallet-address-display">
                🟢 {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
              <button className="wallet-disconnect-btn" onClick={disconnectWallet}>
                ✕
              </button>
            </div>
          )}
          {walletError && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', fontWeight: 'bold' }}>
              {walletError}
            </div>
          )}

          <div className="early-access-label">EARLY ACCESS - DEMO VERSION</div>

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
                      style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem', fontWeight: 400, opacity: 0.5 }}
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
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

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
