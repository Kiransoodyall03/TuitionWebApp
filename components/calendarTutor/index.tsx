import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './calendarTutor.module.css';
import CreateLessonModal from '../createLessonmodal';
import { useTutor } from '../../services/apiFunctions/tutor';
import { Booking } from '../../services/types';
import { useUserContext } from '../../services/userContext';

const localizer = momentLocalizer(moment);

interface TutorCalendarProps {
  onLessonClick?: (booking: Booking) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  clickable: boolean;
  booking: Booking;
}

const TutorCalendar: React.FC<TutorCalendarProps> = ({ onLessonClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tutor data from context and hooks
  const { user, userType, userProfile, tutorProfile } = useUserContext();
  const { fetchTutorBookings } = useTutor();
  
  // Get tutorId from userProfile (uid) since that's what we use throughout the app
  const tutorId = userProfile?.uid || '';

  // Convert Booking to Calendar Event
  const convertBookingToEvent = (booking: Booking): CalendarEvent => {
    const { date } = booking;
    const startDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const duration = booking.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    return {
      id: booking.bookingId,
      title: `${booking.subject}${booking.confirmed ? '' : ' (Pending)'}`,
      start: startDate,
      end: endDate,
      type: booking.confirmed ? 'lesson' : 'pending-lesson',
      clickable: true,
      booking: booking
    };
  };

  // Fetch bookings on component mount and when tutorId changes
  useEffect(() => {
    const loadBookings = async () => {
      if (!tutorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const bookings = await fetchTutorBookings(tutorId);
        const calendarEvents = bookings.map(convertBookingToEvent);
        setEvents(calendarEvents);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [fetchTutorBookings, tutorId]);

  // Refresh bookings function
  const refreshBookings = async () => {
    if (!tutorId) return;
    
    try {
      const bookings = await fetchTutorBookings(tutorId);
      const calendarEvents = bookings.map(convertBookingToEvent);
      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error refreshing bookings:', err);
      setError('Failed to refresh bookings');
    }
  };

  const CustomEvent: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const handleEventClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log('Event clicked:', event);
      
      // Handle all booking clicks through the parent component
      const booking = event.booking;
      if (booking && onLessonClick) {
        onLessonClick(booking);
      } else if (booking) {
        // Fallback for other booking states
        alert(`Booking Details:
    Subject: ${booking.subject}
    Date: ${moment(event.start).format('MMM D, YYYY h:mm A')}
    Status: ${booking.confirmed ? 'Confirmed' : 'Pending'}
    Details: ${booking.extraDetails || 'No additional details'}
    Student ID: ${booking.studentId}`);
      } else {
        alert(`Clicked on: ${event.title}`);
      }
    };

    const getEventStyle = (type: string): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        padding: '2px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };

      switch (type) {
        case 'lesson':
          return { ...baseStyle, backgroundColor: '#8b5cf6', color: 'white' };
        case 'pending-lesson':
          return { ...baseStyle, backgroundColor: '#f59e0b', color: 'white' };
        case 'meeting':
          return { ...baseStyle, backgroundColor: '#3b82f6', color: 'white' };
        case 'review':
          return { ...baseStyle, backgroundColor: '#ef4444', color: 'white' };
        case 'social':
          return { ...baseStyle, backgroundColor: '#10b981', color: 'white' };
        default:
          return { ...baseStyle, backgroundColor: '#6b7280', color: 'white' };
      }
    };

    return (
      <button
        style={getEventStyle(event.type)}
        onClick={handleEventClick}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        {event.title}
      </button>
    );
  };

  const handleSelectSlot = useCallback((slotInfo: any) => {
    setSelectedSlot(slotInfo.start);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  const handleSubmitLesson = async (booking: Booking) => {
    // Create a new event from the booking
    const newEvent = convertBookingToEvent(booking);
    setEvents(prev => [...prev, newEvent]);
    handleCloseModal();
    
    // Refresh bookings to get the latest data from the database
    await refreshBookings();
    
    console.log('New lesson created:', booking);
  };

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    console.log('Selected event:', event);
    
    // Handle all booking clicks through the parent component
    const booking = event.booking;
    if (booking && onLessonClick) {
      onLessonClick(booking);
    } else if (booking) {
      alert(`Selected: ${event.title}\nStatus: ${booking.confirmed ? 'Confirmed' : 'Pending'}`);
    } else {
      alert(`Selected: ${event.title}`);
    }
  }, [onLessonClick]);

  // Check if user is a tutor
  if (userType !== 'tutor' || !user) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Not authorized. Please log in as a tutor.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading bookings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          Error: {error}
          <button onClick={refreshBookings} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className={styles.title}>My Lessons Calendar</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {tutorProfile?.subjects?.length || 0} Subjects | 
            {' '}{events.filter(e => e.booking?.confirmed).length} Confirmed Lessons
          </span>
          <button 
            onClick={refreshBookings} 
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className={styles.instructions}>
        <h4 className={styles.instructionsTitle}>Calendar Guide:</h4>
        <ul className={styles.instructionsList}>
          <li>
            <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Purple</span> - Confirmed lessons
          </li>
          <li>
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Orange</span> - Pending confirmation
          </li>
          <li>Click on empty slots to create new lessons</li>
          <li>Click on lessons to view details or join meetings</li>
        </ul>
      </div>

      {/* Calendar */}
      <div className={styles.calendarWrapper} style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={['week', 'day', 'month']}
          defaultView="week"
          min={new Date(2025, 0, 1, 7, 0)}
          max={new Date(2030, 11, 31, 22, 0)}
          step={30}
          timeslots={2}
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={true}
          components={{
            event: CustomEvent as any
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0'
            }
          })}
        />
      </div>

      <div className={styles.currentEvents}>
        <h4 className={styles.currentEventsTitle}>
          Upcoming Lessons ({events.length}):
        </h4>
        <div className={styles.eventsList}>
          {events.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: '#666' }}>
              No upcoming lessons scheduled
            </div>
          ) : (
            events
              .filter(event => new Date(event.start) >= new Date())
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .slice(0, 10) // Show next 10 upcoming lessons
              .map(event => (
                <div key={event.id} className={styles.eventItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong>{event.booking?.subject || event.title}</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {moment(event.start).format('MMM D, YYYY h:mm A')}
                      </span>
                      {event.booking?.durationMinutes && (
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                          ({event.booking.durationMinutes} min)
                        </span>
                      )}
                    </div>
                    <span style={{ 
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: event.booking?.confirmed ? '#dcfce7' : '#fed7aa',
                      color: event.booking?.confirmed ? '#166534' : '#c2410c'
                    }}>
                      {event.booking?.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  {event.booking?.extraDetails && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginTop: '4px',
                      padding: '4px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px'
                    }}>
                      {event.booking.extraDetails}
                    </div>
                  )}
                  {event.booking?.meetingLink && (
                    <a 
                      href={event.booking.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '12px', 
                        color: '#3b82f6',
                        textDecoration: 'none',
                        marginTop: '4px',
                        display: 'inline-block'
                      }}
                    >
                      Join Meeting →
                    </a>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Create Lesson Modal */}
      {isModalOpen && selectedSlot && (
        <CreateLessonModal
          selectedDate={selectedSlot}
          onClose={handleCloseModal}
          onSubmit={handleSubmitLesson}
        />
      )}
    </div>
  );
};

export default TutorCalendar;