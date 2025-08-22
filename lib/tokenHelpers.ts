// lib/tokenHelpers.ts
import { getFirestore } from './firebaseAdmin';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function refreshTokenAndGetAccessToken(tutorId: string): Promise<string> {
  const db = getFirestore();
  
  try {
    // Get tutor's Microsoft auth data
    const tutorDoc = await db.collection('tutors').doc(tutorId).get();
    
    if (!tutorDoc.exists) {
      throw new Error('Tutor not found');
    }
    
    const tutorData = tutorDoc.data();
    const microsoftAuth = tutorData?.microsoftAuth;
    
    if (!microsoftAuth || !microsoftAuth.refreshToken) {
      throw new Error('Tutor has no refresh token - Microsoft account not connected');
    }
    
    // Check if current access token is still valid (with 5-minute buffer)
    const expiresAt = new Date(microsoftAuth.expiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (expiresAt.getTime() > now.getTime() + bufferTime) {
      // Token is still valid
      console.log('Using existing valid access token');
      return microsoftAuth.accessToken;
    }
    
    // Token expired or expiring soon, refresh it
    console.log('Refreshing Microsoft access token...');
    
    const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        refresh_token: microsoftAuth.refreshToken,
        grant_type: 'refresh_token',
        scope: 'User.Read OnlineMeetings.ReadWrite Calendars.ReadWrite'
      }),
    });
    
    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Token refresh failed:', errorText);
      throw new Error('Failed to refresh token - user needs to reconnect Microsoft account');
    }
    
    const tokens: TokenResponse = await refreshResponse.json();
    
    // Update stored tokens
    await db.collection('tutors').doc(tutorId).update({
      'microsoftAuth.accessToken': tokens.access_token,
      'microsoftAuth.refreshToken': tokens.refresh_token,
      'microsoftAuth.expiresAt': new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      'microsoftAuth.lastRefreshed': new Date().toISOString(),
    });
    
    console.log('Microsoft access token refreshed successfully');
    return tokens.access_token;
    
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error);
    throw error;
  }
}

export async function isMicrosoftAccountConnected(tutorId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const tutorDoc = await db.collection('tutors').doc(tutorId).get();
    
    if (!tutorDoc.exists) {
      return false;
    }
    
    const tutorData = tutorDoc.data();
    return !!(tutorData?.microsoftAuth?.refreshToken);
    
  } catch (error) {
    console.error('Error checking Microsoft account connection:', error);
    return false;
  }
}

export async function disconnectMicrosoftAccount(tutorId: string): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('tutors').doc(tutorId).update({
      microsoftAuth: null
    });
    console.log(`Microsoft account disconnected for tutor ${tutorId}`);
  } catch (error) {
    console.error('Error disconnecting Microsoft account:', error);
    throw error;
  }
}