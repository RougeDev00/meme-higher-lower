'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminData, deleteAdminUser, deleteAllAdminUsers, getPlaySessionsStats, rewardAdminUser, unrewardAdminUser, getRewardedAdminUsers } from './actions';

export default function AdminPage() {
    // Authentication is now handled by Middleware.
    // If we are here, we are logged in.

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sessionStats, setSessionStats] = useState({ stats: { total: 0, withWallet: 0, withoutWallet: 0 }, sessions: [] });
    const [sessionFilter, setSessionFilter] = useState('total'); // 'total', 'withWallet', 'withoutWallet'
    const [rewardedUsers, setRewardedUsers] = useState([]);
    const router = useRouter();

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [adminData, sessionsData, rewardedData] = await Promise.all([
                getAdminData(),
                getPlaySessionsStats(),
                getRewardedAdminUsers()
            ]);

            // Check for auth errors in response
            if (adminData.error === 'Unauthorized' || sessionsData.error === 'Unauthorized') {
                router.push('/admin/login');
                return;
            }

            setData(adminData.data || []);
            setSessionStats(sessionsData);
            setRewardedUsers(rewardedData.rewarded || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
            // If server action throws due to auth, redirect
            if (error.message.includes('Unauthorized')) {
                router.push('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
    };

    const downloadCSV = () => {
        if (!data.length) return;

        const headers = ['Wallet Address', 'Username', 'Score', 'Created At'];
        const rows = data.map(item => [
            item.wallet_address,
            item.username,
            item.score,
            item.created_at
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meme-game-leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleDelete = async (walletAddress, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
            return;
        }

        try {
            const json = await deleteAdminUser(walletAddress);
            if (json.success) {
                alert('User deleted successfully');
                fetchData(); // Refresh list
            } else {
                alert('Failed to delete user: ' + (json.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting user: ' + error.message);
        }
    };

    const handleReward = async (walletAddress, username, score) => {
        const solAmount = prompt('How much SOL?');
        if (!solAmount || isNaN(parseFloat(solAmount))) {
            return;
        }

        try {
            const json = await rewardAdminUser(walletAddress, username, score, parseFloat(solAmount));
            if (json.success) {
                alert(`User "${username}" rewarded with ${solAmount} SOL!`);
                fetchData();
            } else {
                alert('Failed to reward user: ' + (json.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Reward error:', error);
            alert('Error rewarding user: ' + error.message);
        }
    };

    const handleUnreward = async (walletAddress, username) => {
        if (!confirm(`Return "${username}" to leaderboard?`)) {
            return;
        }

        try {
            const json = await unrewardAdminUser(walletAddress);
            if (json.success) {
                alert(`User "${username}" returned to leaderboard!`);
                fetchData();
            } else {
                alert('Failed to unreward user: ' + (json.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Unreward error:', error);
            alert('Error unrewarding user: ' + error.message);
        }
    };

    // Filter sessions based on selected filter
    const getFilteredSessions = () => {
        const sessions = sessionStats.sessions || [];
        switch (sessionFilter) {
            case 'withWallet':
                return sessions.filter(s => s.has_wallet);
            case 'withoutWallet':
                return sessions.filter(s => !s.has_wallet);
            default:
                return sessions;
        }
    };

    const filteredSessions = getFilteredSessions();

    return (
        <div style={{
            height: '100vh',
            overflowY: 'auto',
            backgroundColor: '#1a1a2e',
            color: 'white',
            padding: '40px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Admin Dashboard 🛡️</h1>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={async () => {
                            if (confirm('⚠️ DANGER: Are you sure you want to DELETE ALL USERS?')) {
                                if (confirm('This action CANNOT be undone. Confirm delete all?')) {
                                    try {
                                        const json = await deleteAllAdminUsers();
                                        if (json.success) {
                                            alert('All users deleted successfully.');
                                            fetchData();
                                        } else {
                                            alert('Failed to delete all users.');
                                        }
                                    } catch (err) {
                                        console.error('Delete all error:', err);
                                        alert('Error executing delete all.');
                                    }
                                }
                            }
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: '1px solid #ff4444',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️ Delete All
                    </button>
                    <button
                        onClick={fetchData}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: '1px solid #333',
                            backgroundColor: '#16213e',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Refresh
                    </button>
                    <button
                        onClick={downloadCSV}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: '#00ff88',
                            color: 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: '1px solid #333',
                            backgroundColor: 'transparent',
                            color: '#ccc',
                            cursor: 'pointer'
                        }}
                    >
                        Logout
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: '1px solid #333',
                            backgroundColor: 'transparent',
                            color: '#888',
                            cursor: 'pointer'
                        }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>

            {/* Play Sessions Section */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ marginBottom: '15px', fontSize: '1.2rem', color: '#888' }}>📊 Play Sessions</h2>

                {/* Filter Buttons */}
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <button
                        onClick={() => setSessionFilter('total')}
                        style={{
                            padding: '20px 30px',
                            background: sessionFilter === 'total'
                                ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.3) 0%, rgba(0, 200, 100, 0.15) 100%)'
                                : 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 200, 100, 0.05) 100%)',
                            border: sessionFilter === 'total'
                                ? '2px solid rgba(0, 255, 136, 0.8)'
                                : '1px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>{sessionStats.stats?.total || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '5px' }}>Total Sessions</div>
                    </button>
                    <button
                        onClick={() => setSessionFilter('withWallet')}
                        style={{
                            padding: '20px 30px',
                            background: sessionFilter === 'withWallet'
                                ? 'linear-gradient(135deg, rgba(171, 159, 242, 0.3) 0%, rgba(130, 100, 220, 0.15) 100%)'
                                : 'linear-gradient(135deg, rgba(171, 159, 242, 0.1) 0%, rgba(130, 100, 220, 0.05) 100%)',
                            border: sessionFilter === 'withWallet'
                                ? '2px solid rgba(171, 159, 242, 0.8)'
                                : '1px solid rgba(171, 159, 242, 0.3)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ab9ff2' }}>{sessionStats.stats?.withWallet || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '5px' }}>With Wallet</div>
                    </button>
                    <button
                        onClick={() => setSessionFilter('withoutWallet')}
                        style={{
                            padding: '20px 30px',
                            background: sessionFilter === 'withoutWallet'
                                ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.3) 0%, rgba(200, 130, 0, 0.15) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 170, 0, 0.1) 0%, rgba(200, 130, 0, 0.05) 100%)',
                            border: sessionFilter === 'withoutWallet'
                                ? '2px solid rgba(255, 170, 0, 0.8)'
                                : '1px solid rgba(255, 170, 0, 0.3)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffaa00' }}>{sessionStats.stats?.withoutWallet || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '5px' }}>Without Wallet</div>
                    </button>
                </div>

                {/* Sessions Table */}
                {loading ? (
                    <p>Loading data...</p>
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a2e' }}>
                                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                    <th style={{ padding: '15px' }}>Username</th>
                                    <th style={{ padding: '15px' }}>Wallet</th>
                                    <th style={{ padding: '15px' }}>Score</th>
                                    <th style={{ padding: '15px' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSessions.map((session, index) => (
                                    <tr key={session.id || index} style={{ borderBottom: '1px solid #233', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{session.username}</td>
                                        <td style={{ padding: '15px', fontFamily: 'monospace', color: session.wallet_address ? '#aaa' : '#555' }}>
                                            {session.wallet_address || '—'}
                                        </td>
                                        <td style={{ padding: '15px', color: session.score ? '#00ff88' : '#555' }}>
                                            {session.score !== null ? session.score : '—'}
                                        </td>
                                        <td style={{ padding: '15px', color: '#666' }}>
                                            {session.created_at ? new Date(session.created_at).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredSessions.length === 0 && (
                            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No sessions found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Leaderboard Section */}
            <h2 style={{ marginBottom: '15px', fontSize: '1.2rem', color: '#888' }}>🏆 Leaderboard</h2>

            {loading ? (
                <p>Loading data...</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                <th style={{ padding: '15px' }}>Rank</th>
                                <th style={{ padding: '15px' }}>Username</th>
                                <th style={{ padding: '15px' }}>Score</th>
                                <th style={{ padding: '15px' }}>Wallet / ID</th>
                                <th style={{ padding: '15px' }}>Date</th>
                                <th style={{ padding: '15px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.id || index} style={{ borderBottom: '1px solid #233', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '15px' }}>#{index + 1}</td>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.username}</td>
                                    <td style={{ padding: '15px', color: '#00ff88' }}>{item.score}</td>
                                    <td style={{ padding: '15px', fontFamily: 'monospace', color: '#aaa' }}>{item.wallet_address}</td>
                                    <td style={{ padding: '15px', color: '#666' }}>
                                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '15px', display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleReward(item.wallet_address, item.username, item.score)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '3px',
                                                border: '1px solid #00ff88',
                                                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                                                color: '#00ff88',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            💸 Reward
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.wallet_address, item.username)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '3px',
                                                border: '1px solid #ff4444',
                                                backgroundColor: 'transparent',
                                                color: '#ff4444',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No records found.</p>
                    )}
                </div>
            )}

            {/* Rewarded Users Section */}
            <div style={{ marginTop: '40px' }}>
                <h2 style={{ marginBottom: '15px', fontSize: '1.2rem', color: '#00ff88' }}>💰 Rewarded Users</h2>

                {loading ? (
                    <p>Loading data...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                    <th style={{ padding: '15px' }}>Username</th>
                                    <th style={{ padding: '15px' }}>Wallet</th>
                                    <th style={{ padding: '15px' }}>Original Score</th>
                                    <th style={{ padding: '15px' }}>SOL Rewarded</th>
                                    <th style={{ padding: '15px' }}>Date</th>
                                    <th style={{ padding: '15px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewardedUsers.map((item, index) => (
                                    <tr key={item.id || index} style={{ borderBottom: '1px solid #233', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0,255,136,0.02)' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.username}</td>
                                        <td style={{ padding: '15px', fontFamily: 'monospace', color: '#aaa' }}>{item.wallet_address}</td>
                                        <td style={{ padding: '15px', color: '#888' }}>{item.original_score}</td>
                                        <td style={{ padding: '15px', color: '#00ff88', fontWeight: 'bold' }}>{item.sol_amount} SOL</td>
                                        <td style={{ padding: '15px', color: '#666' }}>
                                            {item.rewarded_at ? new Date(item.rewarded_at).toLocaleString() : 'N/A'}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <button
                                                onClick={() => handleUnreward(item.wallet_address, item.username)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '3px',
                                                    border: '1px solid #ffaa00',
                                                    backgroundColor: 'rgba(255, 170, 0, 0.1)',
                                                    color: '#ffaa00',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                ↩️ Return
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rewardedUsers.length === 0 && (
                            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No rewarded users yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '60px', borderTop: '1px solid #333', paddingTop: '40px' }}>
                <h2 style={{ color: '#ff4444', marginBottom: '20px' }}>⚠️ Danger Zone</h2>
                <div style={{ padding: '20px', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '8px', backgroundColor: 'rgba(255, 68, 68, 0.05)' }}>
                    <p style={{ marginBottom: '15px', color: '#ff8888' }}>
                        This action will permanently delete ALL user data and scores from the database. This cannot be undone.
                    </p>
                    <button
                        onClick={async () => {
                            if (confirm('⚠️ DANGER: Are you sure you want to DELETE ALL USERS?')) {
                                if (confirm('This action CANNOT be undone. Confirm delete all?')) {
                                    try {
                                        const json = await deleteAllAdminUsers();
                                        if (json.success) {
                                            alert('All users deleted successfully.');
                                            fetchData();
                                        } else {
                                            alert('Failed to delete all users.');
                                        }
                                    } catch (err) {
                                        console.error('Delete all error:', err);
                                        alert('Error executing delete all.');
                                    }
                                }
                            }
                        }}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
                        }}
                    >
                        🗑️ DELETE ALL DATA
                    </button>
                </div>
            </div>

            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                pointerEvents: 'none'
            }}>
                admin v 1.0.1 (secured)
            </div>
        </div>
    );
}

