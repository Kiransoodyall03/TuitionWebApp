// LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../services/apiFunctions/useAuth';
import { useUserContext } from '../../services/userContext';
import styles from './Login.module.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const userContext = useUserContext();
  const { login, userType, error } = userContext;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await login(username, password);
      // No need to call onLogin - routing will handle navigation automatically
      // when userType changes in context
    } catch (err) {
      // Error is already handled by useAuth hook
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className={styles.login}>
        <div>
          <h2 className={styles.heading}>
            Sign In
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                placeholder="Username"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Password"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className={styles.button}
              style={{ width: '100%' }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;