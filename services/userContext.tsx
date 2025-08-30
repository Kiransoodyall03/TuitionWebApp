// services/userContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import type {
  UserType,
  UserProfile,
  TutorProfile,
  StudentProfile,
  UserContextType,
  Student,
  Booking,
  Lesson
} from './types';
import { getRedirectResult } from 'firebase/auth';

const noopAsync = async (..._args: any[]) => {};
const noop = () => {};

// Updated UserContextType interface (add to types.ts)
interface ExtendedUserContextType extends UserContextType {
  createBooking: (payload: Booking & { durationMinutes?: number }) => Promise<Booking>;
  convertBookingToLesson: (booking: Booking) => Promise<Lesson | null>;
}

const DEFAULT: ExtendedUserContextType = {
  user: null,
  userProfile: null,
  tutorProfile: null,
  studentProfile: null,
  userType: null,
  error: null,
  isLoading: true,
  login: noopAsync,
  loginWithMicrosoft: noopAsync,
  register: noopAsync,
  linkEmailToAccount: noopAsync,
  linkMicrosoftToAccount: noopAsync,
  updateUserProfile: noopAsync,
  updateTutorProfile: noopAsync,
  updateStudentProfile: noopAsync,
  signOut: noopAsync,
  clearError: noop,
  createBooking: noopAsync as any,
  convertBookingToLesson: noopAsync as any
};

const UserContext = createContext<ExtendedUserContextType>(DEFAULT);

