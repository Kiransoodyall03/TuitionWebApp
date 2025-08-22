// components/CreateLessonModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './createLessonModal.module.css';
import { Booking, Student } from '../../services/types';
import { useTutor } from '../../services/apiFunctions/tutor';
import { collection, addDoc, updateDoc, doc, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

type CreateLessonModalProps = {
  tutorId: string;
  selectedDate: Date;
  onClose: () => void;
  onSubmit: (booking: Booking) => void;
};

// Extended student interface to include user profile data
interface StudentWithProfile extends Student {
  displayName?: string;
  email?: string;
}

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  tutorId,
  selectedDate,
  onClose,
  onSubmit,
}) => {
  const [studentsList, setStudentsList] = useState<StudentWithProfile[]>([]);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const tutorHook = useTutor();
  const { fetchTutorStudents, tutorUserId } = tutorHook || {};

  useEffect(() => {
    const fetchStudentsWithProfiles = async () => {
      // Use tutorUserId if available, otherwise fall back to tutorId
      const searchId = tutorUserId || tutorId;
      
      if (!searchId || !fetchTutorStudents) {
        console.log('Search ID or fetchTutorStudents is undefined, skipping student fetch');
        setStudentsList([]);
        return;
      }

      try {
        console.log('Fetching students for searchId:', searchId);
        
        // Fetch students assigned to this tutor
        const students = await fetchTutorStudents(searchId);
        console.log('Fetched students:', students);
        
        // Fetch all user profiles
        const usersSnapshot = await getDocs(query(collection(db, 'users')));
        const usersMap = new Map();
        usersSnapshot.forEach(doc => {
          const userData = { ...doc.data(), uid: doc.id };
          usersMap.set(doc.id, userData);
        });

        // Combine student data with user profiles
        const studentsWithProfiles = students.map(student => {
          const userProfile = usersMap.get(student.userId);
          return {
            ...student,
            displayName: userProfile?.displayName,
            email: userProfile?.email,
          };
        });

        console.log('Students with profiles:', studentsWithProfiles);
        setStudentsList(studentsWithProfiles);
      } catch (err) {
        console.error('Failed to fetch students with profiles', err);
        setStudentsList([]);
      }
    };

    fetchStudentsWithProfiles();
  }, [tutorId, tutorUserId, fetchTutorStudents]);

  // derive subjects for selected student
  const studentSubjects = React.useMemo(() => {
    const selectedStudent = studentsList.find(s => s.studentId === studentId);
    if (!selectedStudent || !selectedStudent.subjects) return [];
    
    // Handle both string array and object array formats
    return selectedStudent.subjects
      .map(s => {
        if (typeof s === 'string') return s;
        return s.subjectName;
      })
      .filter((subjectName): subjectName is string => 
        typeof subjectName === 'string' && subjectName.length > 0
      );
  }, [studentsList, studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subject) return;

    setIsLoading(true);
    setApiError(null);

    const booking: Booking = {
      tutorId,
      studentId,
      bookingId: '', // will be set after Firestore write
      date: {
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate(),
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      },
      subject,
      extraDetails,
      durationMinutes: durationMinutes,
      confirmed: false,
    };

    try {
      // 1) Save booking to Firestore immediately
      const bookingRef = await addDoc(collection(db, 'bookings'), booking);

      // 2) Call API route for Teams meeting creation
      const startTime = new Date(selectedDate);
      const endTime = new Date(selectedDate.getTime() + durationMinutes * 60 * 1000);

      const response = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingRef.id,
          tutorId,
          subject,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      console.log('API Response Status:', response.status);
      const result = await response.json();
      console.log('API Response Body:', result);

      if (!response.ok) {
        console.error('API call failed with status:', response.status);
        console.error('Error details:', result);
      }
      
      if (result.success) {
        // Update the booking with Teams meeting info if successful
        const finalBooking = { 
          ...booking, 
          bookingId: bookingRef.id,
          meetingLink: result.teamsJoinUrl
        };
        
        // Update Firestore with meeting link
        if (result.teamsJoinUrl) {
          await updateDoc(doc(db, 'bookings', bookingRef.id), {
            meetingLink: result.teamsJoinUrl,
            teamsMeetingId: result.teamsMeetingId
          });
        }
        
        setCreatedBooking(finalBooking);
        onSubmit(finalBooking);
      } else {
        // Booking created but no Teams meeting
        const finalBooking = { ...booking, bookingId: bookingRef.id };
        setCreatedBooking(finalBooking);
        onSubmit(finalBooking);
        
        if (result.error) {
          setApiError(`Booking created, but Teams meeting failed: ${result.error}`);
        }
      }

    } catch (err) {
      console.error('Error creating booking with Teams meeting:', err);
      setApiError('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setCreatedBooking(null);
    onClose();
  };

  const copyMeetingLink = async () => {
    const link = createdBooking?.meetingLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Create Lesson</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isLoading}>
            &times;
          </button>
        </header>

        {!createdBooking ? (
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
                  {s.displayName || s.username || `Student ${s.studentId}`} - Grade {s.grade}
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

            {/* DURATION */}
            <label className={styles.label} htmlFor="duration">
              Duration (minutes):
            </label>
            <input
              id="duration"
              type="number"
              min={15}
              step={15}
              className={styles.input}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
            />

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

            {apiError && <div className={styles.error}>{apiError}</div>}

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Creating Lesson with Teams Meeting...' : 'Submit'}
            </button>
          </form>
        ) : (
          // Success / meeting info view
          <div className={styles.result}>
            <h3>Lesson created successfully!</h3>
            <p>Booking ID: {createdBooking.bookingId}</p>

            {createdBooking.meetingLink ? (
              <>
                <p>
                  <strong>Teams meeting created:</strong>
                </p>
                <div className={styles.meetingRow}>
                  <a href={createdBooking.meetingLink} target="_blank" rel="noopener noreferrer">
                    Open Teams Meeting
                  </a>
                  <button onClick={copyMeetingLink} className={styles.smallBtn}>
                    Copy link
                  </button>
                </div>
                <p className={styles.small}>Tip: open the meeting to check the built-in Whiteboard in Teams.</p>
              </>
            ) : (
              <p>
                The lesson was created. Teams meeting creation failed - you may need to reconnect your Microsoft account.
              </p>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={handleDone} className={styles.submitBtn}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLessonModal;