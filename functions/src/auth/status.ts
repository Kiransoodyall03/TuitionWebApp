// functions/src/auth/status.ts
import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

const getFirestore = () => admin.firestore();

export async function microsoftStatus(req: Request, res: Response): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId, userId } = req.query;
  
  // Support both tutorId and userId parameters
  const id = (tutorId || userId) as string;

  if (!id) {
    res.status(400).json({ message: 'Tutor ID or User ID is required' });
    return;
  }

  try {
    const db = getFirestore();
    const tutorDoc = await db.collection('tutors').doc(id).get();
    
    if (!tutorDoc.exists) {
      // Return not connected instead of 404 to avoid exposing user existence
      res.json({
        connected: false,
        hasRefreshToken: false,
        message: 'No Microsoft account connected'
      });
      return;
    }
    
    const tutorData = tutorDoc.data();
    const microsoftAuth = tutorData?.microsoftAuth;
    
    // Check if we have valid auth data
    const hasAccessToken = !!(microsoftAuth?.accessToken);
    const hasRefreshToken = !!(microsoftAuth?.refreshToken);
    
    // Check if the access token is expired
    let tokenExpired = false;
    let needsReconnect = false;
    
    if (microsoftAuth?.expiresAt) {
      const expiresAt = new Date(microsoftAuth.expiresAt);
      const now = new Date();
      tokenExpired = expiresAt <= now;
      
      // If token is expired and no refresh token, needs reconnect
      needsReconnect = tokenExpired && !hasRefreshToken;
    }
    
    // Determine connection status
    const isConnected = hasAccessToken && !needsReconnect;
    
    console.log(`[microsoftStatus] Status for ${id}:`, {
      hasAccessToken,
      hasRefreshToken,
      tokenExpired,
      needsReconnect,
      isConnected
    });
    
    res.json({
      // Main connection status
      connected: isConnected,
      isConnected: isConnected, // Keep for backward compatibility
      
      // Detailed status
      hasRefreshToken: hasRefreshToken,
      tokenExpired: tokenExpired,
      needsReconnect: needsReconnect,
      
      // User info if connected
      userInfo: isConnected ? microsoftAuth.userInfo : null,
      
      // Additional metadata
      connectedAt: microsoftAuth?.connectedAt || null,
      expiresAt: microsoftAuth?.expiresAt || null,
      scope: microsoftAuth?.scope || null,
      
      // Warning messages for the frontend
      warning: !hasRefreshToken && hasAccessToken ? 
        'Microsoft account connected but without refresh token. Connection will expire soon and require reconnection.' : 
        null
    });
    
  } catch (error) {
    console.error('Error checking Microsoft account status:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      connected: false,
      isConnected: false,
      hasRefreshToken: false
    });
  }
}