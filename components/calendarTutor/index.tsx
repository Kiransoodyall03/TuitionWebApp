import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './calendarTutor.module.css';
import CreateLessonModal from '../createLessonmodal';
import { useTutor } from '../../services/apiFunctions/tutor';
import { Booking, Student, Tutor } from '../../services/types'; // Adjust path as needed
import { useUserContext } from '../../services/userContext';

const localizer = momentLocalizer(moment);

interface TutorCalendarProps {
  onLessonClick?: (booking: Booking) => void;
}

const TutorCalendar = ({ onLessonClick }: TutorCalendarProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { fetchTutorBookings } = useTutor();
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - replace with actual data from your context/props
  const { user, userType } = useUserContext();
  if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
  const tutor = user as Tutor;

  // Convert Booking to Calendar Event
  const convertBookingToEvent = (booking: Booking) => {
    const { date } = booking;
    const startDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

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

  // Fetch bookings on component mount
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const bookings = await fetchTutorBookings(tutor.tutorId);
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
  }, [fetchTutorBookings, tutor.tutorId]);

  // Refresh bookings function
  const refreshBookings = async () => {
    try {
      const bookings = await fetchTutorBookings(tutor.tutorId);
      const calendarEvents = bookings.map(convertBookingToEvent);
      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error refreshing bookings:', err);
      setError('Failed to refresh bookings');
    }
  };

  const CustomEvent = ({ event }) => {
    const handleEventClick = (e) => {
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

    const getEventStyle = (type) => {
      const baseStyle = {
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

  const handleSelectSlot = useCallback((slotInfo) => {
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

  const handleSelectEvent = useCallback((event) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={styles.title}>My Lessons Calendar</h2>
        <button onClick={refreshBookings} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
      
      <div className={styles.instructions}>
        <h4 className={styles.instructionsTitle}>Instructions:</h4>
        <ul className={styles.instructionsList}>
          <li>Click on confirmed lessons (purple) to view full booking details</li>
          <li>Click on pending lessons (orange) to view basic information</li>
          <li>Click on empty calendar slots to create new lessons</li>
          <li>Hover over events to see hover effects</li>
        </ul>
      </div>

      {/* Calendar */}
      <div className={styles.calendarWrapper} style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={['week']}
          defaultView="week"
          min={new Date(2025, 1, 1, 8, 0)}
          max={new Date(2030, 1, 1, 22, 0)}
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={true}
          components={{
            event: CustomEvent
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
        <h4 className={styles.currentEventsTitle}>Upcoming Lessons ({events.length}):</h4>
        <div className={styles.eventsList}>
          {events.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: '#666' }}>
              No upcoming lessons scheduled
            </div>
          ) : (
            events
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => (
                <div key={event.id} className={styles.eventItem}>
                  <strong>{event.booking?.subject || event.title}</strong>
                  <br />
                  {moment(event.start).format('MMM D, YYYY h:mm A')}
                  <br />
                  <span style={{ 
                    color: event.booking?.confirmed ? '#10b981' : '#f59e0b',
                    fontSize: '12px'
                  }}>
                    {event.booking?.confirmed ? 'Confirmed' : 'Pending Confirmation'}
                  </span>
                  {event.booking?.extraDetails && (
                    <>
                      <br />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {event.booking.extraDetails}
                      </span>
                    </>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Create Lesson Modal */}
      {isModalOpen && selectedSlot && (
        <CreateLessonModal
          tutorId={tutor.tutorId}
          selectedDate={selectedSlot}
          onClose={handleCloseModal}
          onSubmit={handleSubmitLesson}
        />
      )}
    </div>
  );
};

export default TutorCalendar;