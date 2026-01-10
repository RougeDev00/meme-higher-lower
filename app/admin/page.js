'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simple client-side check. In production, use real auth.
        if (password === 'admin123') {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert('Invalid password');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/data');
            const json = await res.json();
            setData(json.data || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
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
            const res = await fetch('/api/admin/data', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            const json = await res.json();
            if (json.success) {
                alert('User deleted successfully');
                fetchData(); // Refresh list
            } else {
                alert('Failed to delete user: ' + (json.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting user');
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: '#1a1a2e',
                color: 'white',
                fontFamily: 'Inter, sans-serif'
            }}>
                <h1 style={{ marginBottom: '20px' }}>Admin Login</h1>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password"
                        style={{
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #333',
                            backgroundColor: '#16213e',
                            color: 'white'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '10px',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: '#00ff88',
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Login
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh', /* Changed from minHeight to height */
            overflowY: 'auto', /* Enable scrolling */
            backgroundColor: '#1a1a2e',
            color: 'white',
            padding: '40px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Admin Dashboard (UPDATED) 🛡️</h1>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={async () => {
                            if (confirm('⚠️ DANGER: Are you sure you want to DELETE ALL USERS?')) {
                                if (confirm('This action CANNOT be undone. Confirm delete all?')) {
                                    try {
                                        const res = await fetch('/api/admin/data', {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ deleteAll: true })
                                        });
                                        const json = await res.json();
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
                                    <td style={{ padding: '15px' }}>
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
                                        const res = await fetch('/api/admin/data', {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ deleteAll: true })
                                        });
                                        const json = await res.json();
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
        </div>
    );
}
