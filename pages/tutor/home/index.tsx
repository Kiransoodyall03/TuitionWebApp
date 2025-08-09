// src/components/tutor/home/TutorHome.tsx

import React, { useState } from 'react';
import { useUserContext } from '../../../services/userContext';
import { useTutor } from '../../../services/apiFunctions/tutor';
import { Tutor, Booking } from '../../../services/types';
import TutorCalendar from '../../../components/calendarTutor';
import BookingDetailsModal from '../../../components/BookingModalTutor';
import ConfirmBookingModal from '../../../components/confirmationModal'; // Adjust path as needed
import styles from './TutorHome.module.css';
import moment from 'moment';

type TutorHomeProps = {
  navigation?: any;
};

export const TutorHome = ({ navigation }: TutorHomeProps) => {
  const { user, userType } = useUserContext();
  const { confirmBooking, deleteBooking } = useTutor();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // For forcing calendar refresh

  if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
  const tutor = user as Tutor;

  // Handle when a lesson is clicked in the calendar
  const handleLessonClick = (booking: Booking) => {
    setSelectedBooking(booking);
    if (booking.confirmed) {
      setIsBookingModalOpen(true);
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedBooking(null);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setSelectedBooking(null);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setIsLoading(true);
    try {
      await confirmBooking(bookingId);
      // Success - close modal and refresh calendar
      setIsConfirmModalOpen(false);
      setSelectedBooking(null);
      setCalendarKey(prev => prev + 1); // Force calendar refresh
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    setIsLoading(true);
    try {
      await deleteBooking(bookingId);
      // Success - close modal and refresh calendar
      setIsConfirmModalOpen(false);
      setSelectedBooking(null);
      setCalendarKey(prev => prev + 1); // Force calendar refresh
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinLesson = () => {
    // Add your join lesson logic here
    console.log('Joining lesson for booking:', selectedBooking);
    // You might want to redirect to a meeting platform or open a new window
    alert('Joining lesson...');
  };

  // Format the booking data for the modal
  const formatBookingForModal = (booking: Booking) => {
    if (!booking) return {};

    const { date } = booking;
    const lessonDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const endDate = new Date(lessonDate.getTime() + 60 * 60 * 1000); // Assuming 1 hour duration

    return {
      subject: booking.subject,
      time: `${moment(lessonDate).format('h:mm A')} - ${moment(endDate).format('h:mm A')}, ${moment(lessonDate).format('MMMM D, YYYY')}`,
      parentFullName: '', // You'll need to fetch this from student data
      parentContactNumber: '', // You'll need to fetch this from student data
      parentEmail: '', // You'll need to fetch this from student data
      meetingLink: booking.meetingLink || '', // Add this field to your Booking interface if needed
    };
  };

  return (
    <div className="flex-1 bg-white p-8">
      {/* — Info boxes — */}
      <div className={styles.container}>
        <div className={styles.infoBoxes}>
          <div className={styles.box}>
            <h2>Upcoming Lessons</h2>
            <p>No upcoming lessons.</p>
          </div>
          <div className={styles.box}>
            <h2>Messages</h2>
            <p>No new messages.</p>
          </div>
          <div className={styles.box}>
            <h2>Tasks</h2>
            <p>No tasks assigned.</p>
          </div>
        </div>
      </div>

      {/* — Calendar Section — */}
      <div className="max-w-6xl mx-auto">
        <TutorCalendar key={calendarKey} onLessonClick={handleLessonClick} />
      </div>

      {/* Booking Details Modal - for confirmed lessons */}
      {selectedBooking && (
        <BookingDetailsModal
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          {...formatBookingForModal(selectedBooking)}
          onJoinLesson={handleJoinLesson}
        />
      )}

      {/* Confirm Booking Modal - for unconfirmed lessons */}
      <ConfirmBookingModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        booking={selectedBooking}
        studentName="Student Name" // You'll need to fetch this based on studentId
        onConfirm={handleConfirmBooking}
        onDelete={handleDeleteBooking}
        isLoading={isLoading}
      />
    </div>
  );
};