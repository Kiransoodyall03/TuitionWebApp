// src/components/calendarStudent.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarStudent.module.css';
import { useStudent } from '../../services/apiFunctions/student';
import { Booking, Student } from '../../services/types';
import { useUserContext } from '../../services/userContext';

const localizer = momentLocalizer(moment);

interface CalendarEventShape {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: 'scheduled' | 'pending' | 'completed' | 'cancelled' | 'student did not join' | 'tutor did not join' | 'unknown';
  booking: Booking;
}

interface StudentCalendarProps {
  onLessonClick?: (booking: Booking) => void;
}

const StudentCalendar: React.FC<StudentCalendarProps> = ({ onLessonClick }) => {
  const { fetchStudentBookings } = useStudent();
  const [events, setEvents] = useState<CalendarEventShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, userType } = useUserContext();
  if (userType !== 'student' || !user) return <div>Not a student.</div>;
  const student = user as Student;

  const convertBookingToEvent = (booking: Booking): CalendarEventShape => {
    const { date } = booking;
    const start = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const status = booking.confirmed ? 'scheduled' : 'pending';
    return {
      id: booking.bookingId,
      title: `${booking.subject}${booking.confirmed ? '' : ' (Pending)'}`,
      start,
      end,
      status,
      booking
    };
  };

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const bookings = await fetchStudentBookings(student.studentId);
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
  }, [fetchStudentBookings, student.studentId]);

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

  // Custom event button that notifies parent
  const CustomEvent: React.FC<{ event: CalendarEventShape }> = ({ event }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const booking = event.booking;
      if (booking && onLessonClick) {
        onLessonClick(booking);
      } else if (booking) {
        // fallback to alert
        alert(`Subject: ${booking.subject}\nDate: ${moment(event.start).format('MMM D, YYYY h:mm A')}`);
      }
    };

    const baseStyle: React.CSSProperties = {
      padding: '6px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      border: 'none'
    };

    const getEventStyle = (status: CalendarEventShape['status']): React.CSSProperties => {
      switch (status) {
        case 'completed': return { ...baseStyle, backgroundColor: '#10b981', color: 'white' };
        case 'scheduled': return { ...baseStyle, backgroundColor: '#8b5cf6', color: 'white' };
        case 'cancelled': return { ...baseStyle, backgroundColor: '#ef4444', color: 'white' };
        case 'student did not join': return { ...baseStyle, backgroundColor: '#f59e0b', color: 'white' };
        case 'tutor did not join': return { ...baseStyle, backgroundColor: '#f97316', color: 'white' };
        case 'pending': return { ...baseStyle, backgroundColor: '#6b7280', color: 'white' };
        default: return { ...baseStyle, backgroundColor: '#6b7280', color: 'white' };
      }
    };

    return (
      <button onClick={handleClick} style={getEventStyle(event.status)}
        onMouseOver={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'}
        onMouseOut={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
      >
        {event.title}
      </button>
    );
  };

  const handleSelectEvent = useCallback((event: any) => {
    const booking: Booking | undefined = event.booking;
    if (booking && onLessonClick) {
      onLessonClick(booking);
    } else if (booking) {
      alert(`Selected: ${event.title}`);
    } else {
      alert(`Selected: ${event.title}`);
    }
  }, [onLessonClick]);

  const handleSelectSlot = useCallback(() => {
    alert('To schedule a new lesson, please contact your tutor or use the booking system.');
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading lessons...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          Error: {error}
          <button onClick={refreshBookings} style={{ marginLeft: 10 }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={styles.title}>My Lessons Calendar</h2>
        <button onClick={refreshBookings} style={{ padding: '8px 16px', cursor: 'pointer' }}>Refresh</button>
      </div>

      <div className={styles.instructions}>
        <h4 className={styles.instructionsTitle}>Instructions:</h4>
        <ul className={styles.instructionsList}>
          <li>Click on confirmed lessons (purple) to view details and join</li>
          <li>Click on pending lessons (grey) to view details</li>
        </ul>
      </div>

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
          components={{ event: CustomEvent }}
          eventPropGetter={() => ({ style: { backgroundColor: 'transparent', border: 'none', padding: 0 } })}
        />
      </div>

      {/* Keep the small events list as a summary only (non-interactive) */}
      <div className={styles.currentEvents}>
        <h4 className={styles.currentEventsTitle}>My Lessons ({events.length}):</h4>
        <div className={styles.eventsList}>
          {events.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: '#666' }}>No lessons found</div>
          ) : (
            events.slice().sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(ev => (
              <div key={ev.id} className={styles.eventItem}>
                <strong>{ev.title}</strong><br />
                {moment(ev.start).format('MMM D, YYYY h:mm A')}<br />
                <span style={{ color: ev.status === 'scheduled' ? '#8b5cf6' : '#6b7280', fontSize: 12 }}>
                  Status: {ev.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCalendar;
