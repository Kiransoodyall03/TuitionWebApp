// functions/src/auth/disconnect.ts
import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

// Helper function to get Firestore instance
const getFirestore = () => admin.firestore();

// Helper function that matches your tokenHelpers
export async function disconnectMicrosoftAccount(tutorId: string): Promise<void> {
  const db = getFirestore();
  await db.collection('tutors').doc(tutorId).update({
    microsoftAuth: admin.firestore.FieldValue.delete()
  });
}

// Express route handler
export async function microsoftDisconnect(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId } = req.body;

  if (!tutorId) {
    res.status(400).json({ message: 'Tutor ID is required' });
    return;
  }

  try {
    await disconnectMicrosoftAccount(tutorId);
    res.json({ success: true, message: 'Microsoft account disconnected' });
  } catch (error) {
    console.error('Error disconnecting Microsoft account:', error);
    res.status(500).json({ message: 'Failed to disconnect Microsoft account' });
  }
}