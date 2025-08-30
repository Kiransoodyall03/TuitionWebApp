import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Plus } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useUserContext } from '../../services/userContext';
import { Student, StudentProfile, UserProfile } from '../../services/types';
import styles from './AddStudentModal.module.css';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded?: () => void;
}

interface EligibleStudent {
  studentId: string;
  studentProfile: StudentProfile;
  userProfile: UserProfile;
  availableSubjects: string[];
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onStudentAdded }) => {
  const [availableStudents, setAvailableStudents] = useState<EligibleStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const { tutorProfile, userProfile } = useUserContext();
  const tutorId = userProfile?.uid || '';
  const tutorSubjects = tutorProfile?.subjects || [];

  useEffect(() => {
    if (isOpen && tutorSubjects.length > 0) {
      fetchAvailableStudents();
    }
  }, [isOpen, tutorSubjects]);

  const fetchAvailableStudents = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Fetching students for tutor subjects:', tutorSubjects);
      
      // Get all students and users in parallel
      const [studentsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'users'))
      ]);
      
      console.log('Total students found:', studentsSnapshot.size);
      console.log('Total users found:', usersSnapshot.size);
      
      // Create a map of userId to user data for quick lookup
      const usersMap = new Map<string, UserProfile>();
      usersSnapshot.forEach(doc => {
        const userData = { ...doc.data(), uid: doc.id } as UserProfile;
        usersMap.set(doc.id, userData);
      });
      
      const eligibleStudents: EligibleStudent[] = [];
      
      studentsSnapshot.forEach(doc => {
        const studentProfile = { ...doc.data(), userId: doc.id } as StudentProfile;
        const userProfile = usersMap.get(studentProfile.userId);
        
        console.log('Processing student with userId:', studentProfile.userId);
        console.log('Found user profile:', userProfile);
        console.log('Student subjects:', studentProfile.subjects);
        
        if (!userProfile) {
          console.log('No user profile found for student:', studentProfile.userId);
          return;
        }
        
        // Ensure student.subjects is an array
        const studentSubjects = Array.isArray(studentProfile.subjects) ? studentProfile.subjects : [];
        
        // Check if student has any subjects that match tutor's subjects
        // and doesn't already have a tutor assigned for those subjects
        const matchingSubjects = tutorSubjects.filter(tutorSubject => {
          console.log('Checking tutor subject:', tutorSubject);
          
          // Check if student has this subject
          const studentHasSubject = studentSubjects.some(s => {
            // Handle both string and object formats
            if (typeof s === 'string') {
              return s.toLowerCase().trim() === tutorSubject.toLowerCase().trim();
            } else if (typeof s === 'object' && s !== null && 'subjectName' in s) {
              // It's a full subject object - check if this subject already has a tutor
              if (s.subjectName.toLowerCase().trim() === tutorSubject.toLowerCase().trim()) {
                // Return true only if no tutor is assigned
                return !s.tutorId || s.tutorId === '';
              }
            }
            return false;
          });
          
          return studentHasSubject;
        });
        
        console.log('Matching subjects for student:', matchingSubjects);
        
        if (matchingSubjects.length > 0) {
          eligibleStudents.push({
            studentId: studentProfile.userId,
            studentProfile,
            userProfile,
            availableSubjects: matchingSubjects
          });
        }
      });
      
      console.log('Eligible students found:', eligibleStudents.length);
      setAvailableStudents(eligibleStudents);
    } catch (err) {
      console.error('Error fetching available students:', err);
      setError('Failed to load available students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentChange = (studentId: string): void => {
    setSelectedStudent(studentId);
    setSelectedSubject(''); // Reset subject selection when student changes
  };

  const getAvailableSubjectsForStudent = (): string[] => {
    if (!selectedStudent) return [];
    const student = availableStudents.find(s => s.studentId === selectedStudent);
    return student?.availableSubjects || [];
  };

  const handleAddStudent = async (): Promise<void> => {
    if (!selectedStudent || !selectedSubject) {
      setError('Please select both a student and subject');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const student = availableStudents.find(s => s.studentId === selectedStudent);
      
      if (!student) {
        throw new Error('Student not found');
      }
      
      // Update the student's subjects array to assign the tutor
      const updatedSubjects = student.studentProfile.subjects.map(subject => {
        // Handle both string and object formats
        if (typeof subject === 'string') {
          // Convert string to object format when assigning tutor
          if (subject.toLowerCase().trim() === selectedSubject.toLowerCase().trim()) {
            return {
              subjectName: subject,
              tutorId: tutorId,
              currentMark: 0,
              targetMark: 75
            };
          }
          return subject;
        } else if (typeof subject === 'object' && subject !== null && 'subjectName' in subject) {
          // Update existing object
          if (subject.subjectName === selectedSubject) {
            return {
              ...subject,
              tutorId: tutorId
            };
          }
        }
        return subject;
      });

      // Update student document in Firebase
      const studentRef = doc(db, 'students', selectedStudent);
      await updateDoc(studentRef, {
        subjects: updatedSubjects
      });

      // Also update the tutor document to add this student to their studentIds array
      const tutorRef = doc(db, 'tutors', tutorId);
      
      // First check if the tutor document exists
      const tutorDoc = await getDoc(tutorRef);
      if (tutorDoc.exists()) {
        // Update existing tutor document
        await updateDoc(tutorRef, {
          studentIds: arrayUnion(selectedStudent)
        });
      } else {
        // If tutor document doesn't exist, we might need to create it
        // This shouldn't happen in normal flow, but handling it just in case
        console.warn('Tutor document not found, cannot update studentIds');
      }

      // Call the callback to refresh parent component
      if (onStudentAdded) {
        onStudentAdded();
      }

      // Reset form and close modal
      setSelectedStudent('');
      setSelectedSubject('');
      onClose();
      
    } catch (err) {
      console.error('Error adding student:', err);
      setError('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (): void => {
    setSelectedStudent('');
    setSelectedSubject('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <Plus className={styles.iconSize} />
            </div>
            <div>
              <h2 className={styles.title}>Add Student</h2>
              <p className={styles.subtitle}>Assign a student to your tutoring subjects</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeButton}>
            <X className={styles.iconSize} />
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <User className={styles.labelIcon} />
              Select Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => handleStudentChange(e.target.value)}
              className={styles.select}
              disabled={isLoading}
            >
              <option value="">Choose a student...</option>
              {availableStudents.map(student => (
                <option key={student.studentId} value={student.studentId}>
                  {student.userProfile.displayName || `Student ${student.studentId}`} 
                  {student.studentProfile.grade && ` - Grade ${student.studentProfile.grade}`}
                  {student.userProfile.email && ` (${student.userProfile.email})`}
                </option>
              ))}
            </select>
            {availableStudents.length === 0 && !isLoading && (
              <p className={styles.noStudents}>
                No available students found for your subjects
              </p>
            )}
          </div>

          {selectedStudent && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <BookOpen className={styles.labelIcon} />
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className={styles.select}
                disabled={isLoading}
              >
                <option value="">Choose a subject...</option>
                {getAvailableSubjectsForStudent().map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedStudent && selectedSubject && (
            <div className={styles.selectedInfo}>
              <h4 className={styles.selectedTitle}>Assignment Summary:</h4>
              <div className={styles.selectedDetails}>
                <p>
                  <strong>Student:</strong> {
                    availableStudents.find(s => s.studentId === selectedStudent)?.userProfile.displayName || 
                    'Unknown Student'
                  }
                </p>
                <p>
                  <strong>Email:</strong> {
                    availableStudents.find(s => s.studentId === selectedStudent)?.userProfile.email || 
                    'No email'
                  }
                </p>
                <p>
                  <strong>Grade:</strong> {
                    availableStudents.find(s => s.studentId === selectedStudent)?.studentProfile.grade || 
                    'Not specified'
                  }
                </p>
                <p><strong>Subject:</strong> {selectedSubject}</p>
                <p><strong>Tutor:</strong> {tutorProfile?.userId ? 'You' : 'Unknown'}</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            onClick={handleClose} 
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleAddStudent}
            className={styles.addButton}
            disabled={isLoading || !selectedStudent || !selectedSubject}
          >
            {isLoading ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;