export const useUserContext = (): ExtendedUserContextType => {
  return useContext(UserContext);
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getMicrosoftProvider = () => {
    try {
      const microsoftProvider = new OAuthProvider('microsoft.com');
      
      microsoftProvider.setCustomParameters({
        tenant: 'common',
        prompt: 'consent',
        access_type: 'offline'
      });
      microsoftProvider.addScope('User.Read');
      microsoftProvider.addScope('Calendars.ReadWrite');
      microsoftProvider.addScope('OnlineMeetings.ReadWrite');
      microsoftProvider.addScope('offline_access');
      return microsoftProvider;
    } catch (err) {
      console.error('Failed to init Microsoft provider', err);
      return null;
    }
  };

  const clearUserData = () => {
    setUserProfile(null);
    setTutorProfile(null);
    setStudentProfile(null);
    setUserType(null);
  };

  useEffect(() => {
  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('[UserContext] Redirect result received');
        
        const credential = OAuthProvider.credentialFromResult(result);
        
        if (credential?.accessToken) {
          console.log('[UserContext] Processing Microsoft credentials from redirect');
          
          // Get Microsoft user info
          const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${credential.accessToken}`
            }
          });
          
          let microsoftUserInfo = {
            displayName: result.user.displayName || '',
            id: '',
            mail: result.user.email || '',
            userPrincipalName: result.user.email || ''
          };
          
          if (graphResponse.ok) {
            const graphData = await graphResponse.json();
            microsoftUserInfo = {
              displayName: graphData.displayName || result.user.displayName || '',
              id: graphData.id || '',
              mail: graphData.mail || graphData.userPrincipalName || result.user.email || '',
              userPrincipalName: graphData.userPrincipalName || result.user.email || ''
            };
          }
          
          // Update the user document with Microsoft auth data
          const updateData = {
            'microsoftAuth': {
              accessToken: credential.accessToken,
              refreshToken: (credential as any).refreshToken || null,
              connectedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite offline_access',
              userInfo: microsoftUserInfo
            }
          };
          
          // Update in Firestore
          await updateDoc(doc(db, 'users', result.user.uid), updateData);
          
          // Update local state
          if (userProfile && userProfile.uid === result.user.uid) {
            setUserProfile(prev => prev ? { ...prev, microsoftAuth: updateData.microsoftAuth } : null);
          }
          
          console.log('[UserContext] Microsoft account successfully linked via redirect');
          setError(null);
        }
      }
    } catch (error: any) {
      console.error('[UserContext] Error handling redirect result:', error);
      
      // Only set error if it's not a "no redirect result" error
      if (error.code && error.code !== 'auth/no-auth-event') {
        setError(error.message || 'Failed to complete Microsoft sign-in');
      }
    }
  };
  
  // Check for redirect result on component mount
  handleRedirectResult();
}, []); // Run once on mount

  const loadTutorProfile = async (uid: string) => {
    try {
      const tutorDoc = await getDoc(doc(db, 'tutors', uid));
      if (tutorDoc.exists()) setTutorProfile(tutorDoc.data() as TutorProfile);
    } catch (err) {
      console.error('Error loading tutor profile', err);
    }
  };

  const loadStudentProfile = async (uid: string) => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', uid));
      if (studentDoc.exists()) setStudentProfile(studentDoc.data() as StudentProfile);
    } catch (err) {
      console.error('Error loading student profile', err);
    }
  };

  const loadUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setUserProfile(data);
        setUserType(data.userType);
        await updateDoc(doc(db, 'users', uid), { lastLoginAt: serverTimestamp() });
        if (data.userType === 'tutor') await loadTutorProfile(uid);
        if (data.userType === 'student') await loadStudentProfile(uid);
      } else {
        setError('User profile not found.');
      }
    } catch (err) {
      console.error('Error loading user profile', err);
      setError('Failed to load user profile');
    }
  };

// Update this function in your userContext.tsx

const createUserProfile = async (
  firebaseUser: FirebaseUser,
  uType: UserType,
  additionalData: any = {},
  microsoftData?: any
) => {
  // Create the main user profile document
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || additionalData.displayName || '',
    userType: uType,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    ...(microsoftData ? { microsoftAuth: microsoftData } : {})
  };
  await setDoc(doc(db, 'users', firebaseUser.uid), profile);

  if (uType === 'tutor') {
    // Create tutor profile
    const tutorData: TutorProfile = {
      userId: firebaseUser.uid,
      subjects: additionalData.subjects || [],
      bio: additionalData.bio || '',
      contactNumber: additionalData.contactNumber || '',
      hourlyRate: additionalData.hourlyRate || 0
    };
    await setDoc(doc(db, 'tutors', firebaseUser.uid), tutorData);
    
  } else if (uType === 'student') {
    // Create student profile with proper structure
    const studentData: StudentProfile = {
      userId: firebaseUser.uid,
      subjects: additionalData.subjects || [], // This will be the array of SubjectWithDetails objects
      grade: additionalData.grade || 12,
      enrolledCourses: additionalData.enrolledCourses || []
    };
    
    // Store in StudentProfile collection (simpler structure)
    await setDoc(doc(db, 'students', firebaseUser.uid), studentData);
    
    // If you also need the full Student structure (from types.ts), create it too
    // This seems to be used in other parts of your app
    if (additionalData.parentName) {
      const fullStudentData: Partial<Student> = {
        studentId: firebaseUser.uid,
        username: additionalData.displayName || firebaseUser.email || '',
        password: '', // Don't store passwords in Firestore
        role: 'student',
        grade: String(additionalData.grade || 12),
        email: firebaseUser.email || '',
        contactNumber: additionalData.contactNumber || '',
        subjects: additionalData.subjects || [], // Array of objects with subjectName, tutorId, currentMark, targetMark
        tutorIds: additionalData.tutorIds || [],
        parentId: additionalData.parentId || '',
        parentName: additionalData.parentName || '',
        parentContactNumber: additionalData.parentContactNumber || '',
        parentEmail: additionalData.parentEmail || '',
        tokens: additionalData.tokens || 0
      };
      
      // You might want to store this in a separate collection or merge with the students collection
      // Depending on your app's architecture
      await updateDoc(doc(db, 'students', firebaseUser.uid), fullStudentData);
    }
  }
};
  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithMicrosoft = async () => {
    const provider = getMicrosoftProvider();
    if (!provider) return setError('Microsoft auth unavailable');
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = OAuthProvider.credentialFromResult(result);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        await result.user.delete();
        setError('New Microsoft account detected. Please register first.');
        return;
      } else {
        if (credential?.accessToken) {
          await updateDoc(doc(db, 'users', result.user.uid), {
            'microsoftAuth.accessToken': credential.accessToken,
            'microsoftAuth.connectedAt': new Date().toISOString(),
            'microsoftAuth.expiresAt': new Date(Date.now() + 3600000).toISOString(),
            lastLoginAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      console.error('Microsoft login error', err);
      
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        const credential = OAuthProvider.credentialFromError(err);
        
        if (email) {
          try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            
            if (signInMethods.includes('password')) {
              const customError = new Error(
                `An account with email ${email} already exists. Please sign in with your password first, then you can link your Microsoft account in your profile settings.`
              );
              (customError as any).code = 'auth/account-exists-with-different-credential';
              (customError as any).customData = { email, credential };
              throw customError;
            } else if (signInMethods.length > 0) {
              setError(`An account with email ${email} already exists with ${signInMethods[0]}. Please sign in with that method first.`);
            } else {
              setError('An account already exists with this email address using a different sign-in method.');
            }
          } catch (linkError) {
            throw err;
          }
        } else {
          setError('An account already exists with this email address using a different sign-in method.');
        }
      } else {
        setError(err.message || 'Microsoft sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const linkAccountWithPassword = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setError(null);
      return { success: true, message: 'Account ready for linking. Please try Microsoft sign-in again.' };
    } catch (err: any) {
      console.error('Link account error', err);
      setError('Failed to link accounts. Please check your password and try again.');
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, uType: UserType, additionalData: any = {}) => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(cred.user, uType, additionalData);
    } catch (err: any) {
      console.error('Registration error', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const linkEmailToAccount = async (email: string, password: string) => {
    if (!user) return setError('You must be signed in to link accounts.');
    setError(null);
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
    } catch (err: any) {
      console.error('Link email error', err);
      setError(err.message || 'Failed to link email');
    } finally {
      setIsLoading(false);
    }
  };

  const linkMicrosoftToAccount = async () => {
    if (!user) {
      setError('You must be signed in to link accounts.');
      return;
    }
    
    const provider = getMicrosoftProvider();
    if (!provider) {
      setError('Microsoft auth unavailable');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      console.log('[linkMicrosoftToAccount] Starting Microsoft account linking...');
      
      // Ensure user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('[linkMicrosoftToAccount] Creating user document...');
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          userType: userType || 'tutor',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }
      
      let result;
      let credential;
      
      try {
        // Try linking with popup
        result = await linkWithPopup(user, provider);
        credential = OAuthProvider.credentialFromResult(result);
        console.log('[linkMicrosoftToAccount] Successfully linked new Microsoft account');
      } catch (linkError: any) {
        console.log('[linkMicrosoftToAccount] Link error:', linkError.code);
        
        if (linkError.code === 'auth/credential-already-in-use' || 
            linkError.code === 'auth/account-exists-with-different-credential' ||
            linkError.code === 'auth/provider-already-linked') {
          // Try signing in with popup instead
          try {
            result = await signInWithPopup(auth, provider);
            credential = OAuthProvider.credentialFromResult(result);
            console.log('[linkMicrosoftToAccount] Signed in with Microsoft account');
          } catch (signInError: any) {
            console.error('[linkMicrosoftToAccount] Sign-in error:', signInError);
            throw signInError;
          }
        } else {
          throw linkError;
        }
      }
      
      if (credential?.accessToken && result) {
        console.log('[linkMicrosoftToAccount] Got access token, exchanging for refresh token...');
        
        // IMPORTANT: Exchange the access token for a refresh token via our API
        try {
          const exchangeResponse = await fetch('/api/auth/exchange-microsoft-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              accessToken: credential.accessToken,
              email: result.user.email,
              displayName: result.user.displayName
            })
          });
          
          if (exchangeResponse.ok) {
            const exchangeData = await exchangeResponse.json();
            console.log('[linkMicrosoftToAccount] Successfully got refresh token from exchange');
            
            // Update local state with the refresh token
            if (exchangeData.microsoftAuth) {
              setUserProfile(prev => prev ? { 
                ...prev, 
                microsoftAuth: exchangeData.microsoftAuth 
              } : null);
            }
            
            setError(null);
          } else {
            // Fallback: Store what we have (access token only)
            console.warn('[linkMicrosoftToAccount] Token exchange failed, storing access token only');
            
            const microsoftAuth = {
              accessToken: credential.accessToken,
              refreshToken: null,
              connectedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite',
              userInfo: {
                displayName: result.user.displayName || '',
                id: result.user.uid,
                mail: result.user.email || '',
                userPrincipalName: result.user.email || ''
              }
            };
            
            await updateDoc(doc(db, 'users', user.uid), { microsoftAuth });
            setUserProfile(prev => prev ? { ...prev, microsoftAuth } : null);
          }
        } catch (exchangeError) {
          console.error('[linkMicrosoftToAccount] Exchange error:', exchangeError);
          // Still save what we have
          const microsoftAuth = {
            accessToken: credential.accessToken,
            refreshToken: null,
            connectedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            scope: 'User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite',
            userInfo: {
              displayName: result.user.displayName || '',
              id: result.user.uid,
              mail: result.user.email || '',
              userPrincipalName: result.user.email || ''
            }
          };
          
          await updateDoc(doc(db, 'users', user.uid), { microsoftAuth });
          setUserProfile(prev => prev ? { ...prev, microsoftAuth } : null);
        }
      }
    } catch (err: any) {
      console.error('[linkMicrosoftToAccount] Error:', err);
      setError(err.message || 'Failed to link Microsoft account');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error('Update user profile error', err);
      setError('Failed to update profile');
    }
  };

  const updateTutorProfile = async (data: Partial<TutorProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'tutors', user.uid), data);
      setTutorProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error('Update tutor profile error', err);
      setError('Failed to update tutor profile');
    }
  };

  const updateStudentProfile = async (data: Partial<StudentProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'students', user.uid), data);
      setStudentProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error('Update student profile error', err);
      setError('Failed to update student profile');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      clearUserData();
    } catch (err) {
      console.error('Sign out error', err);
      setError('Failed to sign out.');
    }
  };

  // Booking-related functions
  const createBooking = async (payload: Booking & { durationMinutes?: number }): Promise<Booking> => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = `Request failed: ${res.status}`;
      try {
        const txt = await res.text();
        msg = txt || msg;
      } catch {}
      throw new Error(msg);
    }

    const json = await res.json();
    const returned: Booking = (json?.booking ?? json) as Booking;
    return returned;
  };

  const convertBookingToLesson = async (booking: Booking): Promise<Lesson | null> => {
    if (!booking.confirmed) {
      console.warn("Booking not confirmed. Lesson will not be created.");
      return null;
    }

    try {
      const lessonsCollection = collection(db, "lessons");

      const newLesson: Omit<Lesson, "lessonId"> = {
        bookingId: booking.bookingId,
        date: booking.date,
        notes: "",
        lessonStatus: "scheduled",
      };

      const docRef = await addDoc(lessonsCollection, newLesson);

      const createdLesson: Lesson = {
        ...newLesson,
        lessonId: docRef.id,
      };

      console.log("Lesson created from booking:", createdLesson);
      return createdLesson;

    } catch (error) {
      console.error("Error converting booking to lesson:", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          await loadUserProfile(firebaseUser.uid);
        } else {
          clearUserData();
        }
      } catch (err) {
        console.error('Error in auth state change', err);
        setError('Authentication error occurred');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value: ExtendedUserContextType = {
    user,
    userProfile,
    tutorProfile,
    studentProfile,
    userType,
    error,
    isLoading,
    login,
    loginWithMicrosoft,
    register,
    linkEmailToAccount,
    linkMicrosoftToAccount,
    updateUserProfile,
    updateTutorProfile,
    updateStudentProfile,
    signOut,
    clearError,
    linkAccountWithPassword,
    // Booking functions
    createBooking,
    convertBookingToLesson
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
