import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Student } from '../../../services/types';
import { useUserContext } from '../../../services/userContext';

const localizer = momentLocalizer(moment);

type StudentHomeProps = {
  navigation?: any;
};

export const StudentHome = ({ navigation }: StudentHomeProps) => {
  const { user, userType } = useUserContext();
  if (userType !== 'student' || !user) return <div>Not a Student.</div>;
  const student = user as Student;

  // Calendar state
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Math Tutoring',
      start: new Date(2024, 6, 10, 10, 0),
      end: new Date(2024, 6, 10, 11, 0),
      type: 'tutoring',
      clickable: true
    },
    {
      id: 2,
      title: 'Study Group',
      start: new Date(2024, 6, 12, 14, 0),
      end: new Date(2024, 6, 12, 15, 30),
      type: 'study',
      clickable: true
    },
    {
      id: 3,
      title: 'Assignment Due',
      start: new Date(2024, 6, 15, 23, 59),
      end: new Date(2024, 6, 15, 23, 59),
      type: 'deadline',
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
        case 'tutoring':
          return { ...baseStyle, backgroundColor: '#f59e0b', color: 'white' }; // Orange for tutoring
        case 'study':
          return { ...baseStyle, backgroundColor: '#10b981', color: 'white' }; // Green for study
        case 'deadline':
          return { ...baseStyle, backgroundColor: '#ef4444', color: 'white' }; // Red for deadlines
        default:
          return { ...baseStyle, backgroundColor: '#6b7280', color: 'white' };
      }
    };

    return (
      <button
        style={getEventStyle(event.type)}
        onClick={handleEventClick}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.opacity = '0.8';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.opacity = '1';
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
        type: 'study',
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
    <div className="flex-1 bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Sessions</h3>
            <p className="text-3xl font-bold text-orange-600">3</p>
            <p className="text-sm text-gray-600">This Week</p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-green-600">12</p>
            <p className="text-sm text-gray-600">This Month</p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Study Hours</h3>
            <p className="text-3xl font-bold text-blue-600">24</p>
            <p className="text-sm text-gray-600">This Week</p>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deadlines</h3>
            <p className="text-3xl font-bold text-red-600">2</p>
            <p className="text-sm text-gray-600">Coming Up</p>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-gray-50 p-6 rounded-lg border mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Tutoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Study</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Deadline</span>
              </div>
            </div>
          </div>

          <div style={{ height: '500px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
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

          <div className="mt-4 text-sm text-gray-600">
            <p>💡 Click on any event to interact with it, or click on empty slots to create new events</p>
          </div>
        </div>
      </div>
    </div>
  );
};