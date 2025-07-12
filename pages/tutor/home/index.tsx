// src/components/tutor/home/TutorHome.tsx

import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useUserContext } from '../../../services/userContext';
import { Tutor } from '../../../services/types';

import styles from './TutorHome.module.css';

const localizer = momentLocalizer(moment);

type TutorHomeProps = {
  navigation?: any;
};

export const TutorHome = ({ navigation }: TutorHomeProps) => {
  const { user, userType } = useUserContext();
  if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
  const tutor = user as Tutor;

  // ——————— Calendar state ———————
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Meeting',
      start: new Date(2024, 6, 10, 10, 0),
      end:   new Date(2024, 6, 10, 11, 0),
      type:  'meeting',
    },
    {
      id: 2,
      title: 'Project Review',
      start: new Date(2024, 6, 12, 14, 0),
      end:   new Date(2024, 6, 12, 15, 30),
      type:  'review',
    },
    {
      id: 3,
      title: 'Team Lunch',
      start: new Date(2024, 6, 15, 12, 0),
      end:   new Date(2024, 6, 15, 13, 0),
      type:  'social',
    },
  ]);

  // — Custom event renderer — 
  const CustomEvent = ({ event }) => {
    const handleClick = (e) => {
      e.stopPropagation();
      alert(`Clicked on: ${event.title}`);
    };

    const base = {
      padding:       '2px 8px',
      borderRadius:  '4px',
      cursor:        'pointer',
      fontSize:      '12px',
      fontWeight:    500,
      display:       'flex',
      alignItems:    'center',
      justifyContent:'center',
      width:         '100%',
      height:        '100%',
      transition:    'opacity 0.2s',
    };

    let style;
    switch (event.type) {
      case 'meeting': style = { ...base, backgroundColor: '#3b82f6', color: 'white' }; break;
      case 'review':  style = { ...base, backgroundColor: '#ef4444', color: 'white' }; break;
      case 'social':  style = { ...base, backgroundColor: '#10b981', color: 'white' }; break;
      default:        style = { ...base, backgroundColor: '#6b7280', color: 'white' };
    }

    return (
      <button
        style={style}
        onClick={handleClick}
        onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={e  => e.currentTarget.style.opacity = '1'}
      >
        {event.title}
      </button>
    );
  };

  // — Slot & event handlers —
  const handleSelectSlot = useCallback(slot => {
    const title = prompt('New event title:');
    if (!title) return;
    setEvents(ev => [
      ...ev,
      {
        id:    Date.now(),
        title,
        start: slot.start,
        end:   slot.end,
        type:  'meeting',
      }
    ]);
  }, []);

  const handleSelectEvent = useCallback(event => {
    alert(`Selected: ${event.title}`);
  }, []);

  return (
    <div className="flex-1 bg-white p-8">
      {/* — Info boxes — */}
      <div className={styles.container}>
        <h1 className={styles.heading}>Welcome, {tutor.username}</h1>
        <div className={styles.infoBoxes}>
          <div className={styles.box}>
            <h2>Upcoming Lessons</h2>
            <p>No upcoming lessons.</p>
          </div>
          <div className={styles.box}>
            <h2>Messages</h2>
            <p>No new messages.</p>
          </div>
          <div className={styles.box}>
            <h2>Tasks</h2>
            <p>No tasks assigned.</p>
          </div>
        </div>
      </div>

      {/* — Calendar Section — */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-50 p-6 rounded-lg border mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div><span>Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div><span>Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div><span>Social</span>
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
              selectable
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              components={{ event: CustomEvent }}
              eventPropGetter={() => ({
                style: { backgroundColor: 'transparent', border: 'none', padding: 0 }
              })}
            />
          </div>

          <p className="mt-4 text-sm text-gray-600">
            💡 Click an event to interact, or click empty slots to create new events
          </p>
        </div>
      </div>
    </div>
  );
};
