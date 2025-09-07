import React, { useState } from 'react';
import { useUserContext } from '../../services/userContext';
import { UserType, Student } from '../../services/types';
import styles from './Register.module.css';

interface SubjectWithDetails {
  subjectName: string;
  currentMark: number;
  targetMark: number;
  tutorId: string;
}

interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  userType: UserType | '';
  tutorAccessCode: string; // New field for tutor access code
  
  // Tutor-specific fields
  tutorSubjects: string[];
  bio: string;
  contactNumber: string;
  hourlyRate: number;
  
  // Student-specific fields
  studentSubjects: SubjectWithDetails[];
  grade: number;
  parentName: string;
  parentEmail: string;
  parentContactNumber: string;
  tokens: number;
}

const RegistrationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showTutorCodeModal, setShowTutorCodeModal] = useState(false);
  const [tutorCodeError, setTutorCodeError] = useState<string | null>(null);
  const [form, setForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    userType: '',
    tutorAccessCode: '',
    
    // Tutor fields
    tutorSubjects: [],
    bio: '',
    contactNumber: '',
    hourlyRate: 0,
    
    // Student fields
    studentSubjects: [],
    grade: 12,
    parentName: '',
    parentEmail: '',
    parentContactNumber: '',
    tokens: 0
  });

  const { register, error, clearError, isLoading: contextLoading } = useUserContext();
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Set your tutor access code here - in production, this should be in environment variables
  const TUTOR_ACCESS_CODE = 'TEACH2025'; // Change this to your desired code

  const availableSubjects = [
    'Mathematics', 'English', 'Science', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art'
  ];

  const handleInputChange = (field: keyof RegistrationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) clearError();
    if (localError) setLocalError(null);
  };

  const handleUserTypeSelection = (type: string) => {
    if (type === 'tutor') {
      // Show modal for tutor code
      setShowTutorCodeModal(true);
      setTutorCodeError(null);
    } else {
      // Direct selection for student
      handleInputChange('userType', type);
      handleInputChange('tutorAccessCode', ''); // Clear any tutor code
    }
  };

  const validateTutorCode = () => {
    if (form.tutorAccessCode.trim().toUpperCase() === TUTOR_ACCESS_CODE.toUpperCase()) {
      handleInputChange('userType', 'tutor');
      setShowTutorCodeModal(false);
      setTutorCodeError(null);
    } else {
      setTutorCodeError('Invalid access code. Please contact the administrator if you need tutor access.');
    }
  };

  const cancelTutorSelection = () => {
    setShowTutorCodeModal(false);
    setTutorCodeError(null);
    handleInputChange('tutorAccessCode', '');
    handleInputChange('userType', '');
  };

  // For tutor subjects (simple string array)
  const handleTutorSubjectToggle = (subject: string) => {
    setForm(prev => (prev.tutorSubjects.includes(subject)
      ? { ...prev, tutorSubjects: prev.tutorSubjects.filter(s => s !== subject) }
      : { ...prev, tutorSubjects: [...prev.tutorSubjects, subject] }
    ));
  };

  // For student subjects (complex objects)
  const handleStudentSubjectToggle = (subjectName: string) => {
    setForm(prev => {
      const existingIndex = prev.studentSubjects.findIndex(s => s.subjectName === subjectName);
      
      if (existingIndex >= 0) {
        // Remove subject
        const newSubjects = prev.studentSubjects.filter(s => s.subjectName !== subjectName);
        return { ...prev, studentSubjects: newSubjects };
      } else {
        // Add subject with default values
        const newSubject: SubjectWithDetails = {
          subjectName,
          currentMark: 0,
          targetMark: 75,
          tutorId: '' // Will be assigned when student chooses a tutor
        };
        return { ...prev, studentSubjects: [...prev.studentSubjects, newSubject] };
      }
    });
  };

  // Update student subject marks
  const updateStudentSubjectMark = (subjectName: string, field: 'currentMark' | 'targetMark', value: number) => {
    setForm(prev => ({
      ...prev,
      studentSubjects: prev.studentSubjects.map(s => 
        s.subjectName === subjectName 
          ? { ...s, [field]: value }
          : s
      )
    }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return 'weak';
    if (password.length < 10 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return 'medium';
    return 'strong';
  };
  const passwordStrength = getPasswordStrength(form.password);

  const validateStep = (step: number) => {
    setLocalError(null);
    
    switch (step) {
      case 1:
        if (!form.displayName.trim()) {
          setLocalError('Please enter your full name.');
          return false;
        }
        if (!form.email.trim()) {
          setLocalError('Please enter your email address.');
          return false;
        }
        if (!form.userType) {
          setLocalError('Please select an account type.');
          return false;
        }
        return true;
        
      case 2:
        if (!form.password) {
          setLocalError('Please enter a password.');
          return false;
        }
        if (form.password !== form.confirmPassword) {
          setLocalError('Passwords do not match.');
          return false;
        }
        if (form.password.length < 6) {
          setLocalError('Password must be at least 6 characters long.');
          return false;
        }
        return true;
        
      case 3:
        if (form.userType === 'tutor') {
          if (form.tutorSubjects.length === 0) {
            setLocalError('Please select at least one subject you can teach.');
            return false;
          }
        } else if (form.userType === 'student') {
          if (form.studentSubjects.length === 0) {
            setLocalError('Please select at least one subject you need help with.');
            return false;
          }
          if (!form.parentName.trim()) {
            setLocalError('Please enter parent/guardian name.');
            return false;
          }
          if (!form.parentEmail.trim()) {
            setLocalError('Please enter parent/guardian email.');
            return false;
          }
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(false);

    if (!validateStep(3)) return;

    // Build additional data based on user type
    const additionalData: any = {
      displayName: form.displayName,
    };

    if (form.userType === 'tutor') {
      additionalData.subjects = form.tutorSubjects;
      additionalData.bio = form.bio;
      additionalData.contactNumber = form.contactNumber;
      additionalData.hourlyRate = form.hourlyRate;
    } else if (form.userType === 'student') {
      // For StudentProfile (simpler structure used in Firebase)
      additionalData.subjects = form.studentSubjects;
      additionalData.grade = form.grade;
      additionalData.parentName = form.parentName;
      additionalData.parentEmail = form.parentEmail;
      additionalData.parentContactNumber = form.parentContactNumber;
      additionalData.tokens = form.tokens;
      additionalData.tutorIds = []; // Empty initially
      additionalData.parentId = ''; // Will be set if parent creates account
    }

    console.log('Submitting registration for', form.email, 'type', form.userType);
    try {
      await register(form.email, form.password, form.userType as UserType, additionalData);
      setSuccess(true);
      console.log('Registration successful — redirecting to login page.');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (err) {
      console.error('Registration failed:', err);
      setLocalError('Registration failed. Please try again.');
    }
  };

  const renderStep1 = () => (
    <div>
      <h3 className={styles.stepTitle}>Basic Information</h3>
      <div className={styles.formSection}>
        <input 
          type="text" 
          value={form.displayName}
          onChange={(e) => handleInputChange('displayName', e.target.value)}
          className={styles.input} 
          placeholder="Full Name" 
          required 
          disabled={contextLoading} 
        />
      </div>

      <div className={styles.formSection}>
        <input 
          type="email" 
          value={form.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={styles.input} 
          placeholder="Email Address" 
          required 
          disabled={contextLoading} 
        />
      </div>

      <div className={styles.formSection}>
        <label className={styles.sectionLabel}>Account Type</label>
        <div className={styles.userTypeOptions}>
          <label className={`${styles.userTypeOption} ${form.userType === 'student' ? styles.selected : ''}`}>
            <input 
              type="radio" 
              name="userType" 
              value="student" 
              checked={form.userType === 'student'}
              onChange={(e) => handleUserTypeSelection(e.target.value)} 
              disabled={contextLoading}
              className={styles.userTypeRadio}
            />
            <div className={styles.userTypeContent}>
              <h4>Student</h4>
              <p>I need help with my studies</p>
            </div>
          </label>
          <label className={`${styles.userTypeOption} ${form.userType === 'tutor' ? styles.selected : ''}`}>
            <input 
              type="radio" 
              name="userType" 
              value="tutor" 
              checked={form.userType === 'tutor'}
              onChange={(e) => handleUserTypeSelection(e.target.value)} 
              disabled={contextLoading}
              className={styles.userTypeRadio}
            />
            <div className={styles.userTypeContent}>
              <h4>Tutor</h4>
              <p>I want to teach students</p>
              {form.userType === 'tutor' && (
                <span style={{fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 'bold'}}>
                  ✓ Access verified
                </span>
              )}
            </div>
          </label>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button 
          type="button" 
          onClick={handleNext}
          disabled={contextLoading}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Next
        </button>
      </div>

      {/* Tutor Access Code Modal */}
      {showTutorCodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
              Tutor Access Required
            </h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Please enter the tutor access code to register as a tutor.
            </p>
            <input
              type="password"
              value={form.tutorAccessCode}
              onChange={(e) => handleInputChange('tutorAccessCode', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && validateTutorCode()}
              className={styles.input}
              placeholder="Enter access code"
              autoFocus
              style={{ marginBottom: '0.5rem', width: '100%' }}
            />
            {tutorCodeError && (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '0.875rem', 
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: '#fee2e2',
                borderRadius: '4px'
              }}>
                {tutorCodeError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancelTutorSelection}
                className={`${styles.button} ${styles.buttonSecondary}`}
                style={{ marginRight: '0.5rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={validateTutorCode}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 className={styles.stepTitle}>Security</h3>
      <div className={styles.formSection}>
        <input 
          type="password" 
          value={form.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          className={styles.input} 
          placeholder="Password" 
          required 
          disabled={contextLoading} 
        />
        {form.password && (
          <div className={styles.passwordStrength}>
            <div className={styles.strengthBar}>
              <div className={`${styles.strengthFill} ${styles[`strength${passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}`]}`}></div>
            </div>
            <p className={styles.strengthText}>Password strength: {passwordStrength}</p>
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <input 
          type="password" 
          value={form.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          className={styles.input} 
          placeholder="Confirm Password" 
          required 
          disabled={contextLoading} 
        />
      </div>

      <div className={styles.buttonGroup}>
        <button 
          type="button" 
          onClick={handlePrevious}
          disabled={contextLoading}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Previous
        </button>
        <button 
          type="button" 
          onClick={handleNext}
          disabled={contextLoading}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 className={styles.stepTitle}>
        {form.userType === 'tutor' ? 'Teaching Profile' : 'Student Profile'}
      </h3>
      
      {/* TUTOR PROFILE */}
      {form.userType === 'tutor' && (
        <>
          <div className={styles.formSection}>
            <label className={styles.sectionLabel}>Subjects you can teach:</label>
            <div className={styles.subjectsGrid}>
              {availableSubjects.map(subject => (
                <label key={subject} className={`${styles.subjectOption} ${form.tutorSubjects.includes(subject) ? styles.selected : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={form.tutorSubjects.includes(subject)}
                    onChange={() => handleTutorSubjectToggle(subject)} 
                    disabled={contextLoading}
                    className={styles.subjectCheckbox}
                  />
                  <span className={styles.subjectLabel}>{subject}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formSection}>
            <textarea 
              value={form.bio} 
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className={`${styles.input} ${styles.textarea}`} 
              placeholder="Tell students about yourself..." 
              rows={3} 
              disabled={contextLoading} 
            />
          </div>

          <div className={styles.formSection}>
            <input 
              type="tel" 
              value={form.contactNumber} 
              onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              className={styles.input} 
              placeholder="Contact Number" 
              disabled={contextLoading} 
            />
          </div>

          <div className={styles.formSection}>
            <label className={styles.sectionLabel}>Hourly Rate (R)</label>
            <input 
              type="number" 
              value={form.hourlyRate || ''} 
              onChange={(e) => handleInputChange('hourlyRate', Number(e.target.value))}
              className={styles.input} 
              placeholder="0" 
              min="0" 
              disabled={contextLoading} 
            />
          </div>
        </>
      )}

      {/* STUDENT PROFILE */}
      {form.userType === 'student' && (
        <>
          <div className={styles.formSection}>
            <label className={styles.sectionLabel}>Grade Level</label>
            <select 
              value={form.grade} 
              onChange={(e) => handleInputChange('grade', Number(e.target.value))}
              className={styles.input} 
              disabled={contextLoading}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => 
                <option key={g} value={g}>Grade {g}</option>
              )}
            </select>
          </div>

          <div className={styles.formSection}>
            <label className={styles.sectionLabel}>Subjects you need help with:</label>
            <div className={styles.subjectsGrid}>
              {availableSubjects.map(subject => (
                <label 
                  key={subject} 
                  className={`${styles.subjectOption} ${form.studentSubjects.some(s => s.subjectName === subject) ? styles.selected : ''}`}
                >
                  <input 
                    type="checkbox" 
                    checked={form.studentSubjects.some(s => s.subjectName === subject)}
                    onChange={() => handleStudentSubjectToggle(subject)} 
                    disabled={contextLoading}
                    className={styles.subjectCheckbox}
                  />
                  <span className={styles.subjectLabel}>{subject}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Show mark inputs for selected subjects */}
          {form.studentSubjects.length > 0 && (
            <div className={styles.formSection}>
              <label className={styles.sectionLabel}>Subject Details (Optional)</label>
              <div className={styles.subjectMarks}>
                {form.studentSubjects.map(subject => (
                  <div key={subject.subjectName} className={styles.subjectMarkRow}>
                    <span className={styles.subjectMarkName}>{subject.subjectName}</span>
                    <div className={styles.markInputs}>
                      <input
                        type="number"
                        value={subject.currentMark}
                        onChange={(e) => updateStudentSubjectMark(subject.subjectName, 'currentMark', Number(e.target.value))}
                        className={styles.markInput}
                        placeholder="Current %"
                        min="0"
                        max="100"
                        disabled={contextLoading}
                      />
                      <input
                        type="number"
                        value={subject.targetMark}
                        onChange={(e) => updateStudentSubjectMark(subject.subjectName, 'targetMark', Number(e.target.value))}
                        className={styles.markInput}
                        placeholder="Target %"
                        min="0"
                        max="100"
                        disabled={contextLoading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formSection}>
            <label className={styles.sectionLabel}>Parent/Guardian Information</label>
            <input 
              type="text" 
              value={form.parentName} 
              onChange={(e) => handleInputChange('parentName', e.target.value)}
              className={styles.input} 
              placeholder="Parent/Guardian Name" 
              required
              disabled={contextLoading} 
            />
          </div>

          <div className={styles.formSection}>
            <input 
              type="email" 
              value={form.parentEmail} 
              onChange={(e) => handleInputChange('parentEmail', e.target.value)}
              className={styles.input} 
              placeholder="Parent/Guardian Email" 
              required
              disabled={contextLoading} 
            />
          </div>

          <div className={styles.formSection}>
            <input 
              type="tel" 
              value={form.parentContactNumber} 
              onChange={(e) => handleInputChange('parentContactNumber', e.target.value)}
              className={styles.input} 
              placeholder="Parent/Guardian Contact Number" 
              disabled={contextLoading} 
            />
          </div>
        </>
      )}

      <div className={styles.buttonGroup}>
        <button 
          type="button" 
          onClick={handlePrevious}
          disabled={contextLoading}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Previous
        </button>
        <button 
          type="submit" 
          disabled={contextLoading || 
            (form.userType === 'tutor' && form.tutorSubjects.length === 0) ||
            (form.userType === 'student' && form.studentSubjects.length === 0)}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          {contextLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className={styles.register}>
        <div>
          <h2 className={styles.heading}>Create Account</h2>
          <div className={styles.progressBar}>
            <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.active : ''}`}>1</div>
            <div className={`${styles.progressStep} ${currentStep >= 2 ? styles.active : ''}`}>2</div>
            <div className={`${styles.progressStep} ${currentStep >= 3 ? styles.active : ''}`}>3</div>
          </div>
        </div>

        {(localError || error) && (
          <div className={styles.error}>
            {localError ?? error}
          </div>
        )}

        {success && (
          <div className={styles.success}>
            Account created successfully! Redirecting to login page...
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.stepContent}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;