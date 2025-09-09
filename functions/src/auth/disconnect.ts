// functions/src/auth/disconnect.ts
import {Request, Response} from 'express';
import * as admin from 'firebase-admin';

const getFirestore = () => admin.firestore();

export async function disconnectMicrosoftAccount(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId, userId } = req.body;
  
  const id = tutorId || userId;
  
  if (!id) {
    res.status(400).json({ 
      error: 'User ID or Tutor ID is required',
      message: 'User ID or Tutor ID is required' 
    });
    return;
  }

  try {
    const db = getFirestore();
    
    // Remove Microsoft auth data from the tutor document
    await db.collection('tutors').doc(id).update({
      microsoftAuth: admin.firestore.FieldValue.delete()
    });
    
    console.log(`[disconnectMicrosoftAccount] Disconnected Microsoft account for tutor ${id}`);
    
    res.json({ 
      success: true, 
      message: 'Microsoft account disconnected successfully' 
    });
    
  } catch (error: any) {
    console.error('[disconnectMicrosoftAccount] Error:', error);
    
    // Check if the document doesn't exist
    if (error.code === 5) { // NOT_FOUND error code
      res.status(404).json({ 
        error: 'Tutor not found',
        message: 'No tutor found with the provided ID'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to disconnect account',
        message: 'An error occurred while disconnecting the Microsoft account'
      });
    }
  }
}