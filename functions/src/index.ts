// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { confirmBooking } from "./bookings/confirm";
import { microsoftCallback } from "./auth/callback";
import { microsoftStatus } from "./auth/status";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Full URL:', req.url);
  console.log('Original URL:', req.originalUrl);
  next();
});

// ============================================
// Microsoft Auth URL Generation
// ============================================
const MICROSOFT_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI;

async function generateMicrosoftAuthUrl(req: express.Request, res: express.Response): Promise<void> {
  const { tutorId, userId } = req.method === 'POST' ? req.body : req.query;
  
  const id = tutorId || userId;
  
  if (!id) {
    res.status(400).json({ 
      error: 'User ID or Tutor ID is required'
    });
    return;
  }

  if (!MICROSOFT_CLIENT_ID || !REDIRECT_URI) {
    console.error('[generateMicrosoftAuthUrl] Missing configuration');
    res.status(500).json({ 
      error: 'Microsoft authentication not configured'
    });
    return;
  }

  // CRITICAL: Include offline_access for refresh tokens!
  const scopes = [
    'User.Read',
    'Calendars.ReadWrite', 
    'OnlineMeetings.ReadWrite',
    'offline_access' // ESSENTIAL for refresh tokens!
  ].join(' ');

  const authUrl = 
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${MICROSOFT_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${id}` +
    `&prompt=consent`;

  console.log('[generateMicrosoftAuthUrl] Generated auth URL for user:', id);
  console.log('[generateMicrosoftAuthUrl] Scopes:', scopes);
  
  res.json({ authUrl });
}

// ============================================
// Microsoft Disconnect Function
// ============================================
async function disconnectMicrosoftAccount(req: express.Request, res: express.Response): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { tutorId, userId } = req.body;
  const id = tutorId || userId;
  
  if (!id) {
    res.status(400).json({ 
      error: 'User ID or Tutor ID is required'
    });
    return;
  }

  try {
    const db = admin.firestore();
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
    res.status(500).json({ 
      error: 'Failed to disconnect account'
    });
  }
}

// IMPORTANT: Mount routes directly on app with full path
// When Firebase Functions v2 calls your function, it strips the function name from the path
// So we need to handle the paths as they come in

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Booking confirmation endpoint
app.post("/bookings/confirm", confirmBooking);

// Microsoft OAuth endpoints
app.get("/auth/microsoft/callback", microsoftCallback);
app.get("/auth/microsoft/status", microsoftStatus);
app.post("/auth/microsoft/auth-url", generateMicrosoftAuthUrl);
app.get("/auth/microsoft/auth-url", generateMicrosoftAuthUrl); // Support GET too
app.post("/auth/microsoft/disconnect", disconnectMicrosoftAccount);

// Simple 404 handler
app.use((req, res) => {
  console.log(`404 - Path not found: ${req.path}`);
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

export const api = onRequest({
  region: "europe-west1"
}, app);