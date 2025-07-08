import React, { useState } from 'react';
import { Dropdown } from '../../../components/dropdown';
import styles from './TutorProfile.module.css';

const ROLE_OPTIONS = ['Students', 'Subjects', 'Past Lessons', 'Upcoming Lessons', 'Reviews'];

export const TutorProfile: React.FC = () => {
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0]);

  return (
    <div className={styles.page}>
      <div >
        <div className={styles.card}>
          <h1 className={styles.heading}>Select View</h1>
          <Dropdown 
            label="Select role"
            options={ROLE_OPTIONS}
            selected={role}
            onChange={(v) => setRole(v)}
          />
          <p className={styles.selectedText}>
            You are viewing: <strong>{role}</strong>
          </p>
        </div>
      </div>

      <div className={styles.boxContainer}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.box}>
            <h4>Box {i + 1}</h4>
            <p>No Information on <strong>{role}</strong></p>
          </div>
        ))}
      </div>
    </div>
  );
  
  
};

export default TutorProfile;
