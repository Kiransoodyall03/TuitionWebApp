import { collection, query, where, getDocs, doc, getDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useUserContext } from "../userContext";
import { Booking, Lesson, Student } from "../types";
import { useCallback } from "react";

export const useStudent = () => {
    const { user, userType } = useUserContext();
    if (userType !== 'student' || !user) return null;
    const student = user as Student;
    const studentIdFromContext = student.studentId;

    const fetchStudent = useCallback(async (studentId: string): Promise<Student | null> => {
        try {
            const docRef = doc(db, "students", studentId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return null;
            return { ...(docSnap.data() as Student), studentId: docSnap.id };
        } catch (err) {
            console.error(err);
            return null;
        }
    }, []);

    const fetchStudentBookings = useCallback(async (studentId: string): Promise<Booking[]> => {
        try {
            const q = query(collection(db, "bookings"), where("studentId", "==", studentId));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ ...(d.data() as Booking), bookingId: d.id }));
        } catch (err) {
            console.error(err);
            return [];
        }
    }, []);

    const fetchStudentLessons = useCallback(async (studentId: string): Promise<Lesson[]> => {
    try {
        const bookings = await fetchStudentBookings(studentId); // You must have this defined elsewhere
        console.log('Bookings:', bookings);
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
    }, [fetchStudentBookings]);

    return {
        fetchStudentBookings,
        fetchStudentLessons,
    };
}