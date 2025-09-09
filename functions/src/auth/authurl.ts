// functions/src/auth/authUrl.ts
// OR add this to your index.ts file

import {Request, Response} from 'express';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI;

export async function generateMicrosoftAuthUrl(req: Request, res: Response): Promise<void> {
  // Support both POST and GET
  const { tutorId, userId } = req.method === 'POST' ? req.body : req.query;
  
  const id = tutorId || userId;
  
  if (!id) {
    res.status(400).json({ 
      error: 'User ID or Tutor ID is required'
    });
    return;
  }

  if (!MICROSOFT_CLIENT_ID || !REDIRECT_URI) {
    console.error('[generateMicrosoftAuthUrl] Missing configuration:', {
      hasClientId: !!MICROSOFT_CLIENT_ID,
      hasRedirectUri: !!REDIRECT_URI
    });
    res.status(500).json({ 
      error: 'Microsoft authentication not configured'
    });
    return;
  }

  // THIS IS THE CRITICAL PART - MUST INCLUDE offline_access!
  const scopes = [
    'User.Read',
    'Calendars.ReadWrite', 
    'OnlineMeetings.ReadWrite',
    'offline_access' // <-- THIS IS WHAT'S MISSING IN YOUR CURRENT SETUP!
  ].join(' ');

  const authUrl = 
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${MICROSOFT_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${id}` + // Using the user ID as state
    `&prompt=consent`; // Force consent to ensure all permissions are granted

  console.log('[generateMicrosoftAuthUrl] Generated auth URL for user:', id);
  console.log('[generateMicrosoftAuthUrl] Scopes included:', scopes);
  
  res.json({ 
    authUrl,
    scopes: scopes.split(' ') // Return for debugging
  });
}