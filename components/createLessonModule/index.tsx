import React, { useState } from 'react';
import styles from './CreateLessonModal.module.css';
import '../../../styles/colors.css';
import { Booking } from '../../services/types';

type CreateLessonModalProps = {
  /** current tutor's ID to assign the booking */
  tutorId: string;
  /** list of student IDs (or names) for selection */
  students: string[];
  /** list of subjects for selection */
  subjects: string[];
  /** pre-selected date from calendar */
  selectedDate: Date;
  /** callback when modal should close */
  onClose: () => void;
  /** callback when a new booking is created */
  onSubmit: (booking: Booking) => void;
};

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({ tutorId, students, subjects, selectedDate, onClose, onSubmit }) => {
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [extraDetails, setExtraDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subject) return;

    const booking: Booking = {
      bookingId: Date.now().toString(),
      tutorId,
      studentId,
      date: {
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate(),
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      },
      subject,
      extraDetails,
      confirmed: false,
    };

    onSubmit(booking);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Create Lesson</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="student-select">Student:</label>
          <select
            id="student-select"
            className={styles.select}
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            required
          >
            <option value="" disabled>Select student</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className={styles.label} htmlFor="subject-select">Subject:</label>
          <select
            id="subject-select"
            className={styles.select}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
          >
            <option value="" disabled>Select subject</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className={styles.label} htmlFor="details-text">Extra Details:</label>
          <textarea
            id="details-text"
            className={styles.textarea}
            value={extraDetails}
            onChange={e => setExtraDetails(e.target.value)}
            rows={4}
          />

          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default CreateLessonModal;
