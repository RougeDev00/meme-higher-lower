import React from 'react';

const InfoModal = ({ onClose }) => {
    return (
        <>
            <div className="leaderboard-modal-backdrop" onClick={onClose} />
            <div className="leaderboard-modal info-modal-content">
                <button className="modal-close" onClick={onClose}>✕</button>

                <div className="info-modal-header">
                    <img src="/info-header-logo.png" alt="PUMP or DUMP?" className="info-modal-logo" />
                    <p className="info-modal-subtitle">Inspired by the classic Higher-Lower mechanic, adapted for the <strong>pump.fun</strong> ecosystem.</p>
                </div>

                <div className="info-section">
                    <h4 className="info-section-title">🎮 Gameplay & Leaderboard</h4>
                    <p className="info-section-text">
                        Enter a username to start playing immediately. However, to track your progress and climb the ranks, <strong>connecting your wallet is required</strong>. The connection is <strong>read-only</strong> – your data is completely safe and we only use your wallet address to verify your identity. Only verified wallets will be stored in the database with their scores. Your wallet address serves as your secure login, ensuring a verified leaderboard. Returning players can improve their stored scores simply by reconnecting the same wallet.
                    </p>
                </div>

                <div className="info-section">
                    <h4 className="info-section-title">💸 Hourly Rewards</h4>
                    <p className="info-section-text">
                        We believe in rewarding skill. Every hour, the <strong>top 3 players</strong> on the leaderboard receive <strong>2% of the creator fees</strong> generated on pump.fun. Winners are subsequently moved to the "Rewarded Users" section, keeping the competition fresh every round.
                    </p>
                </div>

                <div className="info-section">
                    <h4 className="info-section-title">📊 Powered by Dexscreener API</h4>
                    <p className="info-section-text">
                        We prioritize accuracy. All coin data and Market Caps are fetched directly from the <strong>Dexscreener API</strong> and updated hourly in real-time.
                    </p>
                </div>

                <div className="info-section">
                    <h4 className="info-section-title">🚀 Our Mission</h4>
                    <p className="info-section-text">
                        PUMP or DUMP? was born to last. In a chaotic market, we are building a project that is unique, engaging, and genuinely fun to use.
                    </p>
                </div>

                <div className="info-section">
                    <h4 className="info-section-title">🪙 Token Launch</h4>
                    <p className="info-section-text">
                        The official project token is launching soon on <strong>pump.fun</strong>.
                    </p>
                    <div className="info-warning-text">
                        Note: The Contract Address (CA) will only be communicated via our official channels. Please beware of imitations; we hold no responsibility for tokens launched outside our control.
                    </div>
                </div>

                <div className="info-footer">
                    <p className="info-good-game">Good game! 🍀</p>
                </div>
            </div>
        </>
    );
};

export default InfoModal;
