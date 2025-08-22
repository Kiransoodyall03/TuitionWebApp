import type { NextApiRequest, NextApiResponse } from 'next';
import { disconnectMicrosoftAccount } from '../../../../lib/tokenHelpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tutorId } = req.body;

  if (!tutorId) {
    return res.status(400).json({ message: 'Tutor ID is required' });
  }

  try {
    await disconnectMicrosoftAccount(tutorId);
    return res.json({ success: true, message: 'Microsoft account disconnected' });
  } catch (error) {
    console.error('Error disconnecting Microsoft account:', error);
    return res.status(500).json({ message: 'Failed to disconnect Microsoft account' });
  }
}