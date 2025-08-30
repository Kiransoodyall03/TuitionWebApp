import React, { useState, useEffect } from 'react';
import { ChevronDown, User, BookOpen, Clock, Calendar, Star, Settings, Link2, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';
import styles from './TutorProfile.module.css';
import { useUserContext } from '../../../services/userContext';
import { useTutor } from '../../../services/apiFunctions/tutor';

const ROLE_OPTIONS = ['Students', 'Subjects', 'Past Lessons', 'Upcoming Lessons', 'Reviews'];

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

const StatCard = ({ icon: Icon, label, value, color = "blue", loading = false }) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.statContent}>
        <div className={`${styles.statIcon} ${styles[`statIcon${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
          <Icon className={styles.iconSize} />
        </div>
        <div>
          <p className={styles.statValue}>{loading ? '...' : value}</p>
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
  const { fetchTotalStatistics, fetchWeeklyStatistics } = useTutor();
  
  // State for statistics
  const [totalStats, setTotalStats] = useState({
    totalEarnings: 0,
    totalHours: 0,
    totalStudents: 0
  });
  
  const [weeklyStats, setWeeklyStats] = useState({
    weeklyEarnings: 0,
    weeklyHours: 0,
    weeklyLessons: 0
  });
  
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch statistics on mount
  useEffect(() => {
    const loadAllStatistics = async () => {
      setStatsLoading(true);
      try {
        // Fetch both total and weekly statistics
        const [total, weekly] = await Promise.all([
          fetchTotalStatistics(),
          fetchWeeklyStatistics()
        ]);
        
        setTotalStats(total);
        setWeeklyStats(weekly);
      } catch (error) {
        console.error('Error loading profile statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadAllStatistics();
  }, [fetchTotalStatistics, fetchWeeklyStatistics]);

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerNav}>
            <h1 className={styles.headerTitle}>
              Tutor Profile & Statistics
            </h1>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>
              {userProfile?.displayName?.split(' ').map(n => n[0]).join('') || 'T'}
            </div>
            <div className={styles.profileDetails}>
              <h2 className={styles.profileName}>{userProfile?.displayName || 'Tutor'}</h2>
              <p className={styles.profileEmail}>{userProfile?.email}</p>
              {tutorProfile?.hourlyRate && (
                <p className={styles.hourlyRate}>
                  Hourly Rate: {formatCurrency(tutorProfile.hourlyRate)}
                </p>
              )}
            </div>
          </div>

          {/* Total Stats Grid - All Time Statistics */}
          <div className={styles.statsGrid}>
            <StatCard 
              icon={DollarSign} 
              label="Total Earnings" 
              value={formatCurrency(totalStats.totalEarnings)} 
              color="green"
              loading={statsLoading}
            />
            <StatCard 
              icon={Clock} 
              label="Total Hours" 
              value={formatHours(totalStats.totalHours)} 
              color="purple"
              loading={statsLoading}
            />
            <StatCard 
              icon={User} 
              label="Total Students" 
              value={totalStats.totalStudents} 
              color="blue"
              loading={statsLoading}
            />
            <StatCard 
              icon={BookOpen} 
              label="Subjects" 
              value={tutorProfile?.subjects?.length || 0} 
              color="orange"
              loading={statsLoading}
            />
          </div>
        </div>

        {/* Weekly Performance Section */}
        <div className={styles.weeklySection}>
          <h3 className={styles.sectionTitle}>This Week's Performance</h3>
          <div className={styles.weeklyStats}>
            <div className={styles.weeklyStatItem}>
              <TrendingUp className={styles.weeklyIcon} />
              <div>
                <p className={styles.weeklyLabel}>Weekly Earnings</p>
                <p className={styles.weeklyValue}>
                  {statsLoading ? '...' : formatCurrency(weeklyStats.weeklyEarnings)}
                </p>
              </div>
            </div>
            <div className={styles.weeklyStatItem}>
              <Clock className={styles.weeklyIcon} />
              <div>
                <p className={styles.weeklyLabel}>Weekly Hours</p>
                <p className={styles.weeklyValue}>
                  {statsLoading ? '...' : formatHours(weeklyStats.weeklyHours)}
                </p>
              </div>
            </div>
            <div className={styles.weeklyStatItem}>
              <Calendar className={styles.weeklyIcon} />
              <div>
                <p className={styles.weeklyLabel}>Weekly Lessons</p>
                <p className={styles.weeklyValue}>
                  {statsLoading ? '...' : weeklyStats.weeklyLessons}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Microsoft Account Integration */}
        <div className={styles.microsoftSection}>
          <MicrosoftAccountConnection />
        </div>

        {/* Achievement Milestones */}
        <div className={styles.achievementsSection}>
          <h3 className={styles.sectionTitle}>Achievements</h3>
          <div className={styles.achievementsGrid}>
            {totalStats.totalHours >= 10 && (
              <div className={styles.achievement}>
                <Star className={styles.achievementIcon} style={{ color: '#fbbf24' }} />
                <span>10+ Hours Teaching</span>
              </div>
            )}
            {totalStats.totalHours >= 50 && (
              <div className={styles.achievement}>
                <Star className={styles.achievementIcon} style={{ color: '#fbbf24' }} />
                <span>50+ Hours Teaching</span>
              </div>
            )}
            {totalStats.totalHours >= 100 && (
              <div className={styles.achievement}>
                <Star className={styles.achievementIcon} style={{ color: '#fbbf24' }} />
                <span>100+ Hours Master</span>
              </div>
            )}
            {totalStats.totalStudents >= 5 && (
              <div className={styles.achievement}>
                <User className={styles.achievementIcon} style={{ color: '#60a5fa' }} />
                <span>5+ Students</span>
              </div>
            )}
            {totalStats.totalStudents >= 10 && (
              <div className={styles.achievement}>
                <User className={styles.achievementIcon} style={{ color: '#60a5fa' }} />
                <span>10+ Students</span>
              </div>
            )}
            {totalStats.totalEarnings >= 5000 && (
              <div className={styles.achievement}>
                <DollarSign className={styles.achievementIcon} style={{ color: '#34d399' }} />
                <span>R5k+ Earned</span>
              </div>
            )}
            {totalStats.totalEarnings >= 10000 && (
              <div className={styles.achievement}>
                <DollarSign className={styles.achievementIcon} style={{ color: '#34d399' }} />
                <span>R10k+ Earned</span>
              </div>
            )}
            {totalStats.totalEarnings >= 50000 && (
              <div className={styles.achievement}>
                <DollarSign className={styles.achievementIcon} style={{ color: '#34d399' }} />
                <span>R50k+ Top Earner</span>
              </div>
            )}
          </div>
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

        {/* Content Grid - Now shows real data based on selection */}
        <div className={styles.contentGrid}>
          {selectedRole === 'Students' && (
            <>
              <InfoBox 
                title="Total Students"
                content={`You have taught ${totalStats.totalStudents} unique students since joining the platform.`}
                index={0}
              />
              <InfoBox 
                title="Active This Week"
                content={`${weeklyStats.weeklyLessons} lessons scheduled with students this week.`}
                index={1}
              />
              <InfoBox 
                title="Student Management"
                content="View detailed profiles, track progress, and manage your student relationships."
                index={2}
              />
            </>
          )}
          
          {selectedRole === 'Subjects' && tutorProfile?.subjects?.map((subject, i) => (
            <InfoBox 
              key={i}
              title={subject}
              content={`You are qualified to teach ${subject}. Manage your subject expertise and curriculum here.`}
              index={i}
            />
          ))}
          
          {selectedRole === 'Past Lessons' && (
            <>
              <InfoBox 
                title="Total Hours Taught"
                content={`You have completed ${formatHours(totalStats.totalHours)} of teaching.`}
                index={0}
              />
              <InfoBox 
                title="Total Earnings"
                content={`You have earned ${formatCurrency(totalStats.totalEarnings)} from confirmed lessons.`}
                index={1}
              />
              <InfoBox 
                title="Lesson History"
                content="View your complete teaching history and student feedback."
                index={2}
              />
            </>
          )}
          
          {selectedRole === 'Upcoming Lessons' && (
            <>
              <InfoBox 
                title="This Week"
                content={`You have ${weeklyStats.weeklyLessons} lessons scheduled this week.`}
                index={0}
              />
              <InfoBox 
                title="Expected Earnings"
                content={`This week's expected earnings: ${formatCurrency(weeklyStats.weeklyEarnings)}`}
                index={1}
              />
              <InfoBox 
                title="Schedule Management"
                content="Manage your upcoming lessons and availability."
                index={2}
              />
            </>
          )}
          
          {selectedRole === 'Reviews' && (
            <>
              <InfoBox 
                title="Student Feedback"
                content="View ratings and reviews from your students."
                index={0}
              />
              <InfoBox 
                title="Performance Metrics"
                content={`Based on ${totalStats.totalStudents} students taught.`}
                index={1}
              />
              <InfoBox 
                title="Improvement Areas"
                content="Track your teaching performance and areas for growth."
                index={2}
              />
            </>
          )}
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