// LoginPage.tsx - Complete Visual Overhaul with Enhanced Functionality
'use client';

import React, { useState, useEffect } from 'react';
import { useUserContext } from '../../services/userContext';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import styles from './Login.module.css';

interface NotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className={styles.notificationIcon} />,
    error: <AlertCircle className={styles.notificationIcon} />,
    info: <AlertCircle className={styles.notificationIcon} />,
    warning: <AlertCircle className={styles.notificationIcon} />
  };

  return (
    <div className={`${styles.notification} ${styles[`notification${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      {icons[type]}
      <span className={styles.notificationMessage}>{message}</span>
      <button onClick={onClose} className={styles.notificationClose}>
        <X size={16} />
      </button>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);
  const [linkAccountEmail, setLinkAccountEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { 
    login, 
    loginWithMicrosoft,
    user,
    userProfile,
    userType,
    error,
    clearError,
    isLoading: contextLoading,
    linkAccountWithPassword
  } = useUserContext();

  // Redirect after successful login
  useEffect(() => {
    if (user && userProfile && userType) {
      setNotification({ type: 'success', message: 'Login successful! Redirecting...' });
      const redirectPath = userType === 'tutor' ? '/#/home' : '/#/home';
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 1500);
    }
  }, [user, userProfile, userType, router]);

  // Handle context errors
  useEffect(() => {
    if (error) {
      // Parse specific error types
      if (error.includes('user-not-found')) {
        setNotification({ type: 'error', message: 'No account found with this email address.' });
      } else if (error.includes('wrong-password') || error.includes('invalid-credential')) {
        setNotification({ type: 'error', message: 'Incorrect password. Please try again.' });
      } else if (error.includes('too-many-requests')) {
        setNotification({ type: 'error', message: 'Too many failed attempts. Please try again later.' });
      } else if (error.includes('network-request-failed')) {
        setNotification({ type: 'error', message: 'Network error. Please check your connection.' });
      } else if (error.includes('Microsoft account not connected')) {
        setNotification({ type: 'warning', message: error });
      } else if (error.includes('account-exists-with-different-credential')) {
        // This is handled by the modal
      } else {
        setNotification({ type: 'error', message: error });
      }
      clearError();
    }
  }, [error, clearError]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLocalLoading(true);
    try {
      await login(email, password);
      // Success notification handled in useEffect
    } catch (err: any) {
      console.error('Login failed:', err);
      // Error notification handled in useEffect
    } finally {
      setLocalLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLocalLoading(true);
    setNotification({ type: 'info', message: 'Connecting to Microsoft...' });
    
    try {
      await loginWithMicrosoft();
      // Success handled in useEffect
    } catch (err: any) {
      console.error('Microsoft login failed:', err);
      
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        if (email) {
          setLinkAccountEmail(email);
          setShowLinkAccountModal(true);
          setNotification(null);
        }
      } else if (err.code === 'auth/popup-blocked') {
        setNotification({ type: 'error', message: 'Popup blocked. Please allow popups for this site.' });
      } else {
        setNotification({ type: 'error', message: 'Microsoft sign-in failed. Please try again.' });
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!linkPassword) {
      setNotification({ type: 'warning', message: 'Please enter your password' });
      return;
    }

    setLocalLoading(true);
    try {
      if (linkAccountWithPassword) {
        const result = await linkAccountWithPassword(linkAccountEmail, linkPassword);
        
        if (result.success) {
          setShowLinkAccountModal(false);
          setNotification({ type: 'success', message: 'Accounts linked! Please sign in with Microsoft again.' });
          setLinkPassword('');
        } else {
          setNotification({ type: 'error', message: result.message || 'Failed to link accounts' });
        }
      } else {
        await login(linkAccountEmail, linkPassword);
        setShowLinkAccountModal(false);
        setNotification({ type: 'info', message: 'Please try Microsoft login again to complete linking' });
      }
    } catch (err) {
      console.error('Failed to link account:', err);
      setNotification({ type: 'error', message: 'Failed to link accounts. Please check your password.' });
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = contextLoading || localLoading;

  return (
    <div className={styles.pageContainer}>
      {/* Animated Background */}
      <div className={styles.backgroundAnimation}>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>

      {/* Notification System */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Account Linking Modal */}
      {showLinkAccountModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button 
              onClick={() => setShowLinkAccountModal(false)}
              className={styles.modalClose}
            >
              <X size={20} />
            </button>
            
            <div className={styles.modalHeader}>
              <AlertCircle className={styles.modalIcon} />
              <h3 className={styles.modalTitle}>Link Your Accounts</h3>
            </div>
            
            <p className={styles.modalDescription}>
              An account with <strong>{linkAccountEmail}</strong> already exists. 
              Enter your password to link your Microsoft account.
            </p>
            
            <div className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <Lock className={styles.inputIcon} />
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={styles.modalInput}
                  disabled={isLoading}
                />
              </div>
              
              <div className={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowLinkAccountModal(false);
                    setLinkPassword('');
                  }}
                  className={styles.modalButtonSecondary}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkAccount}
                  className={styles.modalButtonPrimary}
                  disabled={isLoading || !linkPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className={styles.buttonLoader} />
                      Linking...
                    </>
                  ) : (
                    'Link Accounts'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Card */}
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <span className={styles.logoText}>R</span>
            </div>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to continue to your account</p>
        </div>

        <div className={styles.loginBody}>
          {/* Microsoft Sign In */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className={styles.microsoftButton}
          >
            {isLoading ? (
              <Loader2 className={styles.buttonLoader} />
            ) : (
              <svg className={styles.microsoftIcon} viewBox="0 0 23 23" fill="none">
                <path d="M0 0h11v11H0z" fill="#f25022"/>
                <path d="M12 0h11v11H12z" fill="#7fba00"/>
                <path d="M0 12h11v11H0z" fill="#00a4ef"/>
                <path d="M12 12h11v11H12z" fill="#ffb900"/>
              </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Continue with Microsoft'}</span>
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={`${styles.inputWrapper} ${emailError ? styles.inputError : ''}`}>
                <Mail className={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  className={styles.input}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  onBlur={() => validateEmail(email)}
                />
              </div>
              {emailError && <span className={styles.fieldError}>{emailError}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <div className={`${styles.inputWrapper} ${passwordError ? styles.inputError : ''}`}>
                <Lock className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  className={styles.input}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  onBlur={() => validatePassword(password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && <span className={styles.fieldError}>{passwordError}</span>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? (
                <>
                  <Loader2 className={styles.buttonLoader} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className={styles.signupPrompt}>
            Don't have an account?{' '}
            <a href="/register" className={styles.signupLink}>
              Sign up for free
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;