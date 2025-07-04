export interface User {
    userId: string;
    username: string;
    password: string;
    role: 'tutor' | 'student';
}

export interface Booking{
    bookingId: string;
    tutorId: string;
    studentId: string;
    date: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
    }
    subject: string;
    extraDetails: string;
    confirmed: boolean;
}

export interface Lesson {
    lessonId: string;
    bookingId: string;
    notes: string;
    isCompleted: boolean;
    date: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
    }
    lessonStatus: 'completed' | 'cancelled' | 'student did not join' | 'tutor did not join';
}

export interface Tutor {
    tutorId: string;
    contactNumber: string;
    profilePicture?: string;
    subjects: string[];
    bio: string;
}

export interface Student {
    studentId: string;
    username: string;
    grade: string;
    email?: string;
    password: string;
    contactNumber?: string;
    subjects: [
        {
            subjectName: string;
            tutorId: string;
            currentMark: number;
            targetMark: number;
        }
    ];
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
    }
    paidAmount: number;
}
