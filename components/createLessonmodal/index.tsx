// components/CreateLessonModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './createLessonModal.module.css';
import { Booking, StudentProfile, UserProfile, SubjectProgress } from '../../services/types';
import { useUserContext } from '../../services/userContext';
import { collection, addDoc, updateDoc, doc, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

type CreateLessonModalProps = {
  selectedDate: Date;
  onClose: () => void;
  onSubmit: (booking: Booking) => void;
};

// Extended student interface to include user profile data
interface StudentWithProfile extends StudentProfile {
  displayName: string;
  email: string;
}

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  selectedDate,
  onClose,
  onSubmit,
}) => {
  const [studentsList, setStudentsList] = useState<StudentWithProfile[]>([]);
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tutor information from user context
  const { userProfile, tutorProfile, userType } = useUserContext();
  
  // Get the tutorId from the authenticated user
  const tutorId = userProfile?.uid || '';
  const isTutor = userType === 'tutor';

  useEffect(() => {
    const fetchStudentsWithProfiles = async () => {
      if (!tutorId || !isTutor) {
        console.log('Not a tutor or tutorId not available');
        setStudentsList([]);
        return;
      }

      try {
        console.log('Fetching students for tutor:', tutorId);
        
        // Fetch all student profiles
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const allStudents: StudentProfile[] = [];
        
        studentsSnapshot.forEach(doc => {
          const studentData = { ...doc.data(), uid: doc.id } as StudentProfile;
          allStudents.push(studentData);
        });

        // Fetch user profiles to get display names and emails
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map<string, UserProfile>();
        
        usersSnapshot.forEach(doc => {
          const userData = { ...doc.data(), uid: doc.id } as UserProfile;
          usersMap.set(doc.id, userData);
        });

        // Filter students who have subjects with this tutor assigned
        const tutorStudents = allStudents.filter(student => {
          return student.subjects.some((subjectProgress: SubjectProgress) => 
            subjectProgress.tutorId === tutorId
          );
        });

        // If no students found via subject assignments, check bookings for existing relationships
        let relevantStudents = tutorStudents;
        
        if (tutorStudents.length === 0) {
          const bookingsSnapshot = await getDocs(
            query(collection(db, 'bookings'), where('tutorId', '==', tutorId))
          );
          
          const studentIdsSet = new Set<string>();
          bookingsSnapshot.forEach(doc => {
            const booking = doc.data() as Booking;
            if (booking.studentId) {
              studentIdsSet.add(booking.studentId);
            }
          });

          relevantStudents = allStudents.filter(s => studentIdsSet.has(s.uid));
        }

        // Combine student data with user profiles
        const studentsWithProfiles: StudentWithProfile[] = relevantStudents.map(student => {
          const userProfile = usersMap.get(student.uid);
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
  }, [tutorId, isTutor]);

  // Update student email when student is selected
  useEffect(() => {
    const selectedStudent = studentsList.find(s => s.uid === studentId);
    if (selectedStudent) {
      setStudentEmail(selectedStudent.email || '');
    }
  }, [studentId, studentsList]);

  // derive subjects for selected student that are assigned to this tutor
  const studentSubjects = React.useMemo(() => {
    const selectedStudent = studentsList.find(s => s.uid === studentId);
    if (!selectedStudent || !selectedStudent.subjects) return [];
    
    // Filter subjects where this tutor is assigned
    return selectedStudent.subjects
      .filter((subjectProgress: SubjectProgress) => 
        subjectProgress.tutorId === tutorId
      )
      .map((subjectProgress: SubjectProgress) => subjectProgress.subjectName)
      .filter((subjectName): subjectName is string => 
        typeof subjectName === 'string' && subjectName.length > 0
      );
  }, [studentsList, studentId, tutorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!studentId || !subject) {
      setError('Please select a student and subject');
      return;
    }
    
    if (!tutorId) {
      setError('Tutor ID not found. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const booking: Omit<Booking, 'bookingId'> = {
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
      durationMinutes: durationMinutes,
      confirmed: false, // Start as unconfirmed - will be confirmed when Teams meeting is created
    };

    try {
      // Validate that all required fields are defined
      if (!booking.tutorId || !booking.studentId) {
        throw new Error('Missing required fields: tutorId or studentId');
      }

      // Save booking to Firestore
      const bookingRef = await addDoc(collection(db, 'bookings'), booking);
      const bookingId = bookingRef.id;

      // Update the booking with its own ID
      await updateDoc(doc(db, 'bookings', bookingId), {
        bookingId: bookingId,
        // Store student email for Teams meeting creation later
        studentEmail: studentEmail || null,
        tutorEmail: userProfile?.email || null
      });

      const finalBooking: Booking = {
        ...booking,
        bookingId,
      };

      console.log('Booking created successfully:', finalBooking);
      
      // Call onSubmit to notify parent component
      onSubmit(finalBooking);
      
      // Close the modal
      onClose();

    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not a tutor
  if (!isTutor) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <header className={styles.header}>
            <h2>Access Denied</h2>
            <button className={styles.closeBtn} onClick={onClose}>
              &times;
            </button>
          </header>
          <div className={styles.form}>
            <p>Only tutors can create lessons.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Create Lesson</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isLoading}>
            &times;
          </button>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Info message */}
          <div className={styles.info} style={{ 
            background: '#e3f2fd', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            border: '1px solid #2196f3'
          }}>
            <strong>ℹ️ How it works:</strong>
            <br />
            <small>
              1. Create the lesson booking here<br />
              2. The lesson will appear in your calendar as "unconfirmed"<br />
              3. Click on the lesson to confirm it and create a Teams meeting<br />
              4. Share the meeting link with your student
            </small>
          </div>

          {/* Debug info - remove in production */}
          {!tutorId && (
            <div className={styles.error}>
              Warning: Tutor ID not found. Please refresh the page or log in again.
            </div>
          )}

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
              {studentsList.length ? 'Select student' : 'Loading students...'}
            </option>
            {studentsList.map(s => (
              <option key={s.uid} value={s.uid}>
                {s.displayName || `Student ${s.uid}`}
                {s.grade ? ` - Grade ${s.grade}` : ''}
                {s.email ? ` (${s.email})` : ''}
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
                  : 'No subjects assigned to you for this student'
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
            Extra Details (Optional):
          </label>
          <textarea
            id="details-text"
            className={styles.textarea}
            value={extraDetails}
            onChange={e => setExtraDetails(e.target.value)}
            rows={4}
            placeholder="Any additional notes for this lesson..."
          />

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonGroup} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isLoading}
              style={{ 
                flex: 1,
                padding: '10px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isLoading || !tutorId}
              style={{ 
                flex: 2,
                padding: '10px',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Creating Booking...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLessonModal;