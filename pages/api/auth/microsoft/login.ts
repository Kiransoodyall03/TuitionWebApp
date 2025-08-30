// pages/api/auth/microsoft/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // Your ngrok URL + /auth/microsoft/callback

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tutorId } = req.query;

  if (!tutorId) {
    return res.status(400).json({ message: 'Tutor ID is required' });
  }

  // Microsoft OAuth URL
  const scopes = 'User.Read OnlineMeetings.ReadWrite Calendars.ReadWrite';
  const state = tutorId; // Use tutorId as state to identify the user after callback

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${MICROSOFT_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${tutorId}&` +
    `response_mode=query`;

  res.redirect(authUrl);
}