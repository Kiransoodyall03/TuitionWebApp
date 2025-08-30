// types.ts - Centralized type definitions
import { User } from 'firebase/auth';

export type UserType = 'tutor' | 'student';

// Firebase-based User Profiles (for userContext)
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userType: UserType;
  createdAt: any;
  lastLoginAt: any;
  microsoftAuth?: {
    accessToken: string;
    connectedAt: string;
    expiresAt: string;
    refreshToken?: string;
    scope: string;
    userInfo: {
      displayName: string;
      id: string;
      mail: string;
      userPrincipalName: string;
    };
  };
}

export interface TutorProfile {
  userId: string;
  bio?: string;
  contactNumber?: string;
  subjects: string[];
  hourlyRate?: number;
  availability?: any;
}

// Update this in your types.ts file

export interface StudentProfile {
  userId: string;
  grade?: number;
  subjects: Array<{
    subjectName: string;
    tutorId: string;
    currentMark: number;
    targetMark: number;
  } | string>; // Allow both string and object formats during migration
  preferences?: any;
  enrolledCourses?: string[];
}

// Application-specific interfaces
export interface Booking {
  bookingId: string;
  tutorId: string;
  studentId: string;
  date: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  subject: string;
  durationMinutes?: number;
  extraDetails: string;
  confirmed: boolean;
  meetingLink?: string;
}

export interface Lesson {
  lessonId: string;
  bookingId: string;
  notes: string;
  date: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  lessonStatus: 'completed' | 'cancelled' | 'student did not join' | 'tutor did not join' | 'scheduled';
}

export interface Tutor {
  tutorId: string;
  username: string;
  password: string;
  role: 'tutor';
  contactNumber: string;
  profilePicture?: string;
  subjects: string[];
  bio: string;
  studentIds: string[];
  microsoftAuth?: {
    accessToken: string;
    refreshToken: string | null;
    connectedAt: string;
    expiresAt: string;
    scope: string;
    userInfo: {
      id: string;
      displayName: string;
      mail: string;
      userPrincipalName: string;
    };
  };
}

export interface Student {
  studentId: string;
  username: string;
  password: string;
  role: 'student';
  grade: string;
  email?: string;
  contactNumber?: string;
  subjects: {
    subjectName: string;
    tutorId: string;
    currentMark: number;
    targetMark: number;
  }[];
  tutorIds: string[];
  parentId: string;
  parentName: string;
  parentContactNumber: string;
  parentEmail: string;
  tokens: number;
}

export interface TokenPurchase {
  purchaseId: string;
  studentId: string;
  tokensPurchased: number;
  purchaseDate: {
    year: number;
    month: number;
    day: number;
  };
  paidAmount: number;
}

// Union type for authenticated users
export type AuthenticatedUser = Student | Tutor;

// Type guards
export function isStudent(user: AuthenticatedUser): user is Student {
  return user.role === 'student';
}

export function isTutor(user: AuthenticatedUser): user is Tutor {
  return user.role === 'tutor';
}

// User Context Type
export interface UserContextType {
  user: User | null;
  userProfile: UserProfile | null;
  tutorProfile: TutorProfile | null;
  studentProfile: StudentProfile | null;
  userType: UserType | null;
  error: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  register: (email: string, password: string, userType: UserType, additionalData?: any) => Promise<void>;
  linkEmailToAccount: (email: string, password: string) => Promise<void>;
  linkMicrosoftToAccount: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateTutorProfile: (data: Partial<TutorProfile>) => Promise<void>;
  updateStudentProfile: (data: Partial<StudentProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
    linkAccountWithPassword?: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
}