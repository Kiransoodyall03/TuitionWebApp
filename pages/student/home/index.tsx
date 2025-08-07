import React, { useState, useEffect } from 'react';
import { Student, Lesson, Booking } from '../../../services/types';
import { useUserContext } from '../../../services/userContext';
import { useStudent } from '../../../services/apiFunctions/student';
import StudentCalendar from '../../../components/calendarStudent';
import moment from 'moment';

import styles from './StudentHome.module.css';

type StudentHomeProps = {
  navigation?: any;
};

export const StudentHome = ({ navigation }: StudentHomeProps) => {
  const { user, userType } = useUserContext();
  const { fetchStudentLessons } = useStudent();
  
  if (userType !== 'student' || !user) return <div>Not a Student.</div>;
  const student = user as Student;

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // For forcing calendar refresh
  const [isLoadingStats, setIsLoadingStats] = useState(false); // Prevent multiple calls
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // State for dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    upcomingLessons: 0,
    completedThisMonth: 0,
    studyHours: 24, // This might come from a different source
    upcomingDeadlines: 2 // This might come from a different source
  });

  // Calculate dashboard statistics from lessons
  useEffect(() => {
    const calculateStats = async () => {
      if (isLoadingStats) return; // Prevent multiple simultaneous calls
      
      try {
        setIsLoadingStats(true);
        const lessons = await fetchStudentLessons(student.studentId);
        
        const now = new Date();
        const startOfWeek = moment().startOf('week').toDate();
        const endOfWeek = moment().endOf('week').toDate();
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();

        // Count upcoming lessons this week
        const upcomingLessons = lessons.filter(lesson => {
          const lessonDate = new Date(
            lesson.date.year,
            lesson.date.month - 1,
            lesson.date.day,
            lesson.date.hour,
            lesson.date.minute
          );
          return lessonDate >= now && 
                 lessonDate >= startOfWeek && 
                 lessonDate <= endOfWeek && 
                 lesson.lessonStatus === 'scheduled';
        }).length;

        // Count completed lessons this month
        const completedThisMonth = lessons.filter(lesson => {
          const lessonDate = new Date(
            lesson.date.year,
            lesson.date.month - 1,
            lesson.date.day,
            lesson.date.hour,
            lesson.date.minute
          );
          return lessonDate >= startOfMonth && 
                 lessonDate <= endOfMonth && 
                 lesson.lessonStatus === 'completed';
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
  }, [student.studentId, calendarKey]); // Removed fetchStudentLessons from dependencies

  // Handle when a lesson is clicked in the calendar - same pattern as TutorHome
  const handleLessonClick = (booking: Booking) => {
    setSelectedBooking(booking);
    if (booking.confirmed) {
      setIsBookingModalOpen(true);
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const handleCloseLessonModal = () => {
    setIsLessonModalOpen(false);
    setSelectedLesson(null);
  };

  const handleJoinLesson = () => {
    // Add your join lesson logic here - same as tutor
    console.log('Joining lesson:', selectedLesson);
    // You might want to redirect to a meeting platform or open a new window
    alert('Joining lesson...');
  };

  // Format the lesson data for the modal - similar to TutorHome's formatBookingForModal
  const formatLessonForModal = (lesson: Lesson) => {
    if (!lesson) return {};

    const { date } = lesson;
    const lessonDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const endDate = new Date(lessonDate.getTime() + 60 * 60 * 1000); // Assuming 1 hour duration

    return {
      status: lesson.lessonStatus,
      time: `${moment(lessonDate).format('h:mm A')} - ${moment(endDate).format('h:mm A')}, ${moment(lessonDate).format('MMMM D, YYYY')}`,
      notes: lesson.notes || 'No notes available',
      lessonId: lesson.lessonId,
      bookingId: lesson.bookingId,
    };
  };

  return (
    <div className="flex-1 bg-white p-8">
      {/* — Info boxes — */}
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

      {/* — Calendar Section — */}
      <div className="max-w-6xl mx-auto">
        <StudentCalendar key={calendarKey} onLessonClick={handleLessonClick} />
      </div>

      {/* Lesson Details Modal - Custom modal for student lessons */}
      {selectedLesson && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isLessonModalOpen ? 'block' : 'hidden'
        }`}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Lesson Details</h2>
              <button
                onClick={handleCloseLessonModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedLesson.lessonStatus === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedLesson.lessonStatus === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                  selectedLesson.lessonStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {selectedLesson.lessonStatus.charAt(0).toUpperCase() + selectedLesson.lessonStatus.slice(1)}
                </span>
              </div>

              {/* Time */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Time:</span>
                <span className="text-gray-900">{formatLessonForModal(selectedLesson).time}</span>
              </div>

              {/* Lesson ID */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Lesson ID:</span>
                <span className="text-gray-900 font-mono text-sm">{selectedLesson.lessonId}</span>
              </div>

              {/* Booking ID */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Booking ID:</span>
                <span className="text-gray-900 font-mono text-sm">{selectedLesson.bookingId}</span>
              </div>

              {/* Notes */}
              {selectedLesson.notes && (
                <div className="p-3 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700 block mb-2">Notes:</span>
                  <div className="text-gray-900 bg-white p-3 rounded border">
                    {selectedLesson.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {selectedLesson.lessonStatus === 'scheduled' && (
                <button
                  onClick={handleJoinLesson}
                  className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Join Lesson
                </button>
              )}
              
              <button
                onClick={handleCloseLessonModal}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};