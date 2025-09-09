// functions/src/auth/callback.ts - CRITICAL UPDATE NEEDED
import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI;

interface TokenResponse {
  access_token: string;
  refresh_token?: string; // Make optional since it might not come through
  expires_in: number;
  scope: string;
  token_type: string;
}

const getFirestore = () => admin.firestore();

export async function microsoftCallback(req: Request, res: Response): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { code, state, error, error_description } = req.query;

  console.log('[microsoftCallback] Received callback:', {
    hasCode: !!code,
    hasState: !!state,
    error: error
  });

  if (error) {
    console.error('Microsoft OAuth error:', error, error_description);
    // Return HTML that closes the window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h2>Authentication Failed</h2>
          <p>${error_description || error}</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
    return;
  }

  if (!code || !state) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h2>Missing parameters</h2>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
    return;
  }

  const tutorId = state as string;

  try {
    // CRITICAL FIX: The scope parameter should NOT be included in the token exchange!
    // The scope was already defined when generating the auth URL.
    // Including it here can cause issues with the token exchange.
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: REDIRECT_URI!,
        grant_type: 'authorization_code'
        // DO NOT include scope here - it was already set in the auth URL
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // CRITICAL: Log what we received to debug
    console.log('[microsoftCallback] Token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      receivedScopes: tokens.scope,
      expiresIn: tokens.expires_in
    });

    // WARNING CHECK
    if (!tokens.refresh_token) {
      console.error('====================================');
      console.error('WARNING: NO REFRESH TOKEN RECEIVED!');
      console.error('====================================');
      console.error('Possible causes:');
      console.error('1. offline_access scope not requested in auth URL');
      console.error('2. User did not consent to offline_access');
      console.error('3. Azure app missing client secret');
      console.error('4. Azure app not configured for offline_access permission');
      console.error('Received scopes:', tokens.scope);
      console.error('====================================');
    }

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Microsoft Graph');
    }

    const userInfo = await userResponse.json();

    const db = getFirestore();
    await db.collection('tutors').doc(tutorId).set({
      microsoftAuth: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        userInfo: {
          id: userInfo.id,
          displayName: userInfo.displayName || '',
          mail: userInfo.mail || userInfo.userPrincipalName || '',
          userPrincipalName: userInfo.userPrincipalName || '',
        },
        connectedAt: new Date().toISOString(),
        lastRefreshed: new Date().toISOString(),
      }
    }, { merge: true });

    console.log(`Microsoft account connected for tutor ${tutorId}:`, {
      email: userInfo.mail,
      hasRefreshToken: !!tokens.refresh_token
    });

    // Return success HTML that closes the window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Success</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
            }
            .success { color: green; }
            .warning { 
              color: orange; 
              background: #fff3cd; 
              padding: 10px; 
              border-radius: 5px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <h2 class="success">✓ Microsoft Account Connected!</h2>
          ${tokens.refresh_token ? 
            '<p>Full access granted with refresh token.</p>' : 
            '<div class="warning">⚠️ Connected but no refresh token received. You may need to reconnect frequently.</div>'
          }
          <p>This window will close automatically...</p>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'microsoft-auth-success',
                hasRefreshToken: ${!!tokens.refresh_token}
              }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error('Error in Microsoft OAuth callback:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body>
          <h2 style="color: red;">Connection Failed</h2>
          <p>${error.message}</p>
          <script>setTimeout(() => window.close(), 5000);</script>
        </body>
      </html>
    `);
  }
}