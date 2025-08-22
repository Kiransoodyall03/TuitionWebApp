import { collection, query, where, getDocs, addDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useState } from "react";
import { Student, Tutor, Lesson, Booking, AuthenticatedUser, isStudent, isTutor } from "../types";

export const useAuth = () => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    setAuthenticatedUser(null);
    setError(null);
  };

  const createBooking = async (payload: Booking & { durationMinutes?: number }): Promise<Booking> => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = `Request failed: ${res.status}`;
      try {
        const txt = await res.text();
        msg = txt || msg;
      } catch {}
      throw new Error(msg);
    }

    const json = await res.json();
    const returned: Booking = (json?.booking ?? json) as Booking;
    return returned;
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