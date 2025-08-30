// src/pages/StudentHome/StudentHome.tsx
import React, { useState, useEffect } from 'react';
import { Student, Booking } from '../../../services/types';
import { useUserContext } from '../../../services/userContext';
import { useStudent, StudentStats, WeeklyStats } from '../../../services/apiFunctions/student';
import StudentCalendar from '../../../components/calendarStudent';
import moment from 'moment';
import BookingModalStudent from '../../../components/BookingModalStudent';
import styles from './StudentHome.module.css';

type StudentHomeProps = {
  navigation?: any;
};

export const StudentHome = ({ navigation }: StudentHomeProps) => {
  // Get auth user + app profiles from context
  const { user, userType, userProfile, studentProfile, isLoading: contextLoading } = useUserContext();
  
  // Use the student hook for data fetching
  const studentHook = useStudent();

  // Prepare a minimal Student object for the modal
  const studentForModal: Student = {
    studentId: studentHook?.studentId || '',
    username: userProfile?.displayName ?? '',
    password: '',
    role: 'student',
    grade: String(studentProfile?.grade ?? 12),
    email: userProfile?.email,
    subjects: (studentProfile?.subjects ?? []).map(s => {
      if (typeof s === 'string') {
        return {
          subjectName: s,
          tutorId: '',
          currentMark: 0,
          targetMark: 0
        };
      }
      return s;
    }),
    tutorIds: [],
    parentId: '',
    parentName: '',
    parentContactNumber: '',
    parentEmail: '',
    tokens: 0
  };

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);

  // State for real statistics from Firebase
  const [dashboardStats, setDashboardStats] = useState({
    upcomingLessons: 0,
    completedThisMonth: 0,
    studyHours: 0,
    upcomingDeadlines: 0
  });

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    weeklyLessons: 0,
    weeklyHours: 0,
    weeklyProgress: 0,
    completedThisWeek: 0
  });

  const [totalStats, setTotalStats] = useState<StudentStats>({
    totalLessons: 0,
    completedAssignments: 0,
    currentSubjects: 0,
    averageGrade: 0,
    upcomingLessons: 0
  });

  // Load student data when component mounts and when studentId changes
  useEffect(() => {
    const loadDashboardData = async () => {
      // Check if we have a valid studentId before loading
      if (!studentHook?.studentId) {
        console.log('No studentId available yet');
        return;
      }
      
      // Prevent multiple simultaneous loads
      if (statsLoading) {
        console.log('Already loading stats, skipping...');
        return;
      }
      
      setStatsLoading(true);
      try {
        // Fetch all statistics in parallel
        const [weekly, total, bookings, lessons] = await Promise.all([
          studentHook.calculateWeeklyStats(studentHook.studentId),
          studentHook.calculateStudentStats(studentHook.studentId),
          studentHook.fetchStudentBookings(studentHook.studentId),
          studentHook.fetchStudentLessons(studentHook.studentId)
        ]);

        setWeeklyStats(weekly);
        setTotalStats(total);

        // Calculate completed this month
        const now = new Date();
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();

        const completedThisMonth = lessons.filter(lesson => {
          const lessonDate = new Date(
            lesson.date.year,
            lesson.date.month - 1,
            lesson.date.day,
            lesson.date.hour || 0,
            lesson.date.minute || 0
          );
          return (
            lessonDate >= startOfMonth &&
            lessonDate <= endOfMonth &&
            lesson.lessonStatus === 'completed'
          );
        }).length;

        // Calculate upcoming deadlines (assignments due in next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const upcomingDeadlines = bookings.filter(booking => {
          const bookingDate = new Date(
            booking.date.year,
            booking.date.month - 1,
            booking.date.day,
            booking.date.hour || 0,
            booking.date.minute || 0
          );
          return bookingDate >= now && bookingDate <= nextWeek && booking.confirmed;
        }).length;

        setDashboardStats({
          upcomingLessons: weekly.weeklyLessons,
          completedThisMonth,
          studyHours: Math.round(weekly.weeklyHours),
          upcomingDeadlines
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadDashboardData();
  }, [studentHook?.studentId]); // Only re-run when studentId actually changes

  // Parent booking click handler
  const handleBookingClick = (booking: Booking) => {
    console.log('Parent received booking click:', booking);

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

  const formatHours = (hours: number) => {
    if (hours === 0) return '0';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  };

  // Early return if not a student or still loading
  if (contextLoading || !studentHook?.studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #ddd6fe 100%)' }}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (userType !== 'student' || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #ddd6fe 100%)' }}>
        <div className={styles.notStudentMessage}>Not a Student or profile not loaded.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #ddd6fe 100%)' }}>
      {/* Info boxes */}
      <div className={styles.container}>
        <h1 className={styles.heading}>Student Dashboard</h1>
        <div className={styles.infoBoxes}>
          <div className={styles.box}>
            <h2>Upcoming Lessons</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                `${dashboardStats.upcomingLessons} this week`
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Completed</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                `${dashboardStats.completedThisMonth} this month`
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Study Hours</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                formatHours(weeklyStats.weeklyHours)
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Average Grade</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                `${totalStats.averageGrade}%`
              )}
            </p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className={styles.infoBoxes} style={{ marginTop: '1rem' }}>
          <div className={styles.box}>
            <h2>Weekly Progress</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                `${weeklyStats.weeklyProgress}%`
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Active Subjects</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                totalStats.currentSubjects
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Total Lessons</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                totalStats.totalLessons
              )}
            </p>
          </div>
          <div className={styles.box}>
            <h2>Assignments Done</h2>
            <p>
              {statsLoading ? (
                <span className={styles.loadingStats}>...</span>
              ) : (
                totalStats.completedAssignments
              )}
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className={styles.calendarWrapper}>
          <h2 className={styles.calendarTitle}>Your Schedule</h2>
          <StudentCalendar key={calendarKey} onLessonClick={handleBookingClick} />
        </div>
      </div>

      {/* Booking Modal (portal) */}
      {isBookingModalOpen && selectedBooking && (
        <BookingModalStudent
          booking={selectedBooking}
          student={studentForModal}
          onClose={handleCloseBookingModal}
          onJoin={handleJoinBooking}
        />
      )}
    </div>
  );
};

export default StudentHome;