import {Request, Response} from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const config = functions.config();
const getFirestore = () => admin.firestore();

export async function microsoftToken(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, authCode } = req.body;

  if (!userId || !authCode) {
    res.status(400).json({ error: 'Missing userId or authCode' });
    return;
  }

  try {
    console.log('[microsoft-token] Exchanging auth code for tokens...');
    
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const params = new URLSearchParams({
      client_id: config.azure?.client_id || '',
      client_secret: config.azure?.client_secret || '',
      code: authCode,
      redirect_uri: `${config.frontend?.url}/auth/callback`,
      grant_type: 'authorization_code',
      scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite offline_access'
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[microsoft-token] Token exchange failed:', errorText);
      res.status(400).json({ 
        error: 'Failed to exchange authorization code',
        details: errorText 
      });
      return;
    }

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[microsoft-token] Missing tokens in response');
      res.status(400).json({ 
        error: 'Invalid token response',
        hasAccess: !!tokens.access_token,
        hasRefresh: !!tokens.refresh_token
      });
      return;
    }

    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    let userInfo = {
      displayName: '',
      mail: '',
      userPrincipalName: '',
      id: ''
    };

    if (graphResponse.ok) {
      const graphData = await graphResponse.json();
      userInfo = {
        displayName: graphData.displayName || '',
        mail: graphData.mail || graphData.userPrincipalName || '',
        userPrincipalName: graphData.userPrincipalName || '',
        id: graphData.id || ''
      };
    }

    const db = getFirestore();
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    
    await db.collection('users').doc(userId).update({
      'microsoftAuth': {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        connectedAt: new Date().toISOString(),
        expiresAt: expiresAt,
        scope: tokens.scope || 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite offline_access',
        userInfo: userInfo
      }
    });

    console.log('[microsoft-token] Tokens saved successfully');

    res.status(200).json({ 
      success: true,
      message: 'Microsoft account connected successfully',
      userInfo: userInfo
    });

  } catch (error: any) {
    console.error('[microsoft-token] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}