// functions/src/bookings/confirm.ts
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { Client } from '@microsoft/microsoft-graph-client';

// Helper function to get Firestore instance
const getFirestore = () => admin.firestore();

// Helper functions for Microsoft token management
async function refreshTokenAndGetAccessToken(tutorId: string): Promise<string> {
  const db = getFirestore();
  const tutorDoc = await db.collection('tutors').doc(tutorId).get();
  
  if (!tutorDoc.exists) {
    throw new Error('Tutor not found');
  }
  
  const tutorData = tutorDoc.data();
  const microsoftAuth = tutorData?.microsoftAuth;
  
  if (!microsoftAuth?.refreshToken) {
    throw new Error('No refresh token available - please reconnect your Microsoft account');
  }
  
  // Check if current token is still valid (with 5 min buffer)
  const expiresAt = new Date(microsoftAuth.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt > fiveMinutesFromNow && microsoftAuth.accessToken) {
    return microsoftAuth.accessToken;
  }
  
  // Get Azure credentials from environment variables
  const azureClientId = process.env.AZURE_CLIENT_ID;
  const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
  
  if (!azureClientId || !azureClientSecret) {
    throw new Error('Azure credentials not configured');
  }
  
  // Refresh the token
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: azureClientId,
      client_secret: azureClientSecret,
      refresh_token: microsoftAuth.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!tokenResponse.ok) {
    throw new Error('Token refresh failed - please reconnect your Microsoft account');
  }
  
  const tokens = await tokenResponse.json();
  
  // Update stored tokens
  await db.collection('tutors').doc(tutorId).update({
    'microsoftAuth.accessToken': tokens.access_token,
    'microsoftAuth.expiresAt': new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    'microsoftAuth.lastRefreshed': new Date().toISOString(),
  });
  
  return tokens.access_token;
}

async function checkMicrosoftAuthStatus(tutorId: string) {
  const db = getFirestore();
  const tutorDoc = await db.collection('tutors').doc(tutorId).get();
  
  console.log('[confirm-api] Checking auth for tutorId:', tutorId);
  
  if (!tutorDoc.exists) {
    console.log('[confirm-api] Tutor document does not exist');
    return { isConnected: false, needsReconnect: false };
  }
  
  const tutorData = tutorDoc.data();
  console.log('[confirm-api] Tutor data exists:', !!tutorData);
  console.log('[confirm-api] microsoftAuth exists:', !!tutorData?.microsoftAuth);
  console.log('[confirm-api] refreshToken exists:', !!tutorData?.microsoftAuth?.refreshToken);
  
  const microsoftAuth = tutorData?.microsoftAuth;
  
  if (!microsoftAuth?.refreshToken) {
    console.log('[confirm-api] No refresh token found');
    return { isConnected: false, needsReconnect: false };
  }
  
  const expiresAt = new Date(microsoftAuth.expiresAt);
  const now = new Date();
  
  console.log('[confirm-api] Token expires at:', expiresAt);
  console.log('[confirm-api] Current time:', now);
  console.log('[confirm-api] Token expired?', expiresAt <= now);
  
  return {
    isConnected: true,
    needsReconnect: expiresAt <= now && !microsoftAuth.refreshToken
  };
}

