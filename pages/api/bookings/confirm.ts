import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@microsoft/microsoft-graph-client';
import type { OnlineMeeting } from '@microsoft/microsoft-graph-types';
import { refreshTokenAndGetAccessToken } from '../../../lib/tokenHelpers';
import { getFirestore } from '../../../lib/firebaseAdmin';

interface TeamsOnlineMeeting {
  id?: string;
  joinWebUrl?: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { bookingId, tutorId, subject, startTime, endTime, studentEmail, tutorEmail } = req.body;

  // Debug logging
  console.log('Received request body:', {
    bookingId,
    tutorId,
    subject,
    startTime,
    endTime,
    studentEmail,
    tutorEmail
  });

  // Validation
  if (!bookingId || !tutorId || !subject || !startTime || !endTime) {
    return res.status(400).json({ 
      message: 'Missing required fields: bookingId, tutorId, subject, startTime, endTime' 
    });
  }

  try {
    console.log('Attempting to get access token for tutor:', tutorId);
    
    // Get access token using tutor's refresh token from Firebase
    const accessToken = await refreshTokenAndGetAccessToken(tutorId);
    console.log('Successfully obtained access token');
    
    // Initialize Graph client with proper typing
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    console.log('Graph client initialized, creating meeting...');

    // Format datetime for Graph API
    const meetingStart = new Date(startTime).toISOString();
    const meetingEnd = new Date(endTime).toISOString();

    // Create Teams meeting payload
    const meetingPayload = {
      subject: `${subject} Tutoring Session`,
      startDateTime: meetingStart,
      endDateTime: meetingEnd,
      participants: {
        attendees: [
          ...(studentEmail ? [{
            emailAddress: {
              address: studentEmail,
              name: "Student"
            }
          }] : []),
          ...(tutorEmail ? [{
            emailAddress: {
              address: tutorEmail,
              name: "Tutor"
            }
          }] : [])
        ]
      },
      allowMeetingChat: true,
      allowTeamworkReactions: true,
      allowAttendeeToEnableCamera: true,
      allowAttendeeToEnableMic: true,
      allowRecording: false,
      allowTranscription: false,
      recordAutomatically: false
    };

    // Create the online meeting using the correct endpoint
    console.log('Making Graph API call to create meeting...');
    const createdMeeting: TeamsOnlineMeeting = await graphClient
      .api('/me/onlineMeetings')
      .post(meetingPayload);
    
    console.log('Meeting created successfully:', {
      id: createdMeeting.id,
      joinUrl: createdMeeting.joinWebUrl
    });

    // Store meeting info in Firestore
    if (createdMeeting.id && createdMeeting.joinWebUrl) {
      await saveMeetingToFirestore(bookingId, createdMeeting.id, createdMeeting.joinWebUrl);
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Teams meeting created successfully',
      teamsJoinUrl: createdMeeting.joinWebUrl,
      teamsMeetingId: createdMeeting.id,
      meetingSubject: createdMeeting.subject,
      startTime: createdMeeting.startDateTime,
      endTime: createdMeeting.endDateTime
    });

  } catch (error: any) {
    console.error('Error creating Teams meeting:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusCode: error.statusCode
    });
    
    // Handle specific Graph API errors
    if (error.message?.includes('Tutor not found') || error.message?.includes('no refresh token')) {
      return res.status(400).json({ 
        success: false,
        message: 'Tutor has not connected their Microsoft account. Please link Microsoft account first.',
        errorType: 'AUTH_MISSING'
      });
    }
    
    if (error.message?.includes('Token endpoint error') || error.message?.includes('Failed to refresh token')) {
      return res.status(401).json({ 
        success: false,
        message: 'Microsoft authentication expired. Please reconnect your Microsoft account.',
        errorType: 'AUTH_EXPIRED'
      });
    }
    
    if (error.code === 'InvalidAuthenticationToken') {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication failed. Please check your access token.',
        errorType: 'AUTH_INVALID'
      });
    }
    
    if (error.code === 'Forbidden') {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions to create Teams meetings.',
        errorType: 'PERMISSIONS'
      });
    }

    // Graph API specific errors
    if (error.status || error.statusCode) {
      return res.status(error.status || error.statusCode || 500).json({
        success: false,
        message: 'Microsoft Graph API error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Graph API error',
        errorType: 'GRAPH_API'
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Failed to create Teams meeting',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorType: 'UNKNOWN'
    });
  }
}

// Helper function to save meeting info to Firestore
async function saveMeetingToFirestore(bookingId: string, meetingId: string, joinUrl: string) {
  try {
    const db = getFirestore();
    await db.collection('bookings').doc(bookingId).set({
      teamsMeetingId: meetingId,
      teamsJoinUrl: joinUrl,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving meeting to Firestore:', error);
    // Don't throw here - we don't want to fail the entire operation
    // if just the database save fails
  }
}