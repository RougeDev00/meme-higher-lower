
import React from 'react';

const InfoModal = ({ onClose }) => {
    return (
        <>
            <div className="leaderboard-modal-backdrop" onClick={onClose} />
            <div className="leaderboard-modal" style={{ maxWidth: '600px', width: '90%', textAlign: 'left', lineHeight: '1.4', fontSize: '0.82rem', padding: '1.5rem' }}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <h3 style={{ marginBottom: '0.8rem', textAlign: 'center', fontSize: '1.3rem', marginTop: '0' }}>Welcome to PUMP or DUMP? 🚀</h3>
                <div>
                    <p style={{ marginBottom: '0.8rem' }}>Inspired by the classic Higher-Lower mechanic, adapted for the <strong>pump.fun</strong> ecosystem.</p>

                    <h4 style={{ color: '#fff', marginBottom: '0.2rem', fontSize: '0.9rem' }}>🎮 Gameplay & Leaderboard</h4>
                    <p style={{ marginBottom: '0.8rem', color: '#ccc' }}>Enter a username to start playing immediately. However, to track your progress and climb the ranks, <strong>connecting your wallet is required</strong>. The connection is <strong>read-only</strong> – your data is completely safe and we only use your wallet address to verify your identity. Only verified wallets will be stored in the database with their scores. Your wallet address serves as your secure login, ensuring a verified leaderboard. Returning players can improve their stored scores simply by reconnecting the same wallet.</p>

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
    );
};

export default InfoModal;
