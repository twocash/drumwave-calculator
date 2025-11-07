import { useState, useEffect } from 'react';

export default function PasswordGate({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('drumwave_unlocked') === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ACCESS_PASSWORD || 'drumwave2024';
    
    if (password === correctPassword) {
      sessionStorage.setItem('drumwave_unlocked', 'true');
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (isUnlocked) {
    return children;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1a1a1a'
        }}>
          DrumWave Calculator
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          Enter password to access
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />
          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#0066cc',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Access Calculator
          </button>
        </form>
        {error && (
          <p style={{
            color: '#d93025',
            marginTop: '12px',
            fontSize: '14px'
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}