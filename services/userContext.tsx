// hooks/useUserContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
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
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [error, setError] = useState<string | null>(null);

const login = async (username: string, password: string) => {
  setError(null);

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
      studentId: doc.id, // Include the auto-generated document ID
    };

    setUser(fullStudent);
    setUserType('student');
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
      tutorId: doc.id, // Include the auto-generated document ID
    };

    setUser(fullTutor);
    setUserType('tutor');
    return;
  }

  // No match
  setError('Invalid username or password.');
  throw new Error('Invalid username or password.');
};

  const logout = () => {
    setUser(null);
    setUserType(null);
    setError(null);
  };

  return (
    <UserContext.Provider value={{ user, userType, login, logout, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
  return ctx;
}
