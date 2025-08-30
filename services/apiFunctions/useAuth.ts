import { collection, addDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useUserContext } from "../userContext";
import { Lesson, Booking } from "../types";

export const useAuth = () => {
  // Get everything from UserContext
  const {
    user,
    userProfile,
    tutorProfile,
    studentProfile,
    userType,
    error,
    isLoading,
    login,
    loginWithMicrosoft,
    register,
    linkEmailToAccount,
    linkMicrosoftToAccount,
    updateUserProfile,
    updateTutorProfile,
    updateStudentProfile,
    signOut,
    clearError,
    linkAccountWithPassword
  } = useUserContext();

  // Add booking-specific functionality
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

  // Helper functions using data from UserContext
  const getCurrentUser = () => userProfile;
  
  const getCurrentStudentProfile = () => studentProfile;
  
  const getCurrentTutorProfile = () => tutorProfile;
  
  const getUserType = () => userType;
  
  const getUserId = () => userProfile?.uid || null;
  
  const isLoggedIn = () => user !== null && userProfile !== null;
  
  const isTutor = () => userType === 'tutor';
  
  const isStudent = () => userType === 'student';

  return {
    // User authentication state from context
    user,
    userProfile,
    tutorProfile,
    studentProfile,
    userType,
    error,
    isLoading,
    
    // Authentication actions from context
    login,
    loginWithMicrosoft,
    register,
    linkEmailToAccount,
    linkMicrosoftToAccount,
    updateUserProfile,
    updateTutorProfile,
    updateStudentProfile,
    signOut,
    clearError,
    linkAccountWithPassword,
    
    // Booking-specific actions
    createBooking,
    convertBookingToLesson,
    
    // Helper functions
    getCurrentUser,
    getCurrentStudentProfile,
    getCurrentTutorProfile,
    getUserType,
    getUserId,
    isLoggedIn,
    isTutor,
    isStudent,
    
    // Backward compatibility aliases
    authenticatedUser: userProfile,
    studentData: studentProfile,
    tutorData: tutorProfile,
    logout: signOut, // Alias for signOut
  };
};