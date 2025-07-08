// hooks/useUserContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, Tutor } from './types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';

type AuthUser = Student | Tutor;
type UserType = 'student' | 'tutor' | null;

interface UserContextValue {
  user: AuthUser | null;
  userType: UserType;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from cookies on mount
  useEffect(() => {
    const loadUserFromCookies = async () => {
      try {
        const savedUserType = getCookie('userType') as UserType;
        const savedUserId = getCookie('userId');

        if (savedUserType && savedUserId) {
          // Restore user data from Firestore using the saved ID
          await restoreUserFromFirestore(savedUserType, savedUserId);
        }
      } catch (error) {
        console.error('Error loading user from cookies:', error);
        // Clear invalid cookies
        clearUserCookies();
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromCookies();
  }, []);

  const restoreUserFromFirestore = async (userType: UserType, userId: string) => {
    if (!userType || !userId) return;

    try {
      const collectionName = userType === 'student' ? 'students' : 'tutors';
      const snapshot = await getDocs(
        query(collection(db, collectionName), where('__name__', '==', userId))
      );

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const userData = doc.data();

        if (userType === 'student') {
          const fullStudent: Student = {
            ...userData,
            studentId: doc.id,
          } as Student;
          setUser(fullStudent);
        } else {
          const fullTutor: Tutor = {
            ...userData,
            tutorId: doc.id,
          } as Tutor;
          setUser(fullTutor);
        }
        
        setUserType(userType);
      } else {
        // User document not found, clear cookies
        clearUserCookies();
      }
    } catch (error) {
      console.error('Error restoring user from Firestore:', error);
      clearUserCookies();
    }
  };

  const clearUserCookies = () => {
    deleteCookie('userType');
    deleteCookie('userId');
    deleteCookie('username');
  };

  const login = async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Try student login
      const studentSnapshot = await getDocs(
        query(
          collection(db, 'students'),
          where('username', '==', username),
          where('password', '==', password)
        )
      );

      if (!studentSnapshot.empty) {
        const doc = studentSnapshot.docs[0];
        const studentData = doc.data() as Omit<Student, 'studentId'>;

        const fullStudent: Student = {
          ...studentData,
          studentId: doc.id,
        };

        setUser(fullStudent);
        setUserType('student');
        
        // Save to cookies
        setCookie('userType', 'student');
        setCookie('userId', doc.id);
        setCookie('username', username);
        
        setIsLoading(false);
        return;
      }

      // Try tutor login
      const tutorSnapshot = await getDocs(
        query(
          collection(db, 'tutors'),
          where('username', '==', username),
          where('password', '==', password)
        )
      );

      if (!tutorSnapshot.empty) {
        const doc = tutorSnapshot.docs[0];
        const tutorData = doc.data() as Omit<Tutor, 'tutorId'>;

        const fullTutor: Tutor = {
          ...tutorData,
          tutorId: doc.id,
        };

        setUser(fullTutor);
        setUserType('tutor');
        
        // Save to cookies
        setCookie('userType', 'tutor');
        setCookie('userId', doc.id);
        setCookie('username', username);
        
        setIsLoading(false);
        return;
      }

      // No match
      setError('Invalid username or password.');
      setIsLoading(false);
      throw new Error('Invalid username or password.');
    } catch (error) {
      setError('Invalid username or password.');
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setUserType(null);
    setError(null);
    
    // Clear cookies
    clearUserCookies();
  };

  return (
    <UserContext.Provider value={{ user, userType, login, logout, error, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
  return ctx;
}