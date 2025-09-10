// components/MicrosoftAccountConnection.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useUserContext } from '../services/userContext';

interface ConnectionStatus {
  isConnected: boolean;
  hasRefreshToken: boolean;
  userInfo?: {
    displayName: string;
    mail: string;
    userPrincipalName: string;
  };
  loading: boolean;
  error?: string;
}

export const MicrosoftAccountConnection: React.FC = () => {
  const { userProfile, updateUserProfile } = useUserContext();
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    hasRefreshToken: false,
    loading: true
  });
  const [isLinking, setIsLinking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const authWindowRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkConnectionStatus();
    
    // Listen for messages from auth window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'microsoft-auth-success') {
        console.log('[MicrosoftConnection] Auth success message received');
        setTimeout(() => {
          checkConnectionStatus();
        }, 1000);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userProfile]);

  const checkConnectionStatus = async () => {
    if (!userProfile?.uid) {
      setStatus({ isConnected: false, hasRefreshToken: false, loading: false });
      return;
    }

    try {
      // Check status from backend
      const response = await fetch(`https://europe-west1-tuitionwebapp.cloudfunctions.net/api/auth/microsoft/status?tutorId=${userProfile.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus({
          isConnected: data.isConnected || data.connected,
          hasRefreshToken: data.hasRefreshToken,
          userInfo: data.userInfo,
          loading: false
        });
      } else {
        // Fallback to local data
        const microsoftAuth = userProfile.microsoftAuth;
        setStatus({
          isConnected: !!(microsoftAuth?.accessToken),
          hasRefreshToken: !!(microsoftAuth?.refreshToken),
          userInfo: microsoftAuth?.userInfo,
          loading: false
        });
      }
    } catch (error) {
      console.error('[MicrosoftConnection] Error checking status:', error);
      // Fallback to local data
      const microsoftAuth = userProfile.microsoftAuth;
      setStatus({
        isConnected: !!(microsoftAuth?.accessToken),
        hasRefreshToken: !!(microsoftAuth?.refreshToken),
        userInfo: microsoftAuth?.userInfo,
        loading: false
      });
    }
  };

  const handleConnect = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!userProfile?.uid) {
      setLocalError('You must be logged in to connect Microsoft account');
      return;
    }
    
    setIsLinking(true);
    setLocalError(null);
    
    try {
      // Get auth URL from backend
      const response = await fetch('https://europe-west1-tuitionwebapp.cloudfunctions.net/api/auth/microsoft/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId: userProfile.uid
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const { authUrl } = await response.json();
      console.log('[MicrosoftConnection] Got auth URL, opening popup...');

      // Open in popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      authWindowRef.current = window.open(
        authUrl,
        'Microsoft Authentication',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
      );

      if (!authWindowRef.current) {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      }

      // Check when window closes
      checkIntervalRef.current = setInterval(() => {
        if (authWindowRef.current?.closed) {
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          // Refresh status after window closes
          setTimeout(() => {
            checkConnectionStatus();
            setIsLinking(false);
          }, 1000);
        }
      }, 500);

    } catch (error: any) {
      console.error('[MicrosoftConnection] Error:', error);
      setLocalError(error.message || 'Failed to connect Microsoft account');
      setIsLinking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Microsoft account? This will disable Teams meeting creation.')) {
      return;
    }

    if (!userProfile?.uid) {
      setLocalError('You must be logged in');
      return;
    }

    try {
      setIsLinking(true);
      
      // Call backend to disconnect
      const response = await fetch('https://europe-west1-tuitionwebapp.cloudfunctions.net/api/auth/microsoft/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId: userProfile.uid
        }),
      });

      if (response.ok) {
        // Update local state
        await updateUserProfile({
          microsoftAuth: null
        });
        
        setStatus({ 
          isConnected: false, 
          hasRefreshToken: false,
          loading: false 
        });
        setLocalError(null);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error: any) {
      console.error('[MicrosoftConnection] Error disconnecting:', error);
      setLocalError('Failed to disconnect Microsoft account');
    } finally {
      setIsLinking(false);
    }
  };

  if (status.loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Checking Microsoft account status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      {/* Show any errors */}
      {localError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{localError}</p>
          {localError.includes('popup') && (
            <p className="text-xs text-gray-600 mt-2">
              Please allow popups for this site in your browser settings and try again.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8" viewBox="0 0 23 23" fill="none">
              <path d="M0 0h11v11H0z" fill="#f25022"/>
              <path d="M12 0h11v11H12z" fill="#7fba00"/>
              <path d="M0 12h11v11H0z" fill="#00a4ef"/>
              <path d="M12 12h11v11H12z" fill="#ffb900"/>
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">Microsoft Account</h3>
            {status.isConnected ? (
              <div className="text-sm text-gray-600">
                <p className="text-green-600 font-medium">
                  ✓ Connected {status.hasRefreshToken ? '(Full Access)' : '(Limited - Reconnect Needed)'}
                </p>
                {status.userInfo && (
                  <div>
                    <p className="font-medium">{status.userInfo.displayName}</p>
                    <p className="text-xs text-gray-500">{status.userInfo.mail || status.userInfo.userPrincipalName}</p>
                  </div>
                )}
                {status.hasRefreshToken ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Teams meetings will be created automatically for new bookings
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ No refresh token - please reconnect for persistent access
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                <p className="text-amber-600 font-medium">⚠ Not connected</p>
                <p className="text-xs text-gray-500 mt-1">
                  Connect to automatically create Teams meetings for your lessons
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {status.isConnected ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDisconnect}
                disabled={isLinking}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLinking ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    <span>Disconnecting...</span>
                  </div>
                ) : (
                  'Disconnect'
                )}
              </button>
              
              {!status.hasRefreshToken && (
                <button
                  onClick={handleConnect}
                  disabled={isLinking}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reconnect for Full Access
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLinking}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLinking ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect Microsoft Account'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Warning for connected but no refresh token */}
      {status.isConnected && !status.hasRefreshToken && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs">
              <p className="font-medium mb-1">Limited Connection</p>
              <p>Your Microsoft account is connected but without a refresh token. This means the connection will expire soon and Teams meeting creation will fail.</p>
              <p className="mt-2 font-medium">Please click "Reconnect for Full Access" above.</p>
            </div>
          </div>
        </div>
      )}

      {/* Info for tutors */}
      {userProfile?.userType === 'tutor' && !status.isConnected && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs">
              <p className="font-medium mb-1">Why connect Microsoft?</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Automatic Teams meeting creation for all lessons</li>
                <li>Built-in whiteboard for teaching</li>
                <li>Screen sharing and recording capabilities</li>
                <li>No need to manually create meeting links</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};