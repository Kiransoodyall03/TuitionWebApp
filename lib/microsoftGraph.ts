// lib/microsoftGraph.ts
import { Client } from "@microsoft/microsoft-graph-client";
import { OnlineMeeting } from "@microsoft/microsoft-graph-types";

export interface TeamsMeetingData {
  subject: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  tutorEmail?: string;
  studentEmail?: string;
  // optional extra Graph meeting settings if you want them
  allowedPresenters?: "everyone" | "organization" | "roleIsPresenter";
  isEntryExitAnnounced?: boolean;
  allowAttendeeToEnableCamera?: boolean;
  allowAttendeeToEnableMic?: boolean;
  allowMeetingChat?: "enabled" | "disabled" | "team";
  allowTeamworkReactions?: boolean;
}

function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * createTeamsMeeting can be called in either form:
 *  1) createTeamsMeeting(accessToken, { subject, startDateTime, endDateTime, ... })
 *  2) createTeamsMeeting(accessToken, subject, startIso, endIso)
 *
 * Returns a normalized OnlineMeeting-like object with at least `id` and `joinWebUrl`.
 */
export async function createTeamsMeeting(
  accessToken: string,
  meetingDataOrSubject: string | TeamsMeetingData,
  maybeStart?: string,
  maybeEnd?: string
): Promise<OnlineMeeting> {
  // normalize arguments into a meetingData object
  let meetingData: TeamsMeetingData;
  if (typeof meetingDataOrSubject === "string") {
    if (!maybeStart || !maybeEnd) {
      throw new Error(
        "startDateTime and endDateTime are required when calling createTeamsMeeting(accessToken, subject, start, end)"
      );
    }
    meetingData = {
      subject: meetingDataOrSubject,
      startDateTime: maybeStart,
      endDateTime: maybeEnd,
    };
  } else {
    meetingData = meetingDataOrSubject;
  }

  const graphClient = createGraphClient(accessToken);

  // build request payload (only include fields Graph accepts)
  const meetingRequest: any = {
    subject: meetingData.subject,
    startDateTime: meetingData.startDateTime,
    endDateTime: meetingData.endDateTime,
    // meeting policy settings — keep sensible defaults but allow overrides
    allowedPresenters: meetingData.allowedPresenters ?? "everyone",
    isEntryExitAnnounced: meetingData.isEntryExitAnnounced ?? true,
    allowAttendeeToEnableCamera: meetingData.allowAttendeeToEnableCamera ?? true,
    allowAttendeeToEnableMic: meetingData.allowAttendeeToEnableMic ?? true,
    allowMeetingChat: meetingData.allowMeetingChat ?? "enabled",
    allowTeamworkReactions: meetingData.allowTeamworkReactions ?? true,
  };

  try {
    const createdMeeting = await graphClient.api("/me/onlineMeetings").post(meetingRequest);

    // normalize return to include joinWebUrl consistently
    const normalized: any = {
      id: createdMeeting?.id,
      joinWebUrl: createdMeeting?.joinWebUrl ?? createdMeeting?.joinUrl,
      raw: createdMeeting,
    };

    return normalized as OnlineMeeting;
  } catch (err: any) {
    // defensive: Graph SDK errors vary, inspect common shapes
    const status = err?.statusCode ?? err?.status;
    const code = err?.code;
    const message = err?.message ?? JSON.stringify(err);

    if (status === 401 || code === "InvalidAuthenticationToken") {
      throw new Error("Microsoft access token expired or invalid");
    }
    if (status === 403 || code === "Forbidden") {
      throw new Error(
        "Insufficient permissions to create Teams meetings (ensure OnlineMeetings.ReadWrite is consented)"
      );
    }
    if (status === 429 || code === "TooManyRequests") {
      throw new Error("Rate limit exceeded. Try again later.");
    }

    // fallback
    throw new Error(`Failed to create Teams meeting: ${message}`);
  }
}

/**
 * Direct-fetch fallback if you want to bypass the Graph client.
 * Kept for reference — you can use this if the Graph client causes issues.
 */
export async function createTeamsMeetingDirectAPI(
  accessToken: string,
  meetingData: TeamsMeetingData
): Promise<OnlineMeeting> {
  const meetingRequest = {
    subject: meetingData.subject,
    startDateTime: meetingData.startDateTime,
    endDateTime: meetingData.endDateTime,
    allowedPresenters: meetingData.allowedPresenters ?? "everyone",
    isEntryExitAnnounced: meetingData.isEntryExitAnnounced ?? true,
    allowAttendeeToEnableCamera: meetingData.allowAttendeeToEnableCamera ?? true,
    allowAttendeeToEnableMic: meetingData.allowAttendeeToEnableMic ?? true,
    allowMeetingChat: meetingData.allowMeetingChat ?? "enabled",
    allowTeamworkReactions: meetingData.allowTeamworkReactions ?? true,
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(meetingRequest),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 401) throw new Error("Microsoft access token expired or invalid");
    if (res.status === 403) throw new Error("Insufficient permissions to create Teams meetings");
    if (res.status === 429) throw new Error("Rate limit exceeded. Try again later.");
    throw new Error(`Graph API error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  return {
    id: json?.id,
    joinWebUrl: json?.joinWebUrl ?? json?.joinUrl,
    raw: json,
  } as OnlineMeeting;
}
