import React, { useState, useEffect } from 'react';
import styles from './createLessonModal.module.css';
import { Booking, Student } from '../../services/types';
import { useTutor } from '../../services/apiFunctions/tutor';
import { useAuth } from '../../services/apiFunctions/useAuth';

type CreateLessonModalProps = {
  tutorId: string;
  selectedDate: Date;
  onClose: () => void;
  onSubmit: (booking: Booking) => void;
};

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  tutorId,
  selectedDate,
  onClose,
  onSubmit,
}) => {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [extraDetails, setExtraDetails] = useState('');

  const { fetchTutorStudents } = useTutor();
  const { createBooking } = useAuth();

  // fetch students on mount
  useEffect(() => {
    fetchTutorStudents(tutorId)
      .then(setStudentsList)
      .catch(err => console.error('Failed to fetch students', err));
  }, [tutorId, fetchTutorStudents]);

  // derive subjects for selected student
  const studentSubjects = React.useMemo(() => {
    const sel = studentsList.find(s => s.studentId === studentId);
    return sel?.subjects.map(s => s.subjectName) ?? [];
  }, [studentsList, studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      // 1) Write to Firestore
      await createBooking(booking);

      // 2) Notify parent & close
      onSubmit(booking);
      onClose();
    } catch (err) {
      console.error('Error creating booking:', err);
      // Optionally show the user an error message here
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Create Lesson</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* STUDENT SELECT */}
          <label className={styles.label} htmlFor="student-select">
            Student:
          </label>
          <select
            id="student-select"
            className={styles.select}
            value={studentId}
            onChange={e => {
              setStudentId(e.target.value);
              setSubject('');
            }}
            required
          >
            <option value="" disabled>
              {studentsList.length ? 'Select student' : 'Loading...'}
            </option>
            {studentsList.map(s => (
              <option key={s.studentId} value={s.studentId}>
                {s.username}
              </option>
            ))}
          </select>

          {/* SUBJECT SELECT */}
          <label className={styles.label} htmlFor="subject-select">
            Subject:
          </label>
          <select
            id="subject-select"
            className={styles.select}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            disabled={!studentId}
          >
            <option value="" disabled>
              {studentId
                ? studentSubjects.length
                  ? 'Select subject'
                  : 'No subjects found'
                : 'Select a student first'}
            </option>
            {studentSubjects.map(subj => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>

          {/* EXTRA DETAILS */}
          <label className={styles.label} htmlFor="details-text">
            Extra Details:
          </label>
          <textarea
            id="details-text"
            className={styles.textarea}
            value={extraDetails}
            onChange={e => setExtraDetails(e.target.value)}
            rows={4}
          />

          <button type="submit" className={styles.submitBtn}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateLessonModal;
