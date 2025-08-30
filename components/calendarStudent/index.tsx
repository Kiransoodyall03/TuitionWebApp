// src/components/calendarStudent.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarStudent.module.css';
import { useStudent } from '../../services/apiFunctions/student';
import { Booking } from '../../services/types';
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
  const [events, setEvents] = useState<CalendarEventShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get student data from context and hooks
  const { user, userType, userProfile, studentProfile } = useUserContext();
  const studentHook = useStudent();
  
  // Get studentId from studentProfile or userProfile
  const studentId = studentHook?.studentId || '';

  const convertBookingToEvent = (booking: Booking): CalendarEventShape => {
    const { date } = booking;
    const start = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    const duration = booking.durationMinutes || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);
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
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const bookings = await studentHook.fetchStudentBookings(studentId);
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
  }, [studentId]);

  const refreshBookings = async () => {
    if (!studentId) return;
    
    try {
      const bookings = await studentHook.fetchStudentBookings(studentId);
      const calendarEvents = bookings.map(convertBookingToEvent);
      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error refreshing bookings:', err);
      setError('Failed to refresh bookings');
    }
  };


  const handleSelectEvent = useCallback((event: any) => {
    const booking: Booking | undefined = event.booking;
    if (booking && onLessonClick) {
      onLessonClick(booking);
    } else if (booking) {
      alert(`Selected: ${event.title}\nStatus: ${booking.confirmed ? 'Confirmed' : 'Pending'}`);
    }
  }, [onLessonClick]);

  const handleSelectSlot = useCallback(() => {
    alert('To schedule a new lesson, please contact your tutor or use the booking system.');
  }, []);

  // Check if user is a student
  if (userType !== 'student' || !user) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Not authorized. Please log in as a student.
        </div>
      </div>
    );
  }

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

  // Filter for upcoming events only
  const upcomingEvents = events
    .filter(event => new Date(event.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const pastEvents = events
    .filter(event => new Date(event.start) < new Date())
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className={styles.title}>My Lessons Calendar</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {studentProfile?.subjects?.length || 0} Subjects | 
            {' '}{events.filter(e => e.booking?.confirmed).length} Confirmed | 
            {' '}{upcomingEvents.length} Upcoming
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
            <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Purple</span> - Confirmed lessons (click to join)
          </li>
          <li>
            <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Grey</span> - Pending confirmation
          </li>
          <li>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>Green</span> - Completed lessons
          </li>
        </ul>
      </div>

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
          eventPropGetter={() => ({ 
            style: { 
              backgroundColor: 'transparent', 
              border: 'none', 
              padding: 0 
            } 
          })}
        />
      </div>

      {/* Scrollable upcoming lessons list */}
      <div className={styles.currentEvents} style={{ position: 'relative' }}>
        <h4 className={styles.currentEventsTitle}>
          Upcoming Lessons ({upcomingEvents.length}):
        </h4>
        <div 
          style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#fafafa',
            position: 'relative'
          }}
        >
          {upcomingEvents.length === 0 ? (
            <div style={{ 
              fontStyle: 'italic', 
              color: '#666', 
              textAlign: 'center',
              padding: '20px' 
            }}>
              No upcoming lessons scheduled
            </div>
          ) : (
            upcomingEvents.map(event => (
              <div 
                key={event.id} 
                className={styles.eventItem}
                style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => event.booking && onLessonClick && onLessonClick(event.booking)}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>
                      {event.booking?.subject || event.title}
                    </strong>
                    <br />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {moment(event.start).format('MMM D, YYYY h:mm A')}
                    </span>
                    {event.booking?.durationMinutes && (
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                        ({event.booking.durationMinutes} min)
                      </span>
                    )}
                  </div>
                  <span style={{ 
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: event.booking?.confirmed ? '#dcfce7' : '#f3f4f6',
                    color: event.booking?.confirmed ? '#166534' : '#6b7280',
                    whiteSpace: 'nowrap'
                  }}>
                    {event.booking?.confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
                {event.booking?.extraDetails && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280', 
                    marginTop: '6px',
                    padding: '6px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px'
                  }}>
                    {event.booking.extraDetails}
                  </div>
                )}
                {event.booking?.meetingLink && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(event.booking.meetingLink, '_blank');
                    }}
                    style={{ 
                      fontSize: '12px', 
                      color: '#3b82f6',
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      marginTop: '4px'
                    }}
                  >
                    Join Meeting →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Optional: Past lessons summary */}
      {pastEvents.length > 0 && (
        <div className={styles.pastEvents} style={{ marginTop: '20px' }}>
          <h4 className={styles.pastEventsTitle} style={{ color: '#64748b', fontSize: '14px' }}>
            Recent Past Lessons ({pastEvents.slice(0, 5).length} of {pastEvents.length}):
          </h4>
          <div style={{ opacity: 0.7 }}>
            {pastEvents.slice(0, 5).map(event => (
              <div key={event.id} style={{ 
                fontSize: '12px', 
                padding: '4px 0',
                borderBottom: '1px solid #f1f5f9' 
              }}>
                <span>{event.booking?.subject}</span> - 
                <span style={{ marginLeft: '4px', color: '#94a3b8' }}>
                  {moment(event.start).format('MMM D')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar;