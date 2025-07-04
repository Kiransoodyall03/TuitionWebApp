import { collection, query, where, getDocs, addDoc } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useState } from "react";
import { User, Student, Tutor, Lesson, Booking } from "../types";

export const useAuth = () => {
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [tutorData, setTutorData] = useState<Tutor | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    try {
      setError(null);

      const userCollection = collection(db, "users");
      const userQuery = query(
        userCollection,
        where("username", "==", username),
        where("password", "==", password)
      );
      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        setError("Invalid username or password.");
        console.error("Login failed: No matching user");
        return;
      }

      const fetchedUser = querySnapshot.docs[0].data() as User;
      setUserData(fetchedUser);

      if (fetchedUser.role === "student" && fetchedUser.Student) {
        setStudentData(fetchedUser.Student);
      } else if (fetchedUser.role === "tutor" && fetchedUser.Tutor) {
        setTutorData(fetchedUser.Tutor);
      } else {
        console.warn("Valid role but missing sub-data (Student or Tutor).");
      }

    } catch (err) {
      setError("An error occurred during login.");
      console.error("Login error:", err);
    }
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

  return {
    studentData,
    tutorData,
    userData,
    handleLogin,
    error,
    createBooking,
    convertBookingToLesson,
  };
};
