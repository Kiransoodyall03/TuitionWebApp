import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './calendarTutor.module.css';

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

  // Custom event component with interactable elements
  const CustomEvent = ({ event }) => {
    const handleEventClick = (e) => {
      e.stopPropagation();
      console.log('Event clicked:', event);
      // Here you would open your modal or handle the interaction
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

  // Handle clicking on empty calendar slots
  const handleSelectSlot = useCallback((slotInfo) => {
    const title = window.prompt('Enter event title:');
    if (title) {
      const newEvent = {
        id: Date.now(),
        title,
        start: slotInfo.start,
        end: slotInfo.end,
        type: 'meeting',
        clickable: true
      };
      setEvents(prev => [...prev, newEvent]);
    }
  }, []);

  // Handle selecting existing events
  const handleSelectEvent = useCallback((event) => {
    console.log('Selected event:', event);
    // This is where you'd open your modal
    alert(`Selected: ${event.title}`);
  }, []);

  return (
    <div className={styles.container}>
        <h2 className={styles.title}>Interactive Calendar</h2>      
        <div className={styles.instructions}>
            <h4 className={styles.instructionsTitle}>Instructions:</h4>
                <ul className={styles.instructionsList}>
                    <li>Click on any event button to interact with it</li>
                    <li>Click on empty calendar slots to create new events</li>
                    <li>Events are styled by type (meeting=blue, review=red, social=green)</li>
                    <li>Hover over events to see hover effects</li>
                </ul>
        </div>

    <div className={styles.calendarWrapper}>
    <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '600' }}
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
    </div>
  );
};

export default TutorCalendar;