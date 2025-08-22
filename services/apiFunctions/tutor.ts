// services/apiFunctions/useTutor.ts
import { collection, query, where, updateDoc, getDocs, getDoc, doc, deleteDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { Booking, Lesson, Student, Tutor } from "../types";
import { useUserContext } from "../userContext";
import { useCallback, useMemo } from "react";

export const useTutor = () => {
  const { user, userType, userProfile } = useUserContext();
  if (userType !== 'tutor' || !user || !userProfile) return null;
  
  // Use the userId from the userProfile instead of tutorId
  const tutorUserId = userProfile.uid;

  const fetchTutor = useCallback(async (tutorId: string): Promise<Tutor | null> => {
    try {
      const docRef = doc(db, "tutors", tutorId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { ...(docSnap.data() as Tutor), tutorId: docSnap.id };
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const fetchTutorBookings = useCallback(async (tutorId: string): Promise<Booking[]> => {
    try {
      const q = query(collection(db, "bookings"), where("tutorId", "==", tutorId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...(d.data() as Booking), bookingId: d.id }));
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const confirmBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        confirmed: true,
        confirmedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw new Error('Failed to confirm booking');
    }
  }, []);

  const deleteBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await deleteDoc(bookingRef);
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw new Error('Failed to delete booking');
    }
  }, []);

  // Updated fetchTutorStudents with better approach
  const fetchTutorStudents = useCallback(async (tutorIdOrUserId: string): Promise<Student[]> => {
    console.log('[useTutor] fetchTutorStudents called with:', tutorIdOrUserId);
    
    if (!tutorIdOrUserId || tutorIdOrUserId.trim() === '') {
      console.log('[useTutor] tutorIdOrUserId is undefined or empty, returning empty array');
      return [];
    }

    try {
      // First, try to find students by tutorIds array containing the tutorId
      let q = query(
        collection(db, "students"),
        where("tutorIds", "array-contains", tutorIdOrUserId)
      );
      let snap = await getDocs(q);
      console.log(`[useTutor] query with tutorId returned ${snap.size} documents`);

      // If no results and we're using a userId format, try finding students assigned to this user
      if (snap.size === 0) {
        console.log('[useTutor] No students found with tutorId, trying with userId approach');
        
        // Fetch all students and filter them
        const allStudentsQuery = query(collection(db, "students"));
        const allStudentsSnap = await getDocs(allStudentsQuery);
        console.log(`[useTutor] Found ${allStudentsSnap.size} total students`);

        const matchingStudents: Student[] = [];
        
        allStudentsSnap.forEach(docSnap => {
          const data = docSnap.data() as Partial<Omit<Student, "studentId">>;
          const student = {
            studentId: docSnap.id,
            ...data,
            subjects: Array.isArray(data.subjects) ? data.subjects : [],
          } as Student;

          // Check if any of the student's subjects has this tutor
          const hasTutorAssigned = student.subjects.some(subject => 
            typeof subject === 'object' && 
            subject.tutorId === tutorIdOrUserId
          );

          // Also check if the tutorIds array contains this tutor (fallback)
          const isInTutorIds = Array.isArray(student.tutorIds) && 
            student.tutorIds.includes(tutorIdOrUserId);

          if (hasTutorAssigned || isInTutorIds) {
            console.log(`[useTutor] Student ${student.studentId} is assigned to tutor`, tutorIdOrUserId);
            matchingStudents.push(student);
          }
        });

        console.log(`[useTutor] Found ${matchingStudents.length} matching students`);
        return matchingStudents;
      }

      // Process the results from the direct query
      const students = snap.docs.map(d => {
        const data = d.data() as Partial<Omit<Student, "studentId">>;
        console.log(`[useTutor] processing student document:`, d.id, data);
        
        return {
          studentId: d.id,
          ...data,
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
        } as Student;
      });

      console.log('[useTutor] returning students:', students);
      return students;
    } catch (err) {
      console.error('[useTutor] Error in fetchTutorStudents:', err);
      return [];
    }
  }, []);

  const fetchTutorLessons = useCallback(async (tutorId: string): Promise<Lesson[]> => {
    try {
      const bookings = await fetchTutorBookings(tutorId);
      const ids = bookings.map(b => b.bookingId);
      if (!ids.length) return [];
      const lessons: Lesson[] = [];
      const chunkSize = 10;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const q = query(collection(db, "lessons"), where("bookingId", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach(d => lessons.push({ ...(d.data() as Lesson), lessonId: d.id }));
      }
      return lessons;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [fetchTutorBookings]);

  return useMemo(() => ({
    fetchTutor,
    fetchTutorBookings,
    fetchTutorStudents,
    fetchTutorLessons,
    confirmBooking,
    deleteBooking,
    tutorUserId, // Expose the tutor's userId for use in components
  }), [
    fetchTutor,
    fetchTutorBookings,
    fetchTutorStudents,
    fetchTutorLessons,
    confirmBooking,
    deleteBooking,
    tutorUserId,
  ]);
};