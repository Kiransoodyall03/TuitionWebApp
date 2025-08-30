import React, { useState, useEffect } from 'react'; // Added useEffect import
import { Calendar, MessageSquare, CheckSquare, Clock, Users, BookOpen, Settings, Bell, UserPlus, LucideIcon } from 'lucide-react';
import { useUserContext } from '../../../services/userContext';
import { useTutor } from '../../../services/apiFunctions/tutor';
import { Booking } from '../../../services/types';
import TutorCalendar from '../../../components/calendarTutor';
import BookingDetailsModal from '../../../components/BookingModalTutor';
import ConfirmBookingModal from '../../../components/confirmationModal';
import AddStudentModal from '../../../components/AddStudentModal';
import styles from './TutorHome.module.css';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  content: string;
  action?: string;
  onActionClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

interface TutorHomeProps {
  navigation?: any;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subtitle, color = "blue" }) => {
  return (
    <div className={`${styles.statCard} ${styles[`statCard${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
      <div className={styles.statContent}>
        <div className={styles.statIcon}>
          <Icon className={styles.iconSize} />
        </div>
        <div className={styles.statDetails}>
          <h3 className={styles.statValue}>{value}</h3>
          <p className={styles.statTitle}>{title}</p>
          {subtitle && <p className={styles.statSubtitle}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, content, action, onActionClick, color = "blue" }) => {
  return (
    <div className={styles.infoCard}>
      <div className={styles.infoHeader}>
        <div className={`${styles.infoIcon} ${styles[`infoIcon${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
          <Icon className={styles.iconSize} />
        </div>
        <h3 className={styles.infoTitle}>{title}</h3>
      </div>
      <div className={styles.infoContent}>
        <p className={styles.infoText}>{content}</p>
        {action && (
          <button 
            className={styles.infoAction}
            onClick={onActionClick}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, onClick, color = "blue" }) => {
  return (
    <button 
      onClick={onClick}
      className={`${styles.quickAction} ${styles[`quickAction${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}
    >
      <Icon className={styles.actionIcon} />
      <span className={styles.actionLabel}>{label}</span>
    </button>
  );
};

export const TutorHome: React.FC<TutorHomeProps> = ({ navigation }) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [calendarKey, setCalendarKey] = useState<number>(0);
  const [weeklyStatistics, setWeeklyStatistics] = useState({
    weeklyEarnings: 0,
    weeklyHours: 0,
    weeklyLessons: 0
  });
  const [totalStudents, setTotalStudents] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const { user, userType, userProfile, tutorProfile } = useUserContext();
  const { 
    fetchWeeklyStatistics,
    calculateTotalStudents
  } = useTutor();

  const tutorId = tutorProfile?.userId || '';

  // Fetch statistics on component mount
  useEffect(() => {
    const loadStatistics = async () => {
      setStatsLoading(true);
      try {
        // Get weekly stats for dashboard
        const [weeklyStats, students] = await Promise.all([
          fetchWeeklyStatistics(),
          calculateTotalStudents()
        ]);
        
        setWeeklyStatistics(weeklyStats);
        setTotalStudents(students);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStatistics();
  }, [fetchWeeklyStatistics, calculateTotalStudents]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}min`;
  };

  const handleJoinLesson = () => {
    if (selectedBooking?.meetingLink) {
      console.log('Joining lesson:', selectedBooking.bookingId);
      window.open(selectedBooking.meetingLink, '_blank');
    } else {
      console.log('No meeting link available for this lesson');
      alert('No meeting link available for this lesson. Please create a Teams meeting first.');
    }
  };
  
  const formatBookingForModal = (booking: Booking) => {
    return {
      bookingId: booking.bookingId,
      subject: booking.subject,
      date: booking.date,
      studentId: booking.studentId,
      tutorId: booking.tutorId,
      meetingLink: booking.meetingLink,
      confirmed: booking.confirmed,
      extraDetails: booking.extraDetails,
      durationMinutes: booking.durationMinutes
    };
  };

  const handleLessonClick = (booking: Booking): void => {
    setSelectedBooking(booking);
    if (booking.confirmed) {
      setIsBookingModalOpen(true);
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const handleCloseBookingModal = (): void => {
    setIsBookingModalOpen(false);
    setSelectedBooking(null);
  };

  const handleCloseConfirmModal = (): void => {
    setIsConfirmModalOpen(false);
    setSelectedBooking(null);
  };

  const handleConfirmBooking = async (bookingId: string): Promise<void> => {
    setIsLoading(true);
    try {
      // await confirmBooking(bookingId);
      setIsConfirmModalOpen(false);
      setSelectedBooking(null);
      setCalendarKey(prev => prev + 1);
      
      // Refresh statistics after confirming a booking
      const [weeklyStats, students] = await Promise.all([
        fetchWeeklyStatistics(),
        calculateTotalStudents()
      ]);
      setWeeklyStatistics(weeklyStats);
      setTotalStudents(students);
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string): Promise<void> => {
    setIsLoading(true);
    try {
      // await deleteBooking(bookingId);
      setIsConfirmModalOpen(false);
      setSelectedBooking(null);
      setCalendarKey(prev => prev + 1);
      
      // Refresh statistics after deleting a booking
      const [weeklyStats, students] = await Promise.all([
        fetchWeeklyStatistics(),
        calculateTotalStudents()
      ]);
      setWeeklyStatistics(weeklyStats);
      setTotalStudents(students);
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudentClick = (): void => {
    setIsAddStudentModalOpen(true);
  };

  const handleCloseAddStudentModal = (): void => {
    setIsAddStudentModalOpen(false);
  };

  const handleStudentAdded = async (): Promise<void> => {
    console.log('Student added successfully');
    // Refresh statistics to update student count
    const [weeklyStats, students] = await Promise.all([
      fetchWeeklyStatistics(),
      calculateTotalStudents()
    ]);
    setWeeklyStatistics(weeklyStats);
    setTotalStudents(students);
  };

  const handleScheduleLesson = (): void => {
    console.log('Opening schedule lesson dialog');
    // Implement your schedule lesson logic here
  };

  const handleSendMessage = (): void => {
    console.log('Opening message dialog');
    // Implement your send message logic here
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Welcome back! Here's what's happening today.</p>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Stats Overview */}
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>This Week's Overview</h2>
          <div className={styles.statsGrid}>
            <StatCard 
              icon={Clock} 
              title="Weekly Earnings" 
              value={statsLoading ? "Loading..." : formatCurrency(weeklyStatistics.weeklyEarnings)}
              subtitle="This week's earnings"
              color="green" 
            />
            <StatCard 
              icon={Calendar} 
              title="Weekly Hours" 
              value={statsLoading ? "..." : formatHours(weeklyStatistics.weeklyHours)}
              subtitle="Teaching this week"
              color="purple" 
            />
            <StatCard 
              icon={BookOpen} 
              title="Weekly Lessons" 
              value={statsLoading ? "..." : weeklyStatistics.weeklyLessons}
              subtitle="Scheduled this week"
              color="blue" 
            />
            <StatCard 
              icon={Users} 
              title="Total Students" 
              value={statsLoading ? "..." : totalStudents}
              subtitle="All time"
              color="orange" 
            />
          </div>
        </div>

        {/* Info Cards */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.infoGrid}>
            <InfoCard
              icon={Clock}
              title="Upcoming Lessons"
              content="View and manage your upcoming lessons."
              action="Schedule New"
              onActionClick={handleScheduleLesson}
              color="blue"
            />
            <InfoCard
              icon={MessageSquare}
              title="Messages"
              content="Communicate with your students."
              action="Send Message"
              onActionClick={handleSendMessage}
              color="green"
            />
            <InfoCard
              icon={UserPlus}
              title="Add Student"
              content="Add a student to your roster to start scheduling lessons."
              action="Add Student"
              onActionClick={handleAddStudentClick}
              color="orange"
            />
          </div>
        </div>

        {/* Calendar Section */}
        <div className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <h2 className={styles.sectionTitle}>Your Schedule</h2>
            <p className={styles.calendarSubtitle}>Click on any lesson to view details or make changes</p>
          </div>
          
          <div className={styles.calendarContainer}>
            <TutorCalendar key={calendarKey} onLessonClick={handleLessonClick} />
          </div>
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
          tutorId={tutorId}
          booking={selectedBooking}
          studentName="Student Name"
          onConfirm={handleConfirmBooking}
          onDelete={handleDeleteBooking}
          isLoading={isLoading}
        />

        {/* Add Student Modal */}
        <AddStudentModal
          isOpen={isAddStudentModalOpen}
          onClose={handleCloseAddStudentModal}
          onStudentAdded={handleStudentAdded}
        />
      </div>
    </div>
  );
};

export default TutorHome;

