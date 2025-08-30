// services/bookings/bookingService.ts
import { createTeamsMeeting, createTeamsMeetingDirectAPI, TeamsMeetingData } from '../../lib/microsoftGraph';
import { refreshTokenAndGetAccessToken } from '../../lib/tokenHelpers';
import { getFirestore } from '../../lib/firebaseAdmin';

export interface BookingConfirmationResult {
  success: boolean;
  bookingId: string;
  teamsJoinUrl?: string;
  teamsMeetingId?: string;
  error?: string;
}

export async function confirmBookingWithTeamsMeeting(
  bookingId: string,
  tutorId: string,
  bookingDetails: {
    subject: string;
    startTime: Date;
    endTime: Date;
    tutorEmail?: string;
    studentEmail?: string;
  }
): Promise<BookingConfirmationResult> {
  
  try {
    // 1. Get fresh access token for the tutor
    console.log('Getting access token for tutor:', tutorId);
    const accessToken = await refreshTokenAndGetAccessToken(tutorId);
    
    // 2. Create Teams meeting
    const meetingData: TeamsMeetingData = {
      subject: `Tuition Session - ${bookingDetails.subject}`,
      startDateTime: bookingDetails.startTime.toISOString(),
      endDateTime: bookingDetails.endTime.toISOString(),
      tutorEmail: bookingDetails.tutorEmail,
      studentEmail: bookingDetails.studentEmail
    };

    console.log('Creating Teams meeting with data:', meetingData);
    
    // Try the Graph SDK first, fall back to direct API if needed
    let teamsMeeting;
    try {
      teamsMeeting = await createTeamsMeeting(accessToken, meetingData);
    } catch (sdkError) {
      console.warn('Graph SDK failed, trying direct API:', sdkError);
      teamsMeeting = await createTeamsMeetingDirectAPI(accessToken, meetingData);
    }
    
    // 3. Update booking in Firestore with Teams meeting info
    await updateBookingWithTeamsMeeting(bookingId, {
      teamsJoinUrl: teamsMeeting.joinWebUrl,
      teamsMeetingId: teamsMeeting.id,
      status: 'confirmed'
    });

    console.log('Booking confirmed with Teams meeting:', teamsMeeting.joinWebUrl);

    return {
      success: true,
      bookingId,
      teamsJoinUrl: teamsMeeting.joinWebUrl,
      teamsMeetingId: teamsMeeting.id
    };

  } catch (error) {
    console.error('Failed to create Teams meeting for booking:', error);
    
    // Check if it's a token/auth issue
    if (error instanceof Error && 
        (error.message.includes('not linked Microsoft account') || 
         error.message.includes('Token endpoint error') ||
         error.message.includes('access token expired'))) {
      
      return {
        success: false,
        bookingId,
        error: 'Microsoft account not connected or expired. Please reconnect your Microsoft account.'
      };
    }
    
    // For other errors, still confirm booking but without Teams meeting
    try {
      await updateBookingStatus(bookingId, 'confirmed');
      console.log('Booking confirmed without Teams meeting due to error');
    } catch (dbError) {
      console.error('Failed to update booking status:', dbError);
    }
    
    return {
      success: false,
      bookingId,
      error: `Booking confirmed, but Teams meeting creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Firestore helper functions
async function updateBookingWithTeamsMeeting(
  bookingId: string, 
  data: { teamsJoinUrl?: string; teamsMeetingId?: string; status: string }
) {
  const db = getFirestore();
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  await bookingRef.update({
    status: data.status,
    teamsJoinUrl: data.teamsJoinUrl,
    teamsMeetingId: data.teamsMeetingId,
    updatedAt: new Date().toISOString()
  });
}

async function updateBookingStatus(bookingId: string, status: string) {
  const db = getFirestore();
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  await bookingRef.update({
    status,
    updatedAt: new Date().toISOString()
  });
}