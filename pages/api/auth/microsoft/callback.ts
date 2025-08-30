// pages/api/auth/microsoft/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from '../../../../lib/firebaseAdmin';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    console.error('Microsoft OAuth error:', error);
    return res.redirect(`/#/profile?error=${error}`);
  }

  if (!code || !state) {
    return res.redirect('/#/profile?error=missing_code_or_state');
  }

  const tutorId = state as string;

  try {
    // Exchange authorization code for tokens
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
        grant_type: 'authorization_code',
        scope: 'User.Read OnlineMeetings.ReadWrite Calendars.ReadWrite'
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Microsoft Graph');
    }

    const userInfo = await userResponse.json();

    // Store tokens and user info in Firestore
    const db = getFirestore();
    await db.collection('tutors').doc(tutorId).set({
      microsoftAuth: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        userInfo: {
          id: userInfo.id,
          displayName: userInfo.displayName,
          mail: userInfo.mail,
          userPrincipalName: userInfo.userPrincipalName,
        },
        connectedAt: new Date().toISOString(),
      }
    }, { merge: true });

    console.log(`Microsoft account connected for tutor ${tutorId}:`, userInfo.mail);

    // Redirect back to settings with success message
    res.redirect('/#/profile?microsoft=connected');

  } catch (error) {
    console.error('Error in Microsoft OAuth callback:', error);
    res.redirect('/#/profile?error=connection_failed');
  }
}