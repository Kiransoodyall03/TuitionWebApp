import { collection, query, where, getDocs, addDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useState } from "react";
import { Student, Tutor, Lesson, Booking, AuthenticatedUser, isStudent, isTutor } from "../types";

export const useAuth = () => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    try {
      setError(null);

      // First, try to find a student with the given credentials
      const studentCollection = collection(db, "students");
      const studentQuery = query(
        studentCollection,
        where("username", "==", username),
        where("password", "==", password)
      );
      const studentSnapshot = await getDocs(studentQuery);

      if (!studentSnapshot.empty) {
        const fetchedStudent = studentSnapshot.docs[0].data() as Student;
        setAuthenticatedUser(fetchedStudent);
        console.log("Student logged in:", fetchedStudent.username);
        return;
      }

      // If no student found, try to find a tutor
      const tutorCollection = collection(db, "tutors");
      const tutorQuery = query(
        tutorCollection,
        where("username", "==", username),
        where("password", "==", password)
      );
      const tutorSnapshot = await getDocs(tutorQuery);

      if (!tutorSnapshot.empty) {
        const fetchedTutor = tutorSnapshot.docs[0].data() as Tutor;
        setAuthenticatedUser(fetchedTutor);
        console.log("Tutor logged in:", fetchedTutor.username);
        return;
      }

      // If neither student nor tutor found
      setError("Invalid username or password.");
      console.error("Login failed: No matching user");

    } catch (err) {
      setError("An error occurred during login.");
      console.error("Login error:", err);
    }
  };

  const logout = () => {
    setAuthenticatedUser(null);
    setError(null);
  };

  const createBooking = async (booking: Booking) => {
    try {
      const bookingCollection = collection(db, "bookings");
      await addDoc(bookingCollection, booking);
      console.log("Booking created successfully:", booking);
    } catch (err) {
      console.error("Error creating booking:", err);
    }
  };

  const convertBookingToLesson = async (booking: Booking): Promise<Lesson | null> => {
    if (!booking.confirmed) {
      console.warn("Booking not confirmed. Lesson will not be created.");
      return null;
    }

    try {
      const lessonsCollection = collection(db, "lessons");

      const newLesson: Omit<Lesson, "lessonId"> = {
        bookingId: booking.bookingId,
        date: booking.date,
        notes: "",
        lessonStatus: "scheduled",
      };

      const docRef = await addDoc(lessonsCollection, newLesson);

      const createdLesson: Lesson = {
        ...newLesson,
        lessonId: docRef.id,
      };

      console.log("Lesson created from booking:", createdLesson);
      return createdLesson;

    } catch (error) {
      console.error("Error converting booking to lesson:", error);
      return null;
    }
  };

  // Helper functions
  const getCurrentUser = (): AuthenticatedUser | null => {
    return authenticatedUser;
  };

  const getCurrentStudent = (): Student | null => {
    return authenticatedUser && isStudent(authenticatedUser) ? authenticatedUser : null;
  };

  const getCurrentTutor = (): Tutor | null => {
    return authenticatedUser && isTutor(authenticatedUser) ? authenticatedUser : null;
  };

  const getUserRole = (): 'student' | 'tutor' | null => {
    return authenticatedUser?.role || null;
  };

  const getUserId = (): string | null => {
    if (!authenticatedUser) return null;
    return isStudent(authenticatedUser) ? authenticatedUser.studentId : authenticatedUser.tutorId;
  };

  const isLoggedIn = (): boolean => {
    return authenticatedUser !== null;
  };

  return {
    // Main state
    authenticatedUser,
    error,
    
    // Actions
    handleLogin,
    logout,
    createBooking,
    convertBookingToLesson,
    
    // Helper functions
    getCurrentUser,
    getCurrentStudent,
    getCurrentTutor,
    getUserRole,
    getUserId,
    isLoggedIn,
    
    // Backward compatibility (derived state)
    studentData: getCurrentStudent(),
    tutorData: getCurrentTutor(),
  };
};