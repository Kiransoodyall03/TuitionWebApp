import React, { useState } from 'react';
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

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, content, action, color = "blue" }) => {
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
          <button className={styles.infoAction}>
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

const formatBookingForModal = (booking: Booking) => {
  // This function should format your booking data for the modal
  // Adjust according to your BookingDetailsModal props
  return {
    // Add the necessary properties that your BookingDetailsModal expects
  };
};

const handleJoinLesson = (lessonId: string) => {
  // Implement join lesson logic
  console.log('Joining lesson:', lessonId);
};

export const TutorHome: React.FC<TutorHomeProps> = ({ navigation }) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [calendarKey, setCalendarKey] = useState<number>(0);
  const { user, userType, userProfile, tutorProfile } = useUserContext();

  const tutorId = tutorProfile?.userId || '';
  
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

  const handleStudentAdded = (): void => {
    // Refresh any necessary data here
    // For example, you might want to refresh student count in stats
    console.log('Student added successfully');
    // You could also trigger a refetch of tutor data or student count here
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
          <div className={styles.headerActions}>
            <QuickActionButton
              icon={UserPlus}
              label="Add Student"
              onClick={handleAddStudentClick}
              color="green"
            />
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Stats Overview */}
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>Today's Overview</h2>
          <div className={styles.statsGrid}>
            <StatCard 
              icon={Clock} 
              title="Today's Earnings" 
              value="R350" 
              subtitle="3 lessons completed"
              color="green" 
            />
            <StatCard 
              icon={Users} 
              title="Total Students" 
              value={tutorProfile?.totalStudents || "0"} 
              subtitle="Active this month"
              color="blue" 
            />
            <StatCard 
              icon={Calendar} 
              title="This Week" 
              value="18h" 
              subtitle="Teaching hours"
              color="purple" 
            />
            <StatCard 
              icon={BookOpen} 
              title="Completion Rate" 
              value="98%" 
              subtitle="Last 30 days"
              color="orange" 
            />
          </div>
        </div>

        {/* Info Cards */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Activity Summary</h2>
          <div className={styles.infoGrid}>
            <InfoCard
              icon={Clock}
              title="Upcoming Lessons"
              content="No upcoming lessons for today."
              action="Schedule New"
              color="blue"
            />
            <InfoCard
              icon={MessageSquare}
              title="Messages"
              content="No new messages."
              action="Send Message"
              color="green"
            />
            <InfoCard
              icon={CheckSquare}
              title="Tasks"
              content="No tasks assigned."
              action="Create Task"
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