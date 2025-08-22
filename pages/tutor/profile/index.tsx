import React, { useState } from 'react';
import { ChevronDown, User, BookOpen, Clock, Calendar, Star, Settings, Link2, CheckCircle2 } from 'lucide-react';
import styles from './TutorProfile.module.css';
import { useUserContext } from '../../../services/userContext';

const ROLE_OPTIONS = ['Students', 'Subjects', 'Past Lessons', 'Upcoming Lessons', 'Reviews'];

// Mock user data for demonstration
const mockUser = {
  name: "Dr. Sarah Johnson",
  email: "sarah.johnson@email.com",
  avatar: "/api/placeholder/100/100"
};

const mockProfile = {
  bio: "Experienced mathematics tutor with 8+ years of teaching experience",
  subjects: ["Calculus", "Algebra", "Statistics"],
  rating: 4.8,
  totalStudents: 127
};

const Dropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.dropdown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.dropdownButton}
      >
        <span className={styles.dropdownText}>{selected}</span>
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>
      
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={styles.dropdownOption}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MicrosoftAccountConnection = () => {
  const { userProfile, linkMicrosoftToAccount, updateUserProfile, error, clearError } = useUserContext();
  const [status, setStatus] = useState({
    isConnected: false,
    userInfo: null,
    loading: true,
    error: null
  });
  const [isLinking, setIsLinking] = useState(false);

  React.useEffect(() => {
    checkConnectionStatus();
  }, [userProfile]);

  const checkConnectionStatus = () => {
    if (!userProfile) {
      setStatus({ isConnected: false, loading: false, userInfo: null, error: null });
      return;
    }

    const microsoftAuth = userProfile.microsoftAuth;
    
    if (microsoftAuth?.accessToken && microsoftAuth?.userInfo) {
      setStatus({
        isConnected: true,
        userInfo: microsoftAuth.userInfo,
        loading: false,
        error: null
      });
    } else {
      setStatus({
        isConnected: false,
        loading: false,
        userInfo: null,
        error: null
      });
    }
  };

  const handleConnect = async () => {
    setIsLinking(true);
    clearError();
    
    try {
      await linkMicrosoftToAccount();
    } catch (error) {
      console.error('Error linking Microsoft account:', error);
      setStatus(prev => ({ ...prev, error: 'Failed to connect Microsoft account' }));
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Microsoft account? This will disable Teams meeting creation.')) {
      return;
    }

    try {
      setIsLinking(true);
      await updateUserProfile({ microsoftAuth: null });
      setStatus({ isConnected: false, loading: false, userInfo: null, error: null });
    } catch (error) {
      console.error('Error disconnecting Microsoft account:', error);
      setStatus(prev => ({ ...prev, error: 'Failed to disconnect Microsoft account' }));
    } finally {
      setIsLinking(false);
    }
  };

  if (status.loading) {
    return (
      <div className={styles.microsoftConnection}>
        <div className={styles.microsoftContent}>
          <div className={styles.microsoftIcon}>
            <div className={styles.loadingSpinner}></div>
          </div>
          <div className={styles.microsoftText}>
            <span className={styles.loadingText}>Checking Microsoft account status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.microsoftConnection}>
      {/* Error Display */}
      {(error || status.error) && (
        <div className={styles.errorMessage}>
          <p className={styles.errorText}>{error || status.error}</p>
        </div>
      )}

      <div className={styles.microsoftContent}>
        <div className={styles.microsoftIconContainer}>
          {/* Microsoft Logo */}
          <svg className={styles.microsoftLogo} viewBox="0 0 23 23" fill="none">
            <path d="M0 0h11v11H0z" fill="#f25022"/>
            <path d="M12 0h11v11H12z" fill="#7fba00"/>
            <path d="M0 12h11v11H0z" fill="#00a4ef"/>
            <path d="M12 12h11v11H12z" fill="#ffb900"/>
          </svg>
        </div>
        
        <div className={styles.microsoftText}>
          <h3 className={styles.microsoftTitle}>Microsoft Account</h3>
          {status.isConnected ? (
            <div className={styles.connectionStatus}>
              <div className={styles.connectedStatus}>
                <CheckCircle2 className={styles.checkIcon} />
                <span className={styles.connectedText}>Connected</span>
              </div>
              {status.userInfo && (
                <div className={styles.userInfo}>
                  <p className={styles.userName}>{status.userInfo.displayName}</p>
                  <p className={styles.userEmail}>{status.userInfo.mail || status.userInfo.userPrincipalName}</p>
                </div>
              )}
              <p className={styles.statusDescription}>
                Teams meetings will be created automatically for new bookings
              </p>
            </div>
          ) : (
            <div className={styles.connectionStatus}>
              <div className={styles.disconnectedStatus}>
                <span className={styles.disconnectedText}>⚠ Not connected</span>
              </div>
              <p className={styles.statusDescription}>
                Connect to automatically create Teams meetings for your lessons
              </p>
            </div>
          )}
        </div>

        <div className={styles.microsoftActions}>
          {status.isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={isLinking}
              className={styles.disconnectButton}
            >
              {isLinking ? (
                <div className={styles.buttonLoading}>
                  <div className={styles.buttonSpinner}></div>
                  <span>Disconnecting...</span>
                </div>
              ) : (
                'Disconnect'
              )}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLinking}
              className={styles.connectButton}
            >
              {isLinking ? (
                <div className={styles.buttonLoading}>
                  <div className={styles.buttonSpinner}></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect Account'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info Section for Tutors */}
      {userProfile?.userType === 'tutor' && (
        <div className={styles.infoSection}>
          <div className={styles.infoIcon}>
            <svg className={styles.infoIconSvg} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className={styles.infoText}>
            Connecting your Microsoft account enables automatic Teams meeting creation for all your tutoring sessions.
          </p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color = "blue" }) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.statContent}>
        <div className={`${styles.statIcon} ${styles[`statIcon${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
          <Icon className={styles.iconSize} />
        </div>
        <div>
          <p className={styles.statValue}>{value}</p>
          <p className={styles.statLabel}>{label}</p>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ title, content, index }) => {
  return (
    <div className={`${styles.infoBox} ${styles[`infoBoxGradient${(index % 5) + 1}`]}`}>
      <h4 className={styles.infoBoxTitle}>{title}</h4>
      <p className={styles.infoBoxContent}>{content}</p>
    </div>
  );
};

export const TutorProfile = () => {
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0]);
  const { user, userType, userProfile, tutorProfile } = useUserContext();
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerNav}>
            <h1 className={styles.headerTitle}>
              Tutor Dashboard
            </h1>
            <button className={styles.settingsButton}>
              <Settings className={styles.settingsIcon} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>
              {mockUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className={styles.profileDetails}>
              <h2 className={styles.profileName}>{userProfile.displayName}</h2>
              <p className={styles.profileEmail}>{userProfile.email}</p>
              <p className={styles.profileBio}>{tutorProfile.bio}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <StatCard icon={User} label="Total Students" value={mockProfile.totalStudents} color="blue" />
            <StatCard icon={BookOpen} label="Subjects" value={mockProfile.subjects.length} color="green" />
            <StatCard icon={Star} label="Rating" value={mockProfile.rating} color="orange" />
            <StatCard icon={Clock} label="Hours Taught" value="340+" color="purple" />
          </div>
        </div>

        {/* Microsoft Account Integration */}
        <div className={styles.microsoftSection}>
          <MicrosoftAccountConnection />
        </div>

        {/* Role Selection */}
        <div className={styles.roleSelection}>
          <h3 className={styles.roleTitle}>View Dashboard</h3>
          <div className={styles.roleDropdownContainer}>
            <Dropdown 
              label="Select view"
              options={ROLE_OPTIONS}
              selected={selectedRole}
              onChange={setSelectedRole}
            />
            <div className={styles.selectedInfo}>
              <p className={styles.selectedText}>
                Currently viewing: <span className={styles.selectedRole}>{selectedRole}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <InfoBox 
              key={i}
              title={`${selectedRole} Overview ${i + 1}`}
              content={`Detailed information about your ${selectedRole.toLowerCase()} will be displayed here. This section provides comprehensive insights and analytics.`}
              index={i}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
          <div className={styles.actionsGrid}>
            <button className={styles.actionCard}>
              <Calendar className={styles.actionIcon} />
              <p className={styles.actionTitle}>Schedule Lesson</p>
              <p className={styles.actionDescription}>Book a new tutoring session</p>
            </button>
            <button className={styles.actionCard}>
              <User className={styles.actionIcon} />
              <p className={styles.actionTitle}>Manage Students</p>
              <p className={styles.actionDescription}>View and update student profiles</p>
            </button>
            <button className={styles.actionCard}>
              <BookOpen className={styles.actionIcon} />
              <p className={styles.actionTitle}>Course Materials</p>
              <p className={styles.actionDescription}>Upload and organize resources</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;