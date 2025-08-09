// src/pages/StudentHome/StudentHome.tsx
import React, { useState, useEffect } from 'react';
import { Student, Booking } from '../../../services/types';
import { useUserContext } from '../../../services/userContext';
import { useStudent } from '../../../services/apiFunctions/student';
import StudentCalendar from '../../../components/calendarStudent';
import moment from 'moment';
import BookingModalStudent from '../../../components/BookingModalStudent';
import styles from './StudentHome.module.css';

type StudentHomeProps = {
  navigation?: any;
};

export const StudentHome = ({ navigation }: StudentHomeProps) => {
  const { user, userType } = useUserContext();
  const { fetchStudentLessons } = useStudent();

  if (userType !== 'student' || !user) return <div>Not a Student.</div>;
  const student = user as Student;

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    upcomingLessons: 0,
    completedThisMonth: 0,
    studyHours: 24,
    upcomingDeadlines: 2
  });

  // Stats (unchanged)
  useEffect(() => {
    const calculateStats = async () => {
      if (isLoadingStats) return;
      try {
        setIsLoadingStats(true);
        const lessons = await fetchStudentLessons(student.studentId);

        const now = new Date();
        const startOfWeek = moment().startOf('week').toDate();
        const endOfWeek = moment().endOf('week').toDate();
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();

        const upcomingLessons = lessons.filter(lesson => {
          const lessonDate = new Date(
            lesson.date.year,
            lesson.date.month - 1,
            lesson.date.day,
            lesson.date.hour,
            lesson.date.minute
          );
          return (
            lessonDate >= now &&
            lessonDate >= startOfWeek &&
            lessonDate <= endOfWeek &&
            lesson.lessonStatus === 'scheduled'
          );
        }).length;

        const completedThisMonth = lessons.filter(lesson => {
          const lessonDate = new Date(
            lesson.date.year,
            lesson.date.month - 1,
            lesson.date.day,
            lesson.date.hour,
            lesson.date.minute
          );
          return (
            lessonDate >= startOfMonth &&
            lessonDate <= endOfMonth &&
            lesson.lessonStatus === 'completed'
          );
        }).length;

        setDashboardStats(prev => ({
          ...prev,
          upcomingLessons,
          completedThisMonth
        }));
      } catch (error) {
        console.error('Error calculating dashboard stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    calculateStats();
  }, [student.studentId, calendarKey]);

  // Parent booking click handler — receives Booking from StudentCalendar
  const handleBookingClick = (booking: Booking) => {
    console.log('Parent received booking click:', booking);

    // Defensive: ensure booking.date fields are numbers
    const year = Number(booking.date.year);
    const month = Number(booking.date.month) - 1;
    const day = Number(booking.date.day);
    const hour = Number(booking.date.hour);
    const minute = Number(booking.date.minute);

    const bookingDate = new Date(year, month, day, hour, minute);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // Open modal for today or future bookings
    if (!isNaN(bookingDate.getTime()) && bookingDate >= todayMidnight) {
      setSelectedBooking(booking);
      setIsBookingModalOpen(true);
    } else {
      console.log('Booking is in the past — not opening modal:', booking.bookingId);
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedBooking(null);
  };

  const handleJoinBooking = () => {
    if (!selectedBooking) return;
    if (selectedBooking.meetingLink) {
      window.open(selectedBooking.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      alert('No meeting link available for this booking.');
    }
  };

  return (
    <div className="flex-1 bg-white p-8">
      {/* Info boxes */}
      <div className={styles.container}>
        <div className={styles.infoBoxes}>
          <div className={styles.box}>
            <h2>Upcoming Lessons</h2>
            <p>{dashboardStats.upcomingLessons} this week.</p>
          </div>
          <div className={styles.box}>
            <h2>Completed</h2>
            <p>{dashboardStats.completedThisMonth} this month.</p>
          </div>
          <div className={styles.box}>
            <h2>Study Hours</h2>
            <p>{dashboardStats.studyHours} this week.</p>
          </div>
          <div className={styles.box}>
            <h2>Deadlines</h2>
            <p>{dashboardStats.upcomingDeadlines} upcoming.</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-6xl mx-auto">
        <StudentCalendar key={calendarKey} onLessonClick={handleBookingClick} />
      </div>

      {/* Booking Modal (portal) */}
      {isBookingModalOpen && selectedBooking && (
        <BookingModalStudent
          booking={selectedBooking}
          student={student}
          onClose={handleCloseBookingModal}
          onJoin={handleJoinBooking}
        />
      )}
    </div>
  );
};

export default StudentHome;
