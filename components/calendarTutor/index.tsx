// Solution 1: Fix the height issue in your TutorCalendar component

import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './calendarTutor.module.css';
import CreateLessonModal from '../createLessonmodal';
import { Booking, Student, Tutor } from '../../services/types'; // Adjust path as needed
import { useUserContext } from '../../services/userContext';
const localizer = momentLocalizer(moment);

const TutorCalendar = () => {
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Meeting',
      start: new Date(2025, 6, 10, 10, 0),
      end: new Date(2025, 6, 10, 11, 0),
      type: 'meeting',
      clickable: true
    },
    {
      id: 2,
      title: 'Project Review',
      start: new Date(2025, 6, 12, 14, 0),
      end: new Date(2025, 6, 12, 15, 30),
      type: 'review',
      clickable: true
    },
    {
      id: 3,
      title: 'Team Lunch',
      start: new Date(2025, 6, 15, 12, 0),
      end: new Date(2025, 6, 15, 13, 0),
      type: 'social',
      clickable: true
    }
  ]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  // Mock data - replace with actual data from your context/props
  const students = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson"];
  const subjects = ["Mathematics", "Physics", "Chemistry", "English", "History"];
  const { user, userType } = useUserContext();
  if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
  const tutor = user as Tutor;
  const CustomEvent = ({ event }) => {
    const handleEventClick = (e) => {
      e.stopPropagation();
      console.log('Event clicked:', event);
      alert(`Clicked on: ${event.title}`);
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

  const handleSubmitLesson = (booking: Booking) => {
    // Create a new event from the booking
    const newEvent = {
      id: Date.now(),
      title: `${booking.subject}`,
      start: selectedSlot!,
      end: new Date(selectedSlot!.getTime() + 60 * 60 * 1000), // 1 hour duration
      type: 'lesson',
      clickable: true,
      booking: booking
    };

    setEvents(prev => [...prev, newEvent]);
    handleCloseModal();
    
    // Here you would typically also save to your backend
    console.log('New lesson created:', booking);
  };

  const handleSelectEvent = useCallback((event) => {
    console.log('Selected event:', event);
    alert(`Selected: ${event.title}`);
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Interactive Calendar</h2>      
      <div className={styles.instructions}>
        <h4 className={styles.instructionsTitle}>Instructions:</h4>
        <ul className={styles.instructionsList}>
          <li>Click on any event button to interact with it</li>
          <li>Click on empty calendar slots to create new lessons</li>
          <li>Events are styled by type (lesson=purple, meeting=blue, review=red, social=green)</li>
          <li>Hover over events to see hover effects</li>
        </ul>
      </div>

      {/* FIXED: Added proper height and container styling */}
      <div className={styles.calendarWrapper} style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views = {['week']}
          defaultView="week"
          min={new Date(1970, 1, 1, 8, 0)}
          max={new Date(1970, 1, 1, 22, 0)}
          style={{ height: '100%' }} // Changed from height: '600' to height: '100%'
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
        <h4 className={styles.currentEventsTitle}>Current Events:</h4>
        <div className={styles.eventsList}>
          {events.map(event => (
            <div key={event.id} className={styles.eventItem}>
              {event.title} - {moment(event.start).format('MMM D, h:mm A')}
            </div>
          ))}
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