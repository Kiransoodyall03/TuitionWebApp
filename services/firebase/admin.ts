// lib/firebaseAdmin.ts - Admin SDK for server-side operations
import * as admin from 'firebase-admin';
import { getApps, ServiceAccount } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

let app: admin.app.App;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

// Initialize Firebase Admin SDK (server-side only)
function initializeFirebaseAdmin(): admin.app.App {
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    console.log('[FirebaseAdmin] Using existing app instance');
    return existingApps[0] as admin.app.App;
  }

  console.log('[FirebaseAdmin] Initializing new app instance');
  
  try {
    let serviceAccount: ServiceAccount;

    // Method 1: Using service account file path (RECOMMENDED for local development)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('[FirebaseAdmin] Using service account file path');
      
      const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found at: ${serviceAccountPath}`);
      }
      
      try {
        const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(serviceAccountFile) as ServiceAccount;
        console.log('[FirebaseAdmin] Service account loaded from file');
        console.log('[FirebaseAdmin] Project ID:', serviceAccount.projectId);
      } catch (fileError: any) {
        console.error('[FirebaseAdmin] Failed to read service account file:', fileError.message);
        throw new Error('Invalid service account file format');
      }
    }
    // Method 2: Using environment variable with full JSON (for production)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log('[FirebaseAdmin] Using FIREBASE_SERVICE_ACCOUNT_JSON env var');
      
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
        console.log('[FirebaseAdmin] Service account parsed from env var');
        console.log('[FirebaseAdmin] Project ID:', serviceAccount.projectId);
      } catch (parseError: any) {
        console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format');
      }
    }
    // Method 3: Using individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && 
             process.env.FIREBASE_PRIVATE_KEY && 
             process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('[FirebaseAdmin] Using individual Firebase env vars');
      console.log('[FirebaseAdmin] Project ID:', process.env.FIREBASE_PROJECT_ID);
      
      // Handle the private key - it should have \n characters
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
        universe_domain: 'googleapis.com'
      } as ServiceAccount;
    }
    // Method 4: Try to use Application Default Credentials (for Google Cloud environments)
    else {
      console.log('[FirebaseAdmin] Attempting to use Application Default Credentials');
      
      app = admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      
      console.log('[FirebaseAdmin] Initialized with Application Default Credentials');
      return app;
    }

    // Initialize with service account credentials
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    
    console.log('[FirebaseAdmin] Initialized successfully');
    return app;

  } catch (error: any) {
    console.error('[FirebaseAdmin] Initialization error:', error.message);
    console.error('[FirebaseAdmin] Stack trace:', error.stack);
    throw error;
  }
}

// Initialize on first import (server-side only)
try {
  if (typeof window === 'undefined') { // Only on server-side
    app = initializeFirebaseAdmin();
    db = admin.firestore(app);
    auth = admin.auth(app);
    
    // Configure Firestore settings
    db.settings({ 
      ignoreUndefinedProperties: true 
    });
    
    console.log('[FirebaseAdmin] Services initialized successfully');
  }
} catch (error) {
  console.error('[FirebaseAdmin] Failed to initialize services:', error);
  // Don't throw here - let it fail when actually used
}

// Export functions that your API routes expect
export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    if (!app) {
      app = initializeFirebaseAdmin();
    }
    db = admin.firestore(app);
    db.settings({ 
      ignoreUndefinedProperties: true 
    });
  }
  return db;
}

export function getAuth(): admin.auth.Auth {
  if (!auth) {
    if (!app) {
      app = initializeFirebaseAdmin();
    }
    auth = admin.auth(app);
  }
  return auth;
}

// Export the admin instance
export { admin };

// Also export the instances directly for compatibility
export const adminDb = db;
export const adminAuth = auth;
export default admin;