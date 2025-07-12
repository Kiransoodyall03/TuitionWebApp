// src/components/tutor/home/TutorHome.tsx

import React from 'react';
import { useUserContext } from '../../../services/userContext';
import { Tutor } from '../../../services/types';
import TutorCalendar from '../../../components/calendarTutor';
import styles from './TutorHome.module.css';

type TutorHomeProps = {
  navigation?: any;
};

export const TutorHome = ({ navigation }: TutorHomeProps) => {
  const { user, userType } = useUserContext();
  if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
  const tutor = user as Tutor;

  return (
    <div className="flex-1 bg-white p-8">
      {/* — Info boxes — */}
      <div className={styles.container}>
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
        <TutorCalendar />
      </div>
    </div>
  );
};