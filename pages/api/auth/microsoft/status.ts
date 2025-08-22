import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from '../../../../lib/firebaseAdmin';

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

  try {
    const db = getFirestore();
    const tutorDoc = await db.collection('tutors').doc(tutorId as string).get();
    
    if (!tutorDoc.exists) {
      return res.status(404).json({ message: 'Tutor not found' });
    }
    
    const tutorData = tutorDoc.data();
    const microsoftAuth = tutorData?.microsoftAuth;
    
    if (microsoftAuth && microsoftAuth.refreshToken) {
      return res.json({
        isConnected: true,
        userInfo: microsoftAuth.userInfo,
        connectedAt: microsoftAuth.connectedAt
      });
    } else {
      return res.json({
        isConnected: false
      });
    }
    
  } catch (error) {
    console.error('Error checking Microsoft account status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}