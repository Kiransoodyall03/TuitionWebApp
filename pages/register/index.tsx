import React, { useState } from 'react';
import { useUserContext } from '../../services/userContext';
import { UserType, Student } from '../../services/types';
import styles from './Register.module.css';

interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  userType: UserType | '';
  subjects: string[];
  bio: string;
  contactNumber: string;
  hourlyRate: number;
  grade: number;
}

const RegistrationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    userType: '',
    subjects: [],
    bio: '',
    contactNumber: '',
    hourlyRate: 0,
    grade: 12
  });

  // Notice: use the isLoading from context so UI matches the register call state
  const { register, error, clearError, isLoading: contextLoading } = useUserContext();
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableSubjects = [
    'Mathematics', 'English', 'Science', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art'
  ];

  const handleInputChange = (field: keyof RegistrationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) clearError();
    if (localError) setLocalError(null);
  };

  const handleSubjectToggle = (subject: string) => {
    setForm(prev => (prev.subjects.includes(subject)
      ? { ...prev, subjects: prev.subjects.filter(s => s !== subject) }
      : { ...prev, subjects: [...prev.subjects, subject] }
    ));
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
        if (form.userType === 'tutor' && form.subjects.length === 0) {
          setLocalError('Please select at least one subject you can teach.');
          return false;
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

    // Final validation
    if (!validateStep(3)) return;

    // Build additional data
    const additionalData: any = {
      displayName: form.displayName,
      subjects: form.subjects
    };
    if (form.userType === 'tutor') {
      additionalData.bio = form.bio;
      additionalData.contactNumber = form.contactNumber;
      additionalData.hourlyRate = form.hourlyRate;
    } else {
      additionalData.grade = form.grade;
    }

    console.log('Submitting registration for', form.email, 'type', form.userType);
    try {
      await register(form.email, form.password, form.userType as UserType, additionalData);
      // If register resolves without throwing — show success and redirect
      setSuccess(true);
      console.log('Registration successful — redirecting to login page.');
      
      // Redirect after showing success message for 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (err) {
      // register should already set context error, but catch unexpected issues
      console.error('Registration failed (unexpected):', err);
      setLocalError('Registration failed. Check console for details.');
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
        <div>
          <label>
            <input 
              type="radio" 
              name="userType" 
              value="student" 
              checked={form.userType === 'student'}
              onChange={(e) => handleInputChange('userType', e.target.value)} 
              disabled={contextLoading}
            />
            Student
          </label>
          <label style={{ marginLeft: 12 }}>
            <input 
              type="radio" 
              name="userType" 
              value="tutor" 
              checked={form.userType === 'tutor'}
              onChange={(e) => handleInputChange('userType', e.target.value)} 
              disabled={contextLoading}
            />
            Tutor
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
            <p className={styles.validationError}>Password strength: {passwordStrength}</p>
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
      
      {/* Subjects selection */}
      <div className={styles.formSection}>
        <label className={styles.sectionLabel}>
          {form.userType === 'tutor' ? 'Subjects you can teach:' : 'Subjects you need help with:'}
        </label>
        <div className={styles.subjectsGrid}>
          {availableSubjects.map(subject => (
            <label key={subject} className={`${styles.subjectOption} ${form.subjects.includes(subject) ? styles.selected : ''}`}>
              <input 
                type="checkbox" 
                checked={form.subjects.includes(subject)}
                onChange={() => handleSubjectToggle(subject)} 
                disabled={contextLoading} 
              />
              <span className={styles.subjectLabel}>{subject}</span>
            </label>
          ))}
        </div>
      </div>

      {form.userType === 'tutor' && (
        <>
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
            <input 
              type="number" 
              value={form.hourlyRate || ''} 
              onChange={(e) => handleInputChange('hourlyRate', Number(e.target.value))}
              className={styles.input} 
              placeholder="Hourly Rate (R)" 
              min="0" 
              disabled={contextLoading} 
            />
          </div>
        </>
      )}

      {form.userType === 'student' && (
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
          disabled={contextLoading || (form.userType === 'tutor' && form.subjects.length === 0)}
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

        {/* show validation / server errors */}
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