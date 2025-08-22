// Updated LoginPage.tsx with better Microsoft auth error handling
'use client';

import React, { useState } from 'react';
import { useUserContext } from '../../services/userContext';
import styles from './Login.module.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);
  const [linkAccountEmail, setLinkAccountEmail] = useState('');

  // Use isLoading from context (reflects actual firebase activity)
  const { 
    login, 
    loginWithMicrosoft, 
    user,
    userType, 
    error,
    clearError,
    isLoading: contextLoading,
    linkAccountWithPassword
  } = useUserContext();

  // Debug helper to tell if login is the default noop (very useful while wiring)
  const isNoopLogin = typeof login !== 'function' || login.name === 'noopAsync' || login.toString().includes('noop');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      console.warn('Email or password empty');
      return;
    }

    console.log('handleEmailLogin called — login fn:', login);
    if (isNoopLogin) {
      console.error('Login function looks like a noop. That usually means the UserProvider is NOT mounted or the app is not wrapped by the provider.');
      return;
    }

    try {
      // call context login
      await login(email, password);
      console.log('login() resolved — checking context user (may update on next render):', user);
      // optionally navigate to dashboard here if appropriate, e.g. router.push('/student-home')
    } catch (err) {
      console.error('Login failed (thrown):', err);
    }
  };

  const handleMicrosoftLogin = async () => {
    console.log('handleMicrosoftLogin called — loginWithMicrosoft fn:', loginWithMicrosoft);
    if (typeof loginWithMicrosoft !== 'function') {
      console.error('loginWithMicrosoft is not available from context');
      return;
    }
    
    try {
      await loginWithMicrosoft();
    } catch (err: any) {
      console.error('Microsoft login failed:', err);
      
      // Handle the specific account exists error
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        if (email) {
          setLinkAccountEmail(email);
          setShowLinkAccountModal(true);
        } else {
          // Generic message if we can't get the email
          console.log('Account exists error handled by context');
        }
      }
    }
  };

  const handleLinkAccount = async () => {
    if (!linkAccountEmail || !password) {
      alert('Please enter your password to link accounts');
      return;
    }

    if (linkAccountWithPassword) {
      try {
        const result = await linkAccountWithPassword(linkAccountEmail, password);
        setShowLinkAccountModal(false);
        
        if (result.success) {
          alert('Account linking prepared. Please try Microsoft sign-in again.');
        } else {
          alert('Failed to link accounts. Please check your password and try again.');
        }
        
      } catch (err) {
        console.error('Failed to link account:', err);
        alert('Failed to link accounts. Please check your password and try again.');
      }
    } else {
      // Fallback to regular login
      try {
        await login(linkAccountEmail, password);
        setShowLinkAccountModal(false);
        alert('Please try Microsoft login again to complete account linking');
      } catch (err) {
        console.error('Failed to link account:', err);
        alert('Failed to link accounts. Please check your password and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className={styles.login}>
        <div>
          <h2 className={styles.heading}>Sign In</h2>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={clearError} className="ml-2 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Developer notice when provider not mounted */}
        {isNoopLogin && (
          <div style={{ color: 'orange', padding: 8, borderRadius: 6 }}>
            Provider not detected — the login() exported by the context looks like a noop. Ensure the app is wrapped by the UserProvider.
          </div>
        )}

        {/* Account Linking Modal */}
        {showLinkAccountModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Link Your Accounts</h3>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                An account with email <strong>{linkAccountEmail}</strong> already exists. 
                Enter your password to link your Microsoft account.
              </p>
              
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  marginBottom: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowLinkAccountModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkAccount}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#0078d4',
                    color: 'white'
                  }}
                >
                  Link Accounts
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={contextLoading}
            className={`${styles.button} ${styles.microsoftButton}`}
            style={{ width: '100%', backgroundColor: '#0078d4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 23 23" fill="currentColor">
              <path d="M0 0h11v11H0z" fill="#f25022"/>
              <path d="M12 0h11v11H12z" fill="#00a4ef"/>
              <path d="M0 12h11v11H0z" fill="#ffb900"/>
              <path d="M12 12h11v11H12z" fill="#7fba00"/>
            </svg>
            {contextLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500" style={{ backgroundColor: 'var(--bg-primary)' }}>Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Email address"
              required
              disabled={contextLoading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Password"
              required
              disabled={contextLoading}
            />
            <button
              type="submit"
              disabled={contextLoading || !email.trim() || !password.trim() || isNoopLogin}
              className={styles.button}
              style={{ width: '100%' }}
            >
              {contextLoading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-800">Sign up here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;