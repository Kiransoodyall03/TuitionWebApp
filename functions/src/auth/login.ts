import {Request, Response} from 'express';

const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;

export async function microsoftLogin(req: Request, res: Response): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId } = req.query;

  if (!tutorId) {
    res.status(400).json({ message: 'Tutor ID is required' });
    return;
  }

  const scopes = 'User.Read OnlineMeetings.ReadWrite Calendars.ReadWrite';

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${MICROSOFT_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI!)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${tutorId}&` +
    `response_mode=query`;

  res.redirect(authUrl);
}
