'use client';

import { useState, useEffect } from 'react';

export default function ProfileModal({ user, onClose, onUpdateUsername }) {
    const [newUsername, setNewUsername] = useState(user.username || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!newUsername.trim()) {
            setError('Username cannot be empty');
            return;
        }

        if (newUsername.trim() === user.username) {
            onClose();
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            await onUpdateUsername(newUsername.trim());
            onClose();
        } catch (err) {
            setError('Failed to update username');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>

                <h2 className="modal-title">YOUR PROFILE</h2>

                <div className="profile-section">
                    <label className="profile-label">USERNAME</label>
                    <div className="username-edit-container">
                        <input
                            type="text"
                            className="username-input-small"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter username"
                            maxLength={20}
                        />
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? '...' : 'SAVE'}
                        </button>
                    </div>
                    {error && <p className="error-text">{error}</p>}
                </div>

                <div className="stats-grid">
                    <div className="stat-box">
                        <span className="stat-label">TOP SCORE</span>
                        <span className="stat-value highlight-gold">{user.topScore || 0}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">LAST SCORE</span>
                        <span className="stat-value highlight-green">{user.lastScore !== undefined ? user.lastScore : '-'}</span>
                    </div>
                </div>

                <div className="wallet-info">
                    <span className="wallet-label">Connected Wallet:</span>
                    <span className="wallet-value">
                        {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-6)}` : 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
}
