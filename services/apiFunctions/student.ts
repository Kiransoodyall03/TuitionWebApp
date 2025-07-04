import { collection, query, where, getDocs } from "@firebase/firestore";
import { db } from "../firebase/config";
import { Booking, Lesson } from "../types";

export const useStudent = () => {
    const fetchStudentBookings = async (
    studentId: string
    ): Promise<Booking[]> => {
    try {
        const bookingsQuery = query(
        collection(db, "bookings"),
        where("studentId", "==", studentId)
        );

        const snapshot = await getDocs(bookingsQuery);

        return snapshot.docs.map(doc => ({
        ...doc.data(),
        bookingId: doc.id,
        })) as Booking[];
    } catch (error) {
        console.error("Error fetching student bookings:", error);
        return [];
    }
    };

    const fetchStudentLessons = async (
        studentId: string
        ): Promise<Lesson[]> => {
        try {
            const bookings: Booking[] = await fetchStudentBookings(studentId);
            const bookingIds = bookings.map(b => b.bookingId);

            if (bookingIds.length === 0) return [];

            const lessons: Lesson[] = [];
            const chunkSize = 10;

            for (let i = 0; i < bookingIds.length; i += chunkSize) {
            const chunk = bookingIds.slice(i, i + chunkSize);
            const lessonQuery = query(
                collection(db, "lessons"),
                where("bookingId", "in", chunk)
            );

            const snapshot = await getDocs(lessonQuery);
            snapshot.forEach(doc =>
                lessons.push({
                ...doc.data(),
                lessonId: doc.id,
                } as Lesson)
            );
            }

            return lessons;
        } catch (error) {
            console.error("Error fetching student lessons:", error);
            return [];
        }
        };
    return {
        fetchStudentBookings,
        fetchStudentLessons,
    };
}