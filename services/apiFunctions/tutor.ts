// services/apiFunctions/tutor.ts
import { useCallback, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUserContext } from '../userContext';
import { Booking, StudentProfile, TutorProfile } from '../types';

interface TutorStatistics {
  totalEarnings: number;
  totalHours: number;
  totalStudents: number;
}

interface WeeklyStatistics {
  weeklyEarnings: number;
  weeklyHours: number;
  weeklyLessons: number;
}

export const useTutor = () => {
  const { userProfile, tutorProfile, userType } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tutorUserId = userProfile?.uid;
  const isTutor = userType === 'tutor';

  /**
   * Helper function to get start and end of current week (Monday to Sunday)
   */
  const getCurrentWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    
    // Calculate days to subtract to get to Monday (day 1)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(now.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  /**
   * Helper function to check if a booking is in the current week
   */
  const isBookingInCurrentWeek = (booking: Booking): boolean => {
    const { start, end } = getCurrentWeekRange();
    const bookingDate = new Date(
      booking.date.year,
      booking.date.month - 1,
      booking.date.day,
      booking.date.hour,
      booking.date.minute
    );
    
    return bookingDate >= start && bookingDate <= end;
  };

  const fetchTutorBookings = useCallback(async (tutorId?: string): Promise<Booking[]> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID provided for fetchTutorBookings');
      setError('Tutor ID is required');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('tutorId', '==', searchId));
      const querySnapshot = await getDocs(q);
      
      const bookings: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ ...doc.data(), bookingId: doc.id } as Booking);
      });
      
      return bookings;
    } catch (err: any) {
      console.error('[useTutor] Error fetching bookings:', err);
      setError(err.message || 'Failed to fetch bookings');
      return [];
    } finally {
      setLoading(false);
    }
  }, [tutorUserId]);

  const fetchTutorStudents = useCallback(async (tutorId?: string): Promise<StudentProfile[]> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID provided for fetchTutorStudents');
      setError('Tutor ID is required');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('tutorId', '==', searchId));
      const bookingsSnapshot = await getDocs(q);
      
      const studentIds = new Set<string>();
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        if (booking.studentId) {
          studentIds.add(booking.studentId);
        }
      });

      if (studentIds.size === 0) {
        return [];
      }

      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      const students: StudentProfile[] = [];
      studentsSnapshot.forEach((doc) => {
        if (studentIds.has(doc.id)) {
          students.push({ 
            ...doc.data(), 
            uid: doc.id  // Changed from userId to uid to match new types
          } as StudentProfile);
        }
      });
      
      return students;
    } catch (err: any) {
      console.error('[useTutor] Error fetching students:', err);
      setError(err.message || 'Failed to fetch students');
      return [];
    } finally {
      setLoading(false);
    }
  }, [tutorUserId]);

  // ============ WEEKLY STATISTICS (For Dashboard) ============

  /**
   * Calculate weekly earnings from confirmed lessons in current week
   */
  const calculateWeeklyEarnings = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateWeeklyEarnings');
      return 0;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('tutorId', '==', searchId),
        where('confirmed', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      let weeklyLessonsCount = 0;
      querySnapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        if (isBookingInCurrentWeek(booking)) {
          weeklyLessonsCount++;
        }
      });
      
      const hourlyRate = tutorProfile?.hourlyRate || 0;
      const weeklyEarnings = weeklyLessonsCount * hourlyRate;
      
      console.log('[useTutor] Weekly earnings calculated:', {
        weeklyLessons: weeklyLessonsCount,
        hourlyRate,
        weeklyEarnings
      });
      
      return weeklyEarnings;
    } catch (err: any) {
      console.error('[useTutor] Error calculating weekly earnings:', err);
      return 0;
    }
  }, [tutorUserId, tutorProfile?.hourlyRate]);

  /**
   * Calculate weekly hours of confirmed lessons in current week
   */
  const calculateWeeklyHours = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateWeeklyHours');
      return 0;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('tutorId', '==', searchId),
        where('confirmed', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      let weeklyMinutes = 0;
      querySnapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        if (isBookingInCurrentWeek(booking)) {
          const duration = booking.durationMinutes || 60;
          weeklyMinutes += duration;
        }
      });
      
      const weeklyHours = weeklyMinutes / 60;
      
      console.log('[useTutor] Weekly hours calculated:', {
        weeklyMinutes,
        weeklyHours
      });
      
      return weeklyHours;
    } catch (err: any) {
      console.error('[useTutor] Error calculating weekly hours:', err);
      return 0;
    }
  }, [tutorUserId]);

  /**
   * Calculate number of lessons scheduled for current week
   */
  const calculateWeeklyLessons = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateWeeklyLessons');
      return 0;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('tutorId', '==', searchId));
      const querySnapshot = await getDocs(q);
      
      let weeklyLessonsCount = 0;
      querySnapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        if (isBookingInCurrentWeek(booking)) {
          weeklyLessonsCount++;
        }
      });
      
      console.log('[useTutor] Weekly lessons calculated:', weeklyLessonsCount);
      
      return weeklyLessonsCount;
    } catch (err: any) {
      console.error('[useTutor] Error calculating weekly lessons:', err);
      return 0;
    }
  }, [tutorUserId]);

  /**
   * Fetch all weekly statistics at once
   */
  const fetchWeeklyStatistics = useCallback(async (tutorId?: string): Promise<WeeklyStatistics> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for fetchWeeklyStatistics');
      return { weeklyEarnings: 0, weeklyHours: 0, weeklyLessons: 0 };
    }

    setLoading(true);
    setError(null);

    try {
      const [weeklyEarnings, weeklyHours, weeklyLessons] = await Promise.all([
        calculateWeeklyEarnings(searchId),
        calculateWeeklyHours(searchId),
        calculateWeeklyLessons(searchId)
      ]);

      const statistics: WeeklyStatistics = {
        weeklyEarnings,
        weeklyHours,
        weeklyLessons
      };

      console.log('[useTutor] Weekly statistics fetched:', statistics);
      
      return statistics;
    } catch (err: any) {
      console.error('[useTutor] Error fetching weekly statistics:', err);
      setError(err.message || 'Failed to fetch weekly statistics');
      return { weeklyEarnings: 0, weeklyHours: 0, weeklyLessons: 0 };
    } finally {
      setLoading(false);
    }
  }, [tutorUserId, calculateWeeklyEarnings, calculateWeeklyHours, calculateWeeklyLessons]);

  // ============ TOTAL STATISTICS (For Profile Page) ============

  /**
   * Calculate total earnings from ALL confirmed lessons
   */
  const calculateTotalEarnings = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateTotalEarnings');
      return 0;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef, 
        where('tutorId', '==', searchId),
        where('confirmed', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      const confirmedLessonsCount = querySnapshot.size;
      const hourlyRate = tutorProfile?.hourlyRate || 0;
      const totalEarnings = confirmedLessonsCount * hourlyRate;
      
      console.log('[useTutor] Total earnings calculated:', {
        confirmedLessons: confirmedLessonsCount,
        hourlyRate,
        totalEarnings
      });
      
      return totalEarnings;
    } catch (err: any) {
      console.error('[useTutor] Error calculating total earnings:', err);
      return 0;
    }
  }, [tutorUserId, tutorProfile?.hourlyRate]);

  /**
   * Calculate total hours of ALL confirmed lessons
   */
  const calculateTotalHours = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateTotalHours');
      return 0;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('tutorId', '==', searchId),
        where('confirmed', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      let totalMinutes = 0;
      querySnapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        const duration = booking.durationMinutes || 60;
        totalMinutes += duration;
      });
      
      const totalHours = totalMinutes / 60;
      
      console.log('[useTutor] Total hours calculated:', {
        totalMinutes,
        totalHours
      });
      
      return totalHours;
    } catch (err: any) {
      console.error('[useTutor] Error calculating total hours:', err);
      return 0;
    }
  }, [tutorUserId]);

  /**
   * Calculate total number of students from the tutor's studentIds array
   */
  const calculateTotalStudents = useCallback(async (tutorId?: string): Promise<number> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for calculateTotalStudents');
      return 0;
    }

    try {
      // Get the tutor document directly
      const tutorRef = doc(db, 'tutors', searchId);
      const tutorDoc = await getDoc(tutorRef);
      
      if (!tutorDoc.exists()) {
        console.log('[useTutor] Tutor document not found');
        return 0;
      }
      
      const tutorData = tutorDoc.data() as TutorProfile;
      const studentIds = tutorData.studentIds || [];
      
      // Return the count of studentIds array
      const totalStudents = Array.isArray(studentIds) ? studentIds.length : 0;
      
      console.log('[useTutor] Total students from studentIds array:', totalStudents);
      
      return totalStudents;
    } catch (err: any) {
      console.error('[useTutor] Error calculating total students:', err);
      return 0;
    }
  }, [tutorUserId]);

  /**
   * Fetch all total statistics at once (for profile page)
   */
  const fetchTotalStatistics = useCallback(async (tutorId?: string): Promise<TutorStatistics> => {
    const searchId = tutorId || tutorUserId;
    
    if (!searchId) {
      console.error('[useTutor] No tutor ID for fetchTotalStatistics');
      return { totalEarnings: 0, totalHours: 0, totalStudents: 0 };
    }

    setLoading(true);
    setError(null);

    try {
      const [totalEarnings, totalHours, totalStudents] = await Promise.all([
        calculateTotalEarnings(searchId),
        calculateTotalHours(searchId),
        calculateTotalStudents(searchId)
      ]);

      const statistics: TutorStatistics = {
        totalEarnings,
        totalHours,
        totalStudents
      };

      console.log('[useTutor] Total statistics fetched:', statistics);
      
      return statistics;
    } catch (err: any) {
      console.error('[useTutor] Error fetching total statistics:', err);
      setError(err.message || 'Failed to fetch total statistics');
      return { totalEarnings: 0, totalHours: 0, totalStudents: 0 };
    } finally {
      setLoading(false);
    }
  }, [tutorUserId, calculateTotalEarnings, calculateTotalHours, calculateTotalStudents]);

  return {
    tutorUserId,
    tutorProfile,
    fetchTutorBookings,
    fetchTutorStudents,
    
    // Weekly statistics (for dashboard)
    calculateWeeklyEarnings,
    calculateWeeklyHours,
    calculateWeeklyLessons,
    fetchWeeklyStatistics,
    
    // Total statistics (for profile)
    calculateTotalEarnings,
    calculateTotalHours,
    calculateTotalStudents,
    fetchTotalStatistics,
    
    // Deprecated - kept for backward compatibility
    fetchTutorStatistics: fetchTotalStatistics,
    
    loading,
    error,
    isTutor,
  };
};