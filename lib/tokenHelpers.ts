// lib/tokenHelpers.ts
import { getFirestore } from './firebaseAdmin';

interface MicrosoftAuthData {
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: string;
  connectedAt?: string;
  lastRefreshed?: string;
  authMethod?: string;
}

interface TutorData {
  microsoftAuth?: MicrosoftAuthData;
  email?: string;
  displayName?: string;
}

/**
 * Gets the Microsoft access token for a tutor
 * Handles both refresh token flow and access-token-only scenarios
 */
export async function refreshTokenAndGetAccessToken(tutorId: string): Promise<string> {
  console.log(`[TokenHelper] Getting access token for tutor: ${tutorId}`);
  
  try {
    // Get the tutor's data from Firestore
    const db = getFirestore();
    const tutorDoc = await db.collection('users').doc(tutorId).get();
    
    if (!tutorDoc.exists) {
      console.error(`[TokenHelper] Tutor not found: ${tutorId}`);
      throw new Error(`Tutor not found: ${tutorId}`);
    }
    
    const tutorData = tutorDoc.data() as TutorData;
    console.log(`[TokenHelper] Tutor data retrieved for: ${tutorData.email}`);
    
    // Check if Microsoft auth exists
    if (!tutorData.microsoftAuth) {
      console.error(`[TokenHelper] No Microsoft auth data for tutor: ${tutorId}`);
      throw new Error(`Tutor ${tutorId} has not connected their Microsoft account`);
    }
    
    const { accessToken, refreshToken, expiresAt, authMethod } = tutorData.microsoftAuth;
    
    // Check if we have an access token
    if (!accessToken) {
      console.error(`[TokenHelper] No access token for tutor: ${tutorId}`);
      throw new Error(`Tutor ${tutorId} has no access token stored. Please reconnect Microsoft account.`);
    }
    
    // Check if the access token is still valid
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      
      if (expirationDate.getTime() - now.getTime() > bufferTime) {
        console.log(`[TokenHelper] Using existing valid access token`);
        return accessToken;
      }
    }
    
    console.log(`[TokenHelper] Access token expired or expiring soon`);
    
    // If we have a refresh token, use it
    if (refreshToken) {
      console.log(`[TokenHelper] Attempting to refresh with refresh token`);
      try {
        const newAccessToken = await refreshMicrosoftToken(refreshToken, tutorId);
        return newAccessToken;
      } catch (refreshError: any) {
        console.error(`[TokenHelper] Refresh token failed:`, refreshError);
        // Fall through to re-authentication message
      }
    }
    
    // If we don't have a refresh token or refresh failed
    // This happens with Firebase OAuth flow
    console.log(`[TokenHelper] No refresh token available or refresh failed`);
    
    // Check if token was recently refreshed (within last hour)
    // This prevents constant re-auth requests
    const lastRefreshed = tutorData.microsoftAuth.lastRefreshed;
    if (lastRefreshed) {
      const lastRefreshDate = new Date(lastRefreshed);
      const hourAgo = new Date(Date.now() - 3600000);
      
      if (lastRefreshDate > hourAgo && accessToken) {
        console.log(`[TokenHelper] Token was recently refreshed, using existing token`);
        return accessToken;
      }
    }
    
    // If token is expired and we can't refresh it
    throw new Error(
      `Microsoft authentication expired for tutor ${tutorId}. ` +
      `Please ask the tutor to reconnect their Microsoft account in their profile settings.`
    );
    
  } catch (error: any) {
    console.error(`[TokenHelper] Error getting access token:`, error);
    throw error;
  }
}

/**
 * Refreshes the Microsoft access token using the refresh token
 */
async function refreshMicrosoftToken(refreshToken: string, tutorId: string): Promise<string> {
  try {
    // Microsoft OAuth 2.0 token endpoint
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    // Prepare the request body
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite offline_access'
    });
    
    console.log(`[TokenHelper] Requesting new access token from Microsoft...`);
    
    // Make the request to refresh the token
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TokenHelper] Token refresh failed:`, errorText);
      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
    }
    
    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token in refresh response');
    }
    
    console.log(`[TokenHelper] Successfully refreshed access token`);
    
    // Calculate expiration time (typically 1 hour for Microsoft tokens)
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    // Update the stored tokens in Firestore
    const db = getFirestore();
    const updateData: any = {
      'microsoftAuth.accessToken': tokenData.access_token,
      'microsoftAuth.expiresAt': expiresAt,
      'microsoftAuth.lastRefreshed': new Date().toISOString(),
    };
    
    // Update refresh token if a new one was provided
    if (tokenData.refresh_token) {
      updateData['microsoftAuth.refreshToken'] = tokenData.refresh_token;
    }
    
    await db.collection('users').doc(tutorId).update(updateData);
    
    console.log(`[TokenHelper] Tokens updated in Firestore`);
    
    return tokenData.access_token;
  } catch (error: any) {
    console.error(`[TokenHelper] Error refreshing Microsoft token:`, error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Helper function to check if Microsoft auth is valid
 */
export async function checkMicrosoftAuthStatus(tutorId: string): Promise<{
  isConnected: boolean;
  hasValidToken: boolean;
  needsReconnect: boolean;
}> {
  try {
    const db = getFirestore();
    const tutorDoc = await db.collection('users').doc(tutorId).get();
    
    if (!tutorDoc.exists) {
      return { isConnected: false, hasValidToken: false, needsReconnect: true };
    }
    
    const tutorData = tutorDoc.data() as TutorData;
    
    if (!tutorData.microsoftAuth || !tutorData.microsoftAuth.accessToken) {
      return { isConnected: false, hasValidToken: false, needsReconnect: true };
    }
    
    const { expiresAt } = tutorData.microsoftAuth;
    
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      const now = new Date();
      const hasValidToken = expirationDate > now;
      
      return {
        isConnected: true,
        hasValidToken,
        needsReconnect: !hasValidToken && !tutorData.microsoftAuth.refreshToken
      };
    }
    
    return {
      isConnected: true,
      hasValidToken: false,
      needsReconnect: !tutorData.microsoftAuth.refreshToken
    };
  } catch (error) {
    console.error(`[TokenHelper] Error checking auth status:`, error);
    return { isConnected: false, hasValidToken: false, needsReconnect: true };
  }
}