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
    extraDetails: string;
    confirmed: boolean;
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
    username: string;     // Added for authentication
    password: string;     // Added for authentication
    role: 'tutor';        // Added for role identification
    contactNumber: string;
    profilePicture?: string;
    subjects: string[];
    bio: string;
}

export interface Student {
    studentId: string;
    username: string;
    password: string;
    role: 'student';      // Added for role identification
    grade: string;
    email?: string;
    contactNumber?: string;
    subjects: {           
        subjectName: string;
        tutorId: string;
        currentMark: number;
        targetMark: number;
    }[];
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