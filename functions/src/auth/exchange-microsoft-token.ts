import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

const getFirestore = () => admin.firestore();

export async function exchangeMicrosoftToken(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, accessToken, email, displayName } = req.body;

  if (!userId || !accessToken) {
    res.status(400).json({ error: 'Missing userId or accessToken' });
    return;
  }

  console.log('[exchange-token] Starting token exchange for user:', userId);

  try {
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!graphResponse.ok) {
      console.error('[exchange-token] Invalid access token');
      res.status(401).json({ error: 'Invalid access token' });
      return;
    }

    const graphData = await graphResponse.json();
    console.log('[exchange-token] Got user data from Microsoft Graph');

    const microsoftAuth = {
      accessToken: accessToken,
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
      authMethod: 'firebase-oauth',
      lastRefreshed: new Date().toISOString()
    };

    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      microsoftAuth: microsoftAuth,
      lastLoginAt: new Date().toISOString()
    });

    console.log('[exchange-token] Microsoft auth data saved successfully');

    res.status(200).json({
      success: true,
      message: 'Microsoft account connected successfully',
      microsoftAuth: microsoftAuth
    });

  } catch (error: any) {
    console.error('[exchange-token] Error:', error);
    res.status(500).json({
      error: 'Failed to process Microsoft token',
      message: error.message
    });
  }
}