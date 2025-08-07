import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarStudent.module.css';
import { useStudent } from '../../services/apiFunctions/student';
import { Lesson, Booking, Student } from '../../services/types'; // Adjust path as needed
import { useUserContext } from '../../services/userContext';

const localizer = momentLocalizer(moment);

interface StudentCalendarProps {
  onLessonClick?: (booking: Booking) => void;
}

const StudentCalendar = ({ onLessonClick }: StudentCalendarProps) => {
  const { fetchStudentLessons, fetchStudentBookings } = useStudent();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get student from context
  const { user, userType } = useUserContext();
  if (userType !== 'student' || !user) return <div>Not a student.</div>;
  const student = user as Student;

  // Convert Lesson to Calendar Event
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
      booking: booking,
    };
  };

useEffect(() => {
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const bookings = await fetchStudentBookings(student.studentId);
      //const lessons = await fetchStudentLessons(student.studentId); // Now uses bookings internally
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
}, [ fetchStudentBookings, student.studentId]);


    const refreshBookings = async () => {
    try {
        const bookings = await fetchStudentBookings(student.studentId);
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
      
      // Handle all lesson clicks through the parent component
      const booking = event.booking;
      if (booking && onLessonClick) {
        onLessonClick(booking);
      } else if (booking) {
        // Fallback for other lesson states
        alert(`Lesson Details:
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
        case 'completed':
          return { ...baseStyle, backgroundColor: '#10b981', color: 'white' }; // Green
        case 'scheduled':
          return { ...baseStyle, backgroundColor: '#8b5cf6', color: 'white' }; // Purple
        case 'cancelled':
          return { ...baseStyle, backgroundColor: '#ef4444', color: 'white' }; // Red
        case 'student did not join':
          return { ...baseStyle, backgroundColor: '#f59e0b', color: 'white' }; // Orange
        case 'tutor did not join':
          return { ...baseStyle, backgroundColor: '#f97316', color: 'white' }; // Orange-red
        default:
          return { ...baseStyle, backgroundColor: '#6b7280', color: 'white' }; // Gray
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

  // Handle clicking on empty calendar slots
  const handleSelectSlot = useCallback((slotInfo) => {
    // Students typically can't create lessons directly, but you can customize this
    alert('To schedule a new lesson, please contact your tutor or use the booking system.');
  }, []);

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
          Loading lessons...
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
          <li>Click on completed lessons (green) to view details and notes</li>
          <li>Click on scheduled lessons (purple) to view upcoming lesson info</li>
          <li>Click on cancelled lessons (red) to see cancellation details</li>
          <li>Orange lessons indicate attendance issues</li>
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
          views={['week', 'month']}
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
        <h4 className={styles.currentEventsTitle}>My Lessons ({events.length}):</h4>
        <div className={styles.eventsList}>
          {events.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: '#666' }}>
              No lessons found
            </div>
          ) : (
            events
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => (
                <div key={event.id} className={styles.eventItem}>
                  <strong>Lesson</strong>
                  <br />
                  {moment(event.start).format('MMM D, YYYY h:mm A')}
                  <br />
                  <span style={{ 
                    color: 
                      event.lesson?.lessonStatus === 'completed' ? '#10b981' :
                      event.lesson?.lessonStatus === 'scheduled' ? '#8b5cf6' :
                      event.lesson?.lessonStatus === 'cancelled' ? '#ef4444' :
                      '#f59e0b',
                    fontSize: '12px'
                  }}>
                    Status: {event.lesson?.lessonStatus || 'Unknown'}
                  </span>
                  {event.lesson?.notes && (
                    <>
                      <br />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Notes: {event.lesson.notes}
                      </span>
                    </>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCalendar;