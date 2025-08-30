// components/MicrosoftAccountConnection.tsx
import React, { useState, useEffect } from 'react';
import { useUserContext } from '../services/userContext';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { OAuthProvider } from 'firebase/auth';

interface ConnectionStatus {
  isConnected: boolean;
  userInfo?: {
    displayName: string;
    mail: string;
    userPrincipalName: string;
  };
  loading: boolean;
  error?: string;
}

export const MicrosoftAccountConnection: React.FC = () => {
  const { userProfile, linkMicrosoftToAccount, updateUserProfile, error, clearError } = useUserContext();
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    loading: true
  });
  const [isLinking, setIsLinking] = useState(false);
  const [useRedirect, setUseRedirect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
    checkForRedirectResult();
  }, [userProfile]);

  const checkConnectionStatus = () => {
    if (!userProfile) {
      setStatus({ isConnected: false, loading: false });
      return;
    }

    // Check if Microsoft auth data exists in the user profile
    const microsoftAuth = userProfile.microsoftAuth;
    
    if (microsoftAuth?.refreshToken || (microsoftAuth?.accessToken && microsoftAuth?.userInfo)) {
      setStatus({
        isConnected: true,
        userInfo: microsoftAuth.userInfo,
        loading: false
      });
    } else {
      setStatus({
        isConnected: false,
        loading: false
      });
    }
  };

  const checkForRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        console.log('[MicrosoftConnection] Redirect result received');
        // The userContext should handle the result
        setIsLinking(false);
        setLocalError(null);
      }
    } catch (error: any) {
      console.error('[MicrosoftConnection] Redirect error:', error);
      if (error.code !== 'auth/popup-blocked') {
        setLocalError(error.message);
      }
      setIsLinking(false);
    }
  };

  const handleConnect = async (event: React.MouseEvent) => {
    // Prevent any default behavior
    event.preventDefault();
    event.stopPropagation();
    
    setIsLinking(true);
    setLocalError(null);
    clearError();
    
    try {
      if (useRedirect) {
        // Use redirect method (more reliable but leaves the page)
        console.log('[MicrosoftConnection] Using redirect method');
        const provider = new OAuthProvider('microsoft.com');
        provider.setCustomParameters({
          tenant: 'common',
          prompt: 'consent'
        });
        provider.addScope('User.Read');
        provider.addScope('Calendars.ReadWrite');
        provider.addScope('OnlineMeetings.ReadWrite');
        provider.addScope('offline_access');
        
        await signInWithRedirect(auth, provider);
        // User will be redirected to Microsoft login
      } else {
        // Try popup method first
        console.log('[MicrosoftConnection] Using popup method');
        try {
          await linkMicrosoftToAccount();
          setLocalError(null);
        } catch (popupError: any) {
          console.error('[MicrosoftConnection] Popup error:', popupError);
          
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.message?.includes('popup-blocked')) {
            // Popup was blocked, show message to user
            setLocalError('Popup was blocked. Please allow popups for this site or use the redirect option below.');
            setUseRedirect(true);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error('[MicrosoftConnection] Error linking Microsoft account:', error);
      setLocalError(error.message || 'Failed to connect Microsoft account');
    } finally {
      if (!useRedirect) {
        setIsLinking(false);
      }
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Microsoft account? This will disable Teams meeting creation.')) {
      return;
    }

    try {
      setIsLinking(true);
      
      // Remove Microsoft auth data from user profile
      await updateUserProfile({
        microsoftAuth: null
      });
      
      setStatus({ isConnected: false, loading: false });
      setLocalError(null);
    } catch (error: any) {
      console.error('[MicrosoftConnection] Error disconnecting Microsoft account:', error);
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

  const displayError = localError || error;

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      {/* Show any errors */}
      {displayError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{displayError}</p>
          
          {displayError.includes('popup-blocked') && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-2">
                To fix this, you can either:
              </p>
              <ul className="text-xs text-gray-600 list-disc ml-4">
                <li>Allow popups for this site in your browser settings</li>
                <li>Click the blocked popup icon in your browser's address bar</li>
                <li>Use the "Connect with Redirect" option below</li>
              </ul>
            </div>
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
                <p className="text-green-600 font-medium">✓ Connected</p>
                {status.userInfo && (
                  <div>
                    <p className="font-medium">{status.userInfo.displayName}</p>
                    <p className="text-xs text-gray-500">{status.userInfo.mail || status.userInfo.userPrincipalName}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Teams meetings will be created automatically for new bookings
                </p>
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
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConnect}
                disabled={isLinking}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLinking ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{useRedirect ? 'Redirecting...' : 'Connecting...'}</span>
                  </div>
                ) : (
                  useRedirect ? 'Connect with Redirect' : 'Connect Microsoft Account'
                )}
              </button>
              
              {!useRedirect && displayError?.includes('popup-blocked') && (
                <button
                  onClick={(e) => {
                    setUseRedirect(true);
                    handleConnect(e);
                  }}
                  disabled={isLinking}
                  className="px-4 py-2 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Try with Redirect Instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional info for tutors */}
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