// functions/src/bookings/confirm.ts
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { Client } from '@microsoft/microsoft-graph-client';

// Helper function to get Firestore instance
const getFirestore = () => admin.firestore();

// Helper functions for Microsoft token management
async function refreshTokenAndGetAccessToken(tutorId: string): Promise<string> {
  const db = getFirestore();
  
  // Check tutors collection first
  let tutorDoc = await db.collection('tutors').doc(tutorId).get();
  let collection = 'tutors';
  
  // If not found in tutors, check users collection
  if (!tutorDoc.exists) {
    tutorDoc = await db.collection('users').doc(tutorId).get();
    collection = 'users';
    
    if (!tutorDoc.exists) {
      throw new Error('Tutor not found in either collection');
    }
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
  
  // Get Azure credentials - hardcoded for now since env vars aren't loading
  const azureClientId = '9f1bbff3-6d5a-40dd-851f-da6dd6620990';
  const azureClientSecret = 'dy58Q~jAJpfTZI6RInRi_O2JnZhfQpDxlPYxRdel';
  
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
  
  // Update stored tokens in the correct collection
  await db.collection(collection).doc(tutorId).update({
    'microsoftAuth.accessToken': tokens.access_token,
    'microsoftAuth.expiresAt': new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    'microsoftAuth.lastRefreshed': new Date().toISOString(),
  });
  
  return tokens.access_token;
}

async function checkMicrosoftAuthStatus(tutorId: string) {
  const db = getFirestore();
  
  console.log('[confirm-api] Checking auth for tutorId:', tutorId);
  
  // Check tutors collection first
  let tutorDoc = await db.collection('tutors').doc(tutorId).get();
  let collection = 'tutors';
  
  if (!tutorDoc.exists) {
    console.log('[confirm-api] Not found in tutors collection, checking users collection...');
    tutorDoc = await db.collection('users').doc(tutorId).get();
    collection = 'users';
    
    if (!tutorDoc.exists) {
      console.log('[confirm-api] Document does not exist in either collection');
      return { isConnected: false, needsReconnect: false };
    }
  }
  
  console.log('[confirm-api] Found document in', collection, 'collection');
  
  const tutorData = tutorDoc.data();
  console.log('[confirm-api] Data exists:', !!tutorData);
  console.log('[confirm-api] microsoftAuth exists:', !!tutorData?.microsoftAuth);
  console.log('[confirm-api] refreshToken exists:', !!tutorData?.microsoftAuth?.refreshToken);
  console.log('[confirm-api] accessToken exists:', !!tutorData?.microsoftAuth?.accessToken);
  
  const microsoftAuth = tutorData?.microsoftAuth;
  
  // Check if we have Microsoft auth data
  if (!microsoftAuth?.accessToken) {
    console.log('[confirm-api] No access token found');
    return { isConnected: false, needsReconnect: false };
  }
  
  // Check if we have a refresh token (for persistent access)
  if (!microsoftAuth.refreshToken) {
    console.log('[confirm-api] Has access token but no refresh token - limited connection');
    
    // Check if the access token is still valid
    const expiresAt = new Date(microsoftAuth.expiresAt);
    const now = new Date();
    
    if (expiresAt <= now) {
      console.log('[confirm-api] Access token expired and no refresh token available');
      return { isConnected: false, needsReconnect: true };
    }
    
    // Access token still valid but will expire soon
    console.log('[confirm-api] Access token still valid but no refresh token for renewal');
    return { isConnected: true, needsReconnect: false, limitedConnection: true };
  }
  
  // We have both access and refresh tokens
  const expiresAt = new Date(microsoftAuth.expiresAt);
  const now = new Date();
  
  console.log('[confirm-api] Token expires at:', expiresAt);
  console.log('[confirm-api] Current time:', now);
  console.log('[confirm-api] Token expired?', expiresAt <= now);
  
  return {
    isConnected: true,
    needsReconnect: false,
    limitedConnection: false
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
      console.log('[confirm-api] Microsoft account not connected or expired');
      return res.status(200).json({
        success: false,
        message: 'Microsoft account not connected',
        error: authStatus.needsReconnect ? 
          'Your Microsoft connection has expired. Please reconnect your Microsoft account in profile settings' :
          'Please connect your Microsoft account in profile settings',
        errorType: authStatus.needsReconnect ? 'AUTH_EXPIRED' : 'AUTH_MISSING'
      });
    }
    
    if (authStatus.limitedConnection) {
      console.log('[confirm-api] Limited connection - no refresh token');
      // Continue but warn that this is temporary
    }
    
    // Get access token
    console.log('[confirm-api] Getting access token...');
    let accessToken: string;
    
    try {
      // If we have a refresh token, use the refresh flow
      // Otherwise, try to use the current access token if still valid
      if (!authStatus.limitedConnection) {
        accessToken = await refreshTokenAndGetAccessToken(tutorId);
      } else {
        // For limited connections, we need to get the access token directly
        const db = getFirestore();
        let doc = await db.collection('tutors').doc(tutorId).get();
        if (!doc.exists) {
          doc = await db.collection('users').doc(tutorId).get();
        }
        const data = doc.data();
        accessToken = data?.microsoftAuth?.accessToken;
        
        if (!accessToken) {
          throw new Error('No valid access token available');
        }
      }
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