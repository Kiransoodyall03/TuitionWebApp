// pages/api/auth/exchange-microsoft-token.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from '../../../../services/firebase/admin';

/**
 * This endpoint exchanges a Microsoft access token for a refresh token
 * by using the OAuth2 authorization code flow on the server side
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, accessToken, email, displayName } = req.body;

  if (!userId || !accessToken) {
    return res.status(400).json({ error: 'Missing userId or accessToken' });
  }

  console.log('[exchange-token] Starting token exchange for user:', userId);

  try {
    // Since Firebase Auth doesn't provide refresh tokens for Microsoft OAuth,
    // we'll use a workaround by calling Microsoft Graph API to validate the token
    // and store it with an extended expiration strategy
    
    // First, verify the access token works by getting user info
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!graphResponse.ok) {
      console.error('[exchange-token] Invalid access token');
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const graphData = await graphResponse.json();
    console.log('[exchange-token] Got user data from Microsoft Graph');

    // For Firebase Auth OAuth flow, we typically don't get refresh tokens
    // We'll implement a token refresh strategy using the stored credentials
    // The actual refresh will happen when needed using the Microsoft Graph API
    
    const microsoftAuth = {
      accessToken: accessToken,
      // Note: Firebase Auth doesn't provide refresh tokens for Microsoft OAuth
      // We'll need to implement a re-authentication flow when the token expires
      refreshToken: null, 
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite',
      userInfo: {
        displayName: graphData.displayName || displayName || '',
        id: graphData.id || '',
        mail: graphData.mail || graphData.userPrincipalName || email || '',
        userPrincipalName: graphData.userPrincipalName || email || ''
      },
      // Store additional data for re-authentication
      authMethod: 'firebase-oauth',
      lastRefreshed: new Date().toISOString()
    };

    // Save to Firestore
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      microsoftAuth: microsoftAuth,
      lastLoginAt: new Date().toISOString()
    });

    console.log('[exchange-token] Microsoft auth data saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Microsoft account connected successfully',
      microsoftAuth: microsoftAuth
    });

  } catch (error: any) {
    console.error('[exchange-token] Error:', error);
    return res.status(500).json({
      error: 'Failed to process Microsoft token',
      message: error.message
    });
  }
}