// functions/src/auth/microsoft.ts
import { Request, Response } from 'express';
import * as crypto from 'crypto';

// Store for auth states (in production, use Redis or Firestore)
const authStates = new Map<string, { userId: string; timestamp: number; userType: string }>();

// Clean up old states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of authStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      authStates.delete(state);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * GET /api/auth/microsoft/auth-url
 * Generate Microsoft OAuth authorization URL
 */
export async function getMicrosoftAuthUrl(req: Request, res: Response) {
  // Allow both GET and POST
  const userId = req.method === 'POST' ? req.body.userId : req.query.userId;
  const userType = req.method === 'POST' ? req.body.userType : req.query.userType;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    // Azure AD app credentials from environment
    const clientId = process.env.AZURE_CLIENT_ID;
    const redirectUri = process.env.AZURE_REDIRECT_URI || 
      `${process.env.FUNCTIONS_BASE_URL || 'https://us-central1-yourproject.cloudfunctions.net'}/api/auth/microsoft/callback`;
    
    if (!clientId) {
      console.error('[getMicrosoftAuthUrl] Azure Client ID not configured');
      return res.status(500).json({ error: 'Microsoft authentication not configured' });
    }

    // CRITICAL: Include offline_access for refresh tokens
    const scopes = [
      'User.Read',
      'Calendars.ReadWrite',
      'OnlineMeetings.ReadWrite',
      'offline_access' // Essential for refresh tokens!
    ].join(' ');

    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('base64url');
    
    // Store state with user info
    authStates.set(state, {
      userId: userId as string,
      userType: userType || 'tutor',
      timestamp: Date.now()
    });

    // Build authorization URL
    const authUrl = 
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}` +
      `&prompt=consent`; // Force consent to ensure all permissions granted

    console.log('[getMicrosoftAuthUrl] Generated auth URL for user:', userId);
    
    return res.json({ authUrl });
  } catch (error: any) {
    console.error('[getMicrosoftAuthUrl] Error:', error);
    return res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
}