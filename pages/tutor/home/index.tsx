import { useUserContext } from "../../../services/userContext";
import { Tutor } from "../../../services/types";
import styles from './TutorHome.module.css';

import InteractiveCalendar from "../../../components/calendar/index"; // adjust the path if needed


type TutorHomeProps = {
  navigation?: any;
};

export const TutorHome = ({ navigation }: TutorHomeProps) => {
    const { user, userType } = useUserContext();
    if (userType !== 'tutor' || !user) return <div>Not a tutor.</div>;
    const tutor = user as Tutor;
    return (
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
    
        <div className={styles.calendarSection}>
          <InteractiveCalendar />
        </div>
      </div>
    );
    
};
