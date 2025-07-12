// services/apiFunctions/useTutor.ts
import { collection, query, where, getDocs, getDoc, doc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { Booking, Lesson, Student, Tutor } from "../types";
import { useUserContext } from "../userContext";
import { useCallback, useMemo } from "react";

export const useTutor = () => {
  const { user, userType } = useUserContext();
  if (userType !== 'tutor' || !user) return null;
  const tutor = user as Tutor;
  const tutorIdFromContext = tutor.tutorId;

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

// services/apiFunctions/useTutor.ts
const fetchTutorStudents = useCallback(async (tutorId: string): Promise<Student[]> => {
  console.log('[useTutor] fetchTutorStudents called with:', tutorId);
  try {
    const q = query(
      collection(db, "students"),
      where("tutorIds", "array-contains", tutorId)
    );
    const snap = await getDocs(q);
    console.log(`[useTutor] query returned ${snap.size} documents`);

    return snap.docs.map(d => {
      // grab raw data
      const data = d.data() as Partial<Omit<Student, "studentId">>;
      return {
        studentId: d.id,
        // copy everything else...
        ...data,
        // but GUARANTEE `subjects` is an array
        subjects: Array.isArray(data.subjects) 
          ? data.subjects 
          : [],
      } as Student;
    });
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

  // Bundle into a stable object
  return useMemo(() => ({
    fetchTutor,
    fetchTutorBookings,
    fetchTutorStudents,
    fetchTutorLessons,
  }), [
    fetchTutor,
    fetchTutorBookings,
    fetchTutorStudents,
    fetchTutorLessons,
  ]);
};
