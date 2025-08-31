import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

const getFirestore = () => admin.firestore();

export async function microsoftStatus(req: Request, res: Response): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId } = req.query;

  if (!tutorId) {
    res.status(400).json({ message: 'Tutor ID is required' });
    return;
  }

  try {
    const db = getFirestore();
    const tutorDoc = await db.collection('tutors').doc(tutorId as string).get();
    
    if (!tutorDoc.exists) {
      res.status(404).json({ message: 'Tutor not found' });
      return;
    }
    
    const tutorData = tutorDoc.data();
    const microsoftAuth = tutorData?.microsoftAuth;
    
    if (microsoftAuth && microsoftAuth.refreshToken) {
      res.json({
        isConnected: true,
        userInfo: microsoftAuth.userInfo,
        connectedAt: microsoftAuth.connectedAt
      });
    } else {
      res.json({
        isConnected: false
      });
    }
    
  } catch (error) {
    console.error('Error checking Microsoft account status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}