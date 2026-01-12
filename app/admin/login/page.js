'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                router.push('/admin');
                router.refresh(); // Refresh middleware state
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

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
            <h1 style={{ marginBottom: '20px' }}>Admin Protected Login 🔒</h1>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Secure Password"
                    style={{
                        padding: '12px',
                        borderRadius: '5px',
                        border: '1px solid #333',
                        backgroundColor: '#16213e',
                        color: 'white'
                    }}
                />
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '12px',
                        borderRadius: '5px',
                        border: 'none',
                        backgroundColor: '#00ff88',
                        color: 'black',
                        cursor: loading ? 'wait' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? 'Verifying...' : 'Login'}
                </button>
            </form>
            {error && <p style={{ color: '#ff4444', marginTop: '15px' }}>{error}</p>}
        </div>
    );
}
