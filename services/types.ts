// types.ts - Centralized type definitions
import { User } from 'firebase/auth';

export type UserType = 'tutor' | 'student';

// ==================== USER PROFILES ====================

// Base Firebase User Profile (common fields for all users)
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userType: UserType;
  createdAt: any;
  lastLoginAt: any;
  profilePicture?: string;
  microsoftAuth?: {
    accessToken: string;
    refreshToken?: string;
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

// Subject Progress for Students
export interface SubjectProgress {
  subjectName: string;
  currentMark: number;
  targetMark: number;
  tutorId: string;
}

// Student Profile - extends UserProfile
export interface StudentProfile extends UserProfile {
  userType: 'student';
  
  // Academic information
  grade: number;
  subjects: SubjectProgress[];
  tutorIds: string[];
  
  // Parent/Guardian information
  parentId?: string;
  parentName: string;
  parentEmail: string;
  parentContactNumber?: string;
  
  // Account management
  tokens: number;
  
  // Optional fields
  school?: string;
  notes?: string;
}

// Tutor Profile - extends UserProfile
export interface TutorProfile extends UserProfile {
  userType: 'tutor';
  
  // Teaching information
  subjects: string[];
  bio: string;
  hourlyRate: number;
  contactNumber: string;
  
  // Students and availability
  studentIds: string[];
  availability?: any; // You can define a proper AvailabilitySlot interface later
  
  // Ratings (optional)
  rating?: number;
  reviewCount?: number;
  
  // Optional fields
  qualifications?: string[];
  experience?: string;
  location?: string;
}

// For backward compatibility and gradual migration
export type Student = StudentProfile;
export type Tutor = TutorProfile;

// ==================== APPLICATION ENTITIES ====================

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
  teamsJoinUrl?: string;
  teamsMeetingId?: string;
  calendarEventId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  confirmedAt?: string;
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

// ==================== TYPE GUARDS ====================

// Union type for authenticated user profiles
export type AuthenticatedUserProfile = StudentProfile | TutorProfile;

// Type guards
export function isStudent(user: AuthenticatedUserProfile | UserProfile): user is StudentProfile {
  return user.userType === 'student';
}

export function isTutor(user: AuthenticatedUserProfile | UserProfile): user is TutorProfile {
  return user.userType === 'tutor';
}

// ==================== CONTEXT TYPES ====================

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