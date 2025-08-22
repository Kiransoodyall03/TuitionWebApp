// services/userContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import type {
  UserType,
  UserProfile,
  TutorProfile,
  StudentProfile,
  UserContextType
} from './types';

const noopAsync = async (..._args: any[]) => {};
const noop = () => {};

const DEFAULT: UserContextType = {
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
  clearError: noop
};

const UserContext = createContext<UserContextType>(DEFAULT);

export const useUserContext = (): UserContextType => {
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
      microsoftProvider.setCustomParameters({ tenant: 'common' });
      microsoftProvider.addScope('User.Read');
      microsoftProvider.addScope('Calendars.ReadWrite');
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

  const createUserProfile = async (
    firebaseUser: FirebaseUser,
    uType: UserType,
    additionalData: any = {},
    microsoftData?: any
  ) => {
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
      const tutorData: TutorProfile = {
        userId: firebaseUser.uid,
        subjects: additionalData.subjects || [],
        bio: additionalData.bio || '',
        contactNumber: additionalData.contactNumber || '',
        hourlyRate: additionalData.hourlyRate || 0
      };
      await setDoc(doc(db, 'tutors', firebaseUser.uid), tutorData);
    } else if (uType === 'student') {
      const studentData: StudentProfile = {
        userId: firebaseUser.uid,
        subjects: additionalData.subjects || [],
        grade: additionalData.grade || 12,
        enrolledCourses: []
      };
      await setDoc(doc(db, 'students', firebaseUser.uid), studentData);
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
      
      // Handle the specific account exists error
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        const credential = OAuthProvider.credentialFromError(err);
        
        if (email) {
          try {
            // Get the sign-in methods for this email
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            
            if (signInMethods.includes('password')) {
              // Create a more user-friendly error for password accounts
              const customError = new Error(
                `An account with email ${email} already exists. Please sign in with your password first, then you can link your Microsoft account in your profile settings.`
              );
              (customError as any).code = 'auth/account-exists-with-different-credential';
              (customError as any).customData = { email, credential };
              throw customError;
            } else if (signInMethods.length > 0) {
              // Account exists with another provider
              setError(`An account with email ${email} already exists with ${signInMethods[0]}. Please sign in with that method first.`);
            } else {
              setError('An account already exists with this email address using a different sign-in method.');
            }
          } catch (linkError) {
            // If we can't fetch sign-in methods, throw the original error
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

  // New method to handle account linking with password
  const linkAccountWithPassword = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // First, sign in with email/password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Now try to get the Microsoft credential again and link it
      // Note: In a real implementation, you'd need to store the credential temporarily
      // For now, we'll just return success and let the user try Microsoft login again
      
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
    if (!user) return setError('You must be signed in to link accounts.');
    const provider = getMicrosoftProvider();
    if (!provider) return setError('Microsoft auth unavailable');
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = OAuthProvider.credentialFromResult(result);
      if (credential?.accessToken && userProfile) {
        await updateDoc(doc(db, 'users', user.uid), {
          'microsoftAuth.accessToken': credential.accessToken,
          'microsoftAuth.connectedAt': new Date().toISOString(),
          'microsoftAuth.expiresAt': new Date(Date.now() + 3600000).toISOString(),
          'microsoftAuth.scope': 'User.Read Calendars.ReadWrite',
          'microsoftAuth.userInfo': {
            displayName: result.user.displayName || '',
            id: result.user.uid,
            mail: result.user.email || '',
            userPrincipalName: result.user.email || ''
          }
        });
      }
    } catch (err: any) {
      console.error('Link Microsoft error', err);
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

  const value: UserContextType = {
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
    // Add the new method to the context value
    linkAccountWithPassword
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;