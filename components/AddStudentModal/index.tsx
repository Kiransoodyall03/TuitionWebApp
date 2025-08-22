import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Plus } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useUserContext } from '../../services/userContext';
import { Student } from '../../services/types';
import styles from './AddStudentModal.module.css';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded?: () => void;
}

interface EligibleStudent extends Student {
  availableSubjects: string[];
  displayName?: string;
  email?: string;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onStudentAdded }) => {
  const [availableStudents, setAvailableStudents] = useState<EligibleStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const { tutorProfile } = useUserContext();
  const tutorId = tutorProfile?.userId || '';
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
        getDocs(query(collection(db, 'students'))),
        getDocs(query(collection(db, 'users')))
      ]);
      
      console.log('Total students found:', studentsSnapshot.size);
      console.log('Total users found:', usersSnapshot.size);
      
      // Create a map of userId to user data for quick lookup
      const usersMap = new Map();
      usersSnapshot.forEach(doc => {
        const userData = { ...doc.data(), uid: doc.id };
        usersMap.set(doc.id, userData);
      });
      
      const eligibleStudents: EligibleStudent[] = [];
      
      studentsSnapshot.forEach(doc => {
        const student = { ...doc.data(), studentId: doc.id } as Student;
        const userProfile = usersMap.get(student.userId);
        
        console.log('Processing student with userId:', student.userId);
        console.log('Found user profile:', userProfile);
        console.log('Student subjects:', student.subjects);
        
        // Ensure student.subjects is an array
        const studentSubjects = Array.isArray(student.subjects) ? student.subjects : [];
        
        // Check if student has any subjects that match tutor's subjects
        // and doesn't already have a tutor assigned for those subjects
        const matchingSubjects = tutorSubjects.filter(tutorSubject => {
          console.log('Checking tutor subject:', tutorSubject);
          
          // Check if student has this subject
          const studentSubject = studentSubjects.find(s => {
            // Handle both string and object formats
            const subjectName = typeof s === 'string' ? s : s?.subjectName;
            console.log('Comparing with student subject:', subjectName);
            return subjectName?.toLowerCase().trim() === tutorSubject?.toLowerCase().trim();
          });
          
          if (!studentSubject) {
            console.log('Student does not have subject:', tutorSubject);
            return false;
          }
          
          // If student subject is a string, they don't have a tutor yet
          if (typeof studentSubject === 'string') {
            console.log('Student subject is string, no tutor assigned yet');
            return true;
          }
          
          // If it's an object, check if tutorId is empty
          const hasTutor = studentSubject.tutorId && studentSubject.tutorId !== '';
          console.log('Student subject tutorId:', studentSubject.tutorId, 'has tutor:', hasTutor);
          
          return !hasTutor;
        });
        
        console.log('Matching subjects for student:', matchingSubjects);
        
        if (matchingSubjects.length > 0 && userProfile) {
          eligibleStudents.push({
            ...student,
            // Add user profile data for display
            displayName: userProfile.displayName,
            email: userProfile.email,
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
      const studentRef = doc(db, 'students', selectedStudent);
      const student = availableStudents.find(s => s.studentId === selectedStudent);
      
      if (!student) {
        throw new Error('Student not found');
      }
      
      // Update the student's subjects array to assign the tutor
      const updatedSubjects = student.subjects.map(subject => {
        if (subject.subjectName === selectedSubject) {
          return {
            ...subject,
            tutorId: tutorId
          };
        }
        return subject;
      });

      // Update student document
      await updateDoc(studentRef, {
        subjects: updatedSubjects,
        tutorIds: arrayUnion(tutorId)
      });

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
                  {student.displayName || student.username || `Student ${student.studentId}`} - Grade {student.grade}
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
                <p><strong>Student:</strong> {availableStudents.find(s => s.studentId === selectedStudent)?.displayName || availableStudents.find(s => s.studentId === selectedStudent)?.username || 'Unknown Student'}</p>
                <p><strong>Subject:</strong> {selectedSubject}</p>
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