export async function confirmBooking(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { bookingId, tutorId, subject, startTime, endTime, studentEmail, tutorEmail } = req.body;

  console.log('[confirm-api] Received request:', {
    bookingId,
    tutorId,
    subject,
    startTime,
    endTime,
    hasStudentEmail: !!studentEmail,
    hasTutorEmail: !!tutorEmail
  });

  // Validation
  if (!bookingId || !tutorId || !subject || !startTime || !endTime) {
    return res.status(400).json({ 
      success: false,
      message: 'Missing required fields',
      error: 'bookingId, tutorId, subject, startTime, endTime are required'
    });
  }

  try {
    // First check if Microsoft auth is valid
    console.log('[confirm-api] Checking Microsoft auth status...');
    const authStatus = await checkMicrosoftAuthStatus(tutorId);
    
    if (!authStatus.isConnected) {
      console.log('[confirm-api] Microsoft account not connected');
      return res.status(200).json({
        success: false,
        message: 'Microsoft account not connected',
        error: 'Please connect your Microsoft account in profile settings',
        errorType: 'AUTH_MISSING'
      });
    }
    
    if (authStatus.needsReconnect) {
      console.log('[confirm-api] Microsoft account needs reconnection');
      return res.status(200).json({
        success: false,
        message: 'Microsoft authentication expired',
        error: 'Please reconnect your Microsoft account in profile settings',
        errorType: 'AUTH_EXPIRED'
      });
    }
    
    // Get access token
    console.log('[confirm-api] Getting access token...');
    let accessToken: string;
    
    try {
      accessToken = await refreshTokenAndGetAccessToken(tutorId);
      console.log('[confirm-api] Successfully obtained access token');
    } catch (tokenError: any) {
      console.error('[confirm-api] Token error:', tokenError);
      
      if (tokenError.message?.includes('expired') || tokenError.message?.includes('reconnect')) {
        return res.status(200).json({
          success: false,
          message: 'Microsoft authentication expired',
          error: 'Please reconnect your Microsoft account in profile settings',
          errorType: 'AUTH_EXPIRED'
        });
      }
      
      return res.status(200).json({
        success: false,
        message: 'Failed to authenticate with Microsoft',
        error: tokenError.message,
        errorType: 'AUTH_ERROR'
      });
    }
    
    // Initialize Graph client
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    console.log('[confirm-api] Creating Teams meeting and calendar event...');

    // Format datetime for Graph API
    const meetingStart = new Date(startTime);
    const meetingEnd = new Date(endTime);
    
    // Create a calendar event with Teams meeting
    const eventPayload = {
      subject: `${subject} Tutoring Session`,
      body: {
        contentType: 'HTML',
        content: `
          <p>This is a tutoring session for ${subject}.</p>
          <p><strong>Tutor:</strong> ${tutorEmail || 'Tutor'}</p>
          <p><strong>Student:</strong> ${studentEmail || 'Student'}</p>
          <p>Join the Teams meeting using the link in this invitation.</p>
        `
      },
      start: {
        dateTime: meetingStart.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: meetingEnd.toISOString(),
        timeZone: 'UTC'
      },
      location: {
        displayName: 'Microsoft Teams Meeting'
      },
      attendees: [
        ...(studentEmail ? [{
          emailAddress: {
            address: studentEmail,
            name: 'Student'
          },
          type: 'required'
        }] : [])
      ],
      allowNewTimeProposals: false,
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    // Create the event with Teams meeting
    console.log('[confirm-api] Creating calendar event with Teams meeting...');
    let createdEvent;
    
    try {
      createdEvent = await graphClient
        .api('/me/events')
        .post(eventPayload);
      
      console.log('[confirm-api] Calendar event created successfully:', {
        id: createdEvent.id,
        subject: createdEvent.subject,
        hasOnlineMeeting: !!createdEvent.onlineMeeting,
        joinUrl: createdEvent.onlineMeeting?.joinUrl
      });
    } catch (graphError: any) {
      console.error('[confirm-api] Graph API error:', graphError);
      
      // Try to extract more specific error information
      const errorDetails = graphError.body || graphError.message || graphError;
      console.error('[confirm-api] Error details:', errorDetails);
      
      if (graphError.statusCode === 401 || graphError.code === 'InvalidAuthenticationToken') {
        return res.status(200).json({
          success: false,
          message: 'Microsoft authentication expired',
          error: 'Please reconnect your Microsoft account',
          errorType: 'AUTH_EXPIRED'
        });
      }
      
      if (graphError.statusCode === 403) {
        return res.status(200).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'Missing required permissions. Please reconnect your Microsoft account with proper permissions.',
          errorType: 'PERMISSIONS'
        });
      }
      
      throw graphError;
    }

    // Extract meeting details
    const teamsJoinUrl = createdEvent.onlineMeeting?.joinUrl;
    const teamsMeetingId = createdEvent.onlineMeeting?.meetingId || createdEvent.id;
    
    if (!teamsJoinUrl) {
      console.warn('[confirm-api] No Teams join URL in response');
    }

    // Store meeting info in Firestore
    if (teamsMeetingId && teamsJoinUrl) {
      console.log('[confirm-api] Saving meeting details to Firestore...');
      try {
        const db = getFirestore();
        await db.collection('bookings').doc(bookingId).set({
          teamsMeetingId: teamsMeetingId,
          teamsJoinUrl: teamsJoinUrl,
          meetingLink: teamsJoinUrl,
          calendarEventId: createdEvent.id,
          status: 'confirmed',
          confirmed: true,
          confirmedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('[confirm-api] Meeting details saved to Firestore');
      } catch (dbError: any) {
        console.error('[confirm-api] Firestore save error:', dbError);
        // Don't fail the whole operation if just the save fails
      }
    }

    // Return success response
    console.log('[confirm-api] Teams meeting created successfully!');
    return res.status(200).json({
      success: true,
      message: 'Teams meeting created and added to calendar',
      teamsJoinUrl: teamsJoinUrl,
      teamsMeetingId: teamsMeetingId,
      calendarEventId: createdEvent.id,
      meetingSubject: createdEvent.subject,
      startTime: createdEvent.start.dateTime,
      endTime: createdEvent.end.dateTime
    });

  } catch (error: any) {
    console.error('[confirm-api] Unexpected error:', error);
    console.error('[confirm-api] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create Teams meeting',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorType: 'UNKNOWN'
    });
  }
}