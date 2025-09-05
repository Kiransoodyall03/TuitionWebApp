import React, { useState, useEffect } from 'react';
import { ChevronDown, User, BookOpen, Clock, Calendar, Star, Settings, Link2, CheckCircle2, DollarSign, TrendingUp, Target, Award } from 'lucide-react';
import styles from './StudentProfile.module.css';
import { useUserContext } from '../../../services/userContext';
import { useStudent, StudentStats, WeeklyStats, SubjectPerformance, RecentActivity } from '../../../services/apiFunctions/student';

const DASHBOARD_OPTIONS = ['Overview', 'Subjects', 'Progress', 'Upcoming Lessons', 'Past Lessons', 'Achievements', 'Recent Activity'];

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
    if (!confirm('Are you sure you want to disconnect your Microsoft account?')) {
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
      {(error || status.error) && (
        <div className={styles.errorMessage}>
          <p className={styles.errorText}>{error || status.error}</p>
        </div>
      )}

      <div className={styles.microsoftContent}>
        <div className={styles.microsoftIconContainer}>
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
                Access your OneDrive files and join Teams meetings seamlessly
              </p>
            </div>
          ) : (
            <div className={styles.connectionStatus}>
              <div className={styles.disconnectedStatus}>
                <span className={styles.disconnectedText}>⚠ Not connected</span>
              </div>
              <p className={styles.statusDescription}>
                Connect to access OneDrive files and join Teams meetings for your tutoring sessions
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

      {userProfile?.userType === 'student' && (
        <div className={styles.infoSection}>
          <div className={styles.infoIcon}>
            <svg className={styles.infoIconSvg} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className={styles.infoText}>
            Connecting your Microsoft account enhances your learning experience with direct access to course materials and seamless video calls.
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

const SubjectCard = ({ subject }: { subject: SubjectPerformance }) => {
  return (
    <div className={styles.subjectCard}>
      <div className={styles.subjectHeader}>
        <h4 className={styles.subjectName}>{subject.subjectName}</h4>
        <span className={styles.subjectProgress}>{subject.progress}%</span>
      </div>
      <div className={styles.subjectDetails}>
        <p className={styles.subjectMark}>Current: {subject.currentMark}% | Target: {subject.targetMark}%</p>
        <p className={styles.subjectTutor}>Tutor: {subject.tutorName}</p>
        <p className={styles.subjectLessons}>Lessons Completed: {subject.lessonsCompleted}</p>
        {subject.nextLessonDate && (
          <p className={styles.nextLesson}>
            Next Lesson: {subject.nextLessonDate.toLocaleDateString()}
          </p>
        )}
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${Math.min(subject.progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }: { activity: RecentActivity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'lesson_completed':
        return <CheckCircle2 className={styles.activityIcon} style={{ color: '#10b981' }} />;
      case 'lesson_scheduled':
        return <Calendar className={styles.activityIcon} style={{ color: '#3b82f6' }} />;
      case 'grade_updated':
        return <TrendingUp className={styles.activityIcon} style={{ color: '#8b5cf6' }} />;
      default:
        return <BookOpen className={styles.activityIcon} />;
    }
  };

  return (
    <div className={styles.activityItem}>
      {getActivityIcon()}
      <div className={styles.activityContent}>
        <h5 className={styles.activityTitle}>{activity.title}</h5>
        <p className={styles.activityDescription}>{activity.description}</p>
        <p className={styles.activityDate}>{activity.date.toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export const StudentProfile = () => {
  const [selectedDashboard, setSelectedDashboard] = useState(DASHBOARD_OPTIONS[0]);
  const { 
    user, 
    userProfile, 
    studentProfile, 
    userType, 
    updateUserProfile, 
    updateStudentProfile,
    isLoading 
  } = useUserContext();

  // Use the student hook for data fetching
  const studentHook = useStudent();

  // Local state for form inputs
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // State for statistics from Firebase
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalLessons: 0,
    completedAssignments: 0,
    currentSubjects: 0,
    averageGrade: 0,
    upcomingLessons: 0
  });

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    weeklyLessons: 0,
    weeklyHours: 0,
    weeklyProgress: 0,
    completedThisWeek: 0
  });

  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (userProfile && studentProfile) {
      setDisplayName(userProfile.displayName || '');
      setGrade(studentProfile.grade?.toString() || '');
      setSubjects(studentProfile.subjects?.join(', ') || '');
      setEnrolledCourses(studentProfile.enrolledCourses?.join(', ') || '');
    }
  }, [userProfile, studentProfile]);

  // Load student data when component mounts
useEffect(() => {
    const loadStudentData = async () => {
      // Check if we have a valid studentId before loading
      if (!studentHook?.studentId) {
        console.log('No studentId available yet');
        return;
      }
      
      // Prevent multiple simultaneous loads
      if (statsLoading) {
        console.log('Already loading stats, skipping...');
        return;
      }
      
      setStatsLoading(true);
      try {
        const [stats, weekly, subjects, activity, upcoming] = await Promise.all([
          studentHook.calculateStudentStats(studentHook.studentId),
          studentHook.calculateWeeklyStats(studentHook.studentId),
          studentHook.getSubjectPerformance(studentHook.studentId),
          studentHook.getRecentActivity(studentHook.studentId, 10),
          studentHook.getUpcomingLessons(studentHook.studentId, 5)
        ]);

        setStudentStats(stats);
        setWeeklyStats(weekly);
        setSubjectPerformance(subjects);
        setRecentActivity(activity);
        setUpcomingLessons(upcoming);
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStudentData();
  }, [studentHook?.studentId]);
  // Early return if not a student or no user data
  if (userType !== 'student' || !user || !userProfile || !studentProfile || !studentHook) {
    return <div className={styles.notStudentMessage}>Not a Student or profile not loaded.</div>;
  }

  const handleSave = async () => {
    try {
      await updateUserProfile({
        displayName: displayName
      });

      await updateStudentProfile({
        grade: grade ? parseInt(grade) : undefined,
        subjects: subjects.split(',').map(s => s.trim()).filter(s => s),
        enrolledCourses: enrolledCourses.split(',').map(c => c.trim()).filter(c => c)
      });

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };
  if (userType !== 'student' || !user || !userProfile || !studentProfile || !studentHook?.studentId) {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Loading your profile...</p>
          </div>
        </div>
      );
    }
    return <div className={styles.notStudentMessage}>Not a Student or profile not loaded.</div>;
  }
  const handleCancel = () => {
    setDisplayName(userProfile.displayName || '');
    setGrade(studentProfile.grade?.toString() || '');
    setSubjects(studentProfile.subjects?.join(', ') || '');
    setEnrolledCourses(studentProfile.enrolledCourses?.join(', ') || '');
    setIsEditing(false);
  };

  const formatHours = (hours) => {
    if (hours === 0) return '0';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerNav}>
            <h1 className={styles.headerTitle}>
              Student Profile & Dashboard
            </h1>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={styles.settingsButton}
            >
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
              {userProfile.displayName?.split(' ').map(n => n[0]).join('') || 'S'}
            </div>
            <div className={styles.profileDetails}>
              {isEditing ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={styles.editInput}
                    placeholder="Display Name"
                  />
                  <p className={styles.profileEmail}>{userProfile.email}</p>
                  <p className={styles.profileUid}>UID: {userProfile.uid}</p>
                </div>
              ) : (
                <>
                  <h2 className={styles.profileName}>{userProfile.displayName || 'Student'}</h2>
                  <p className={styles.profileEmail}>{userProfile.email}</p>
                  <p className={styles.profileUid}>UID: {userProfile.uid}</p>
                  {studentProfile.grade && (
                    <p className={styles.gradeInfo}>
                      Grade {studentProfile.grade}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className={styles.editFormSection}>
              <div className={styles.editGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={userProfile.email}
                    disabled
                    className={styles.disabledInput}
                  />
                  <p className={styles.inputHelp}>Email cannot be changed</p>
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Grade
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="">Select Grade</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(gradeNum => (
                      <option key={gradeNum} value={gradeNum.toString()}>
                        Grade {gradeNum}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Subjects
                </label>
                <textarea
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  rows={3}
                  placeholder="Enter subjects separated by commas (e.g., Mathematics, English, Science)"
                  className={styles.textareaInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Enrolled Courses
                </label>
                <textarea
                  value={enrolledCourses}
                  onChange={(e) => setEnrolledCourses(e.target.value)}
                  rows={2}
                  placeholder="Enter enrolled courses separated by commas"
                  className={styles.textareaInput}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className={styles.saveButton}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  onClick={handleCancel}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {!isEditing && (
            <div className={styles.statsGrid}>
              <StatCard 
                icon={BookOpen} 
                label="Total Lessons" 
                value={studentStats.totalLessons} 
                color="blue"
                loading={statsLoading}
              />
              <StatCard 
                icon={Target} 
                label="Completed Assignments" 
                value={studentStats.completedAssignments} 
                color="green"
                loading={statsLoading}
              />
              <StatCard 
                icon={User} 
                label="Active Subjects" 
                value={studentStats.currentSubjects} 
                color="purple"
                loading={statsLoading}
              />
              <StatCard 
                icon={Award} 
                label="Average Grade" 
                value={`${studentStats.averageGrade}%`} 
                color="orange"
                loading={statsLoading}
              />
              <StatCard 
                icon={Calendar} 
                label="Upcoming Lessons" 
                value={studentStats.upcomingLessons} 
                color="indigo"
                loading={statsLoading}
              />
            </div>
          )}
        </div>

        {/* Weekly Performance Section */}
        {!isEditing && (
          <div className={styles.weeklySection}>
            <h3 className={styles.sectionTitle}>This Week's Progress</h3>
            <div className={styles.weeklyStats}>
              <div className={styles.weeklyStatItem}>
                <Calendar className={styles.weeklyIcon} />
                <div>
                  <p className={styles.weeklyLabel}>Weekly Lessons</p>
                  <p className={styles.weeklyValue}>
                    {statsLoading ? '...' : weeklyStats.weeklyLessons}
                  </p>
                </div>
              </div>
              <div className={styles.weeklyStatItem}>
                <Clock className={styles.weeklyIcon} />
                <div>
                  <p className={styles.weeklyLabel}>Study Hours</p>
                  <p className={styles.weeklyValue}>
                    {statsLoading ? '...' : formatHours(weeklyStats.weeklyHours)}
                  </p>
                </div>
              </div>
              <div className={styles.weeklyStatItem}>
                <TrendingUp className={styles.weeklyIcon} />
                <div>
                  <p className={styles.weeklyLabel}>Progress Score</p>
                  <p className={styles.weeklyValue}>
                    {statsLoading ? '...' : `${weeklyStats.weeklyProgress}%`}
                  </p>
                </div>
              </div>
              <div className={styles.weeklyStatItem}>
                <CheckCircle2 className={styles.weeklyIcon} />
                <div>
                  <p className={styles.weeklyLabel}>Completed This Week</p>
                  <p className={styles.weeklyValue}>
                    {statsLoading ? '...' : weeklyStats.completedThisWeek}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Microsoft Account Integration */}
        {!isEditing && (
          <div className={styles.microsoftSection}>
            <MicrosoftAccountConnection />
          </div>
        )}

        {/* Achievements Section */}
        {!isEditing && (
          <div className={styles.achievementsSection}>
            <h3 className={styles.sectionTitle}>Achievements</h3>
            <div className={styles.achievementsGrid}>
              {studentStats.totalLessons >= 10 && (
                <div className={styles.achievement}>
                  <Star className={styles.achievementIcon} style={{ color: '#fbbf24' }} />
                  <span>10+ Lessons</span>
                </div>
              )}
              {studentStats.completedAssignments >= 15 && (
                <div className={styles.achievement}>
                  <Target className={styles.achievementIcon} style={{ color: '#10b981' }} />
                  <span>Assignment Star</span>
                </div>
              )}
              {studentStats.averageGrade >= 80 && (
                <div className={styles.achievement}>
                  <Award className={styles.achievementIcon} style={{ color: '#8b5cf6' }} />
                  <span>Honor Roll</span>
                </div>
              )}
              {weeklyStats.weeklyProgress >= 75 && (
                <div className={styles.achievement}>
                  <TrendingUp className={styles.achievementIcon} style={{ color: '#60a5fa' }} />
                  <span>Progress Pro</span>
                </div>
              )}
              {studentStats.currentSubjects >= 5 && (
                <div className={styles.achievement}>
                  <BookOpen className={styles.achievementIcon} style={{ color: '#f97316' }} />
                  <span>Multi-Subject</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Selection */}
        {!isEditing && (
          <div className={styles.dashboardSelection}>
            <h3 className={styles.dashboardTitle}>View Dashboard</h3>
            <div className={styles.dashboardDropdownContainer}>
              <Dropdown 
                label="Select view"
                options={DASHBOARD_OPTIONS}
                selected={selectedDashboard}
                onChange={setSelectedDashboard}
              />
              <div className={styles.selectedInfo}>
                <p className={styles.selectedText}>
                  Currently viewing: <span className={styles.selectedDashboard}>{selectedDashboard}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {!isEditing && (
          <div className={styles.contentGrid}>
            {selectedDashboard === 'Overview' && (
              <>
                <InfoBox 
                  title="Learning Journey"
                  content={`You've completed ${studentStats.totalLessons} lessons and are making excellent progress across ${studentStats.currentSubjects} subjects.`}
                  index={0}
                />
                <InfoBox 
                  title="This Week"
                  content={`You have ${weeklyStats.weeklyLessons} lessons scheduled and ${formatHours(weeklyStats.weeklyHours)} of study time planned.`}
                  index={1}
                />
                <InfoBox 
                  title="Academic Performance"
                  content={`Your current average grade is ${studentStats.averageGrade}%, showing consistent improvement in your studies.`}
                  index={2}
                /> 
              </>
            )}
            
            {selectedDashboard === 'Subjects' && (
              <div className={styles.subjectsGrid}>
                {subjectPerformance.map((subject, i) => (
                  <SubjectCard key={i} subject={subject} />
                ))}
                {subjectPerformance.length === 0 && !statsLoading && (
                  <InfoBox 
                    title="No Subjects Found"
                    content="You don't have any subjects with performance data yet. Complete some lessons to see your progress here."
                    index={0}
                  />
                )}
              </div>
            )}
            
            {selectedDashboard === 'Progress' && (
              <>
                <InfoBox 
                  title="Academic Growth"
                  content={`Your average grade has improved to ${studentStats.averageGrade}%, showing consistent progress in your learning journey.`}
                  index={0}
                />
                <InfoBox 
                  title="Assignment Success"
                  content={`You've completed ${studentStats.completedAssignments} out of ${studentStats.totalLessons} assignments, maintaining excellent consistency.`}
                  index={1}
                />
                <InfoBox 
                  title="Weekly Goals"
                  content={`This week's progress score is ${weeklyStats.weeklyProgress}%. You've completed ${weeklyStats.completedThisWeek} lessons this week.`}
                  index={2}
                />
                <InfoBox 
                  title="Subject Performance"
                  content={`Currently tracking progress across ${studentStats.currentSubjects} active subjects with personalized tutoring support.`}
                  index={3}
                />
              </>
            )}
            
            {selectedDashboard === 'Upcoming Lessons' && (
              <>
                <InfoBox 
                  title="This Week"
                  content={`You have ${studentStats.upcomingLessons} lessons scheduled with ${weeklyStats.weeklyLessons} happening this week.`}
                  index={0}
                />
                <InfoBox 
                  title="Study Time"
                  content={`Plan for ${formatHours(weeklyStats.weeklyHours)} of focused learning time this week.`}
                  index={1}
                />
                <InfoBox 
                  title="Preparation Tips"
                  content="Make sure to review your previous lessons and prepare any questions for your upcoming sessions."
                  index={2}
                />
                <InfoBox 
                  title="Upcoming Schedule"
                  content={`${upcomingLessons.length} lessons are confirmed and scheduled in your calendar.`}
                  index={3}
                />
              </>
            )}
            
            {selectedDashboard === 'Past Lessons' && (
              <>
                <InfoBox 
                  title="Total Learning"
                  content={`You have completed ${studentStats.totalLessons} lessons, building a strong foundation across multiple subjects.`}
                  index={0}
                />
                <InfoBox 
                  title="Consistency Record"
                  content={`Your assignment completion rate is ${Math.round((studentStats.completedAssignments / Math.max(studentStats.totalLessons, 1)) * 100)}% showing dedicated learning habits.`}
                  index={1}
                />
                <InfoBox 
                  title="Learning History"
                  content="Review your past lessons, notes, and feedback to reinforce your learning and identify areas for improvement."
                  index={2}
                />
              </>
            )}

            {selectedDashboard === 'Achievements' && (
              <>
                <InfoBox 
                  title="Academic Milestones"
                  content="Track your learning achievements and celebrate your progress as you reach new educational goals."
                  index={0}
                />
                <InfoBox 
                  title="Progress Tracking"
                  content={`Based on ${studentStats.totalLessons} completed lessons and ${studentStats.completedAssignments} finished assignments.`}
                  index={1}
                />
                <InfoBox 
                  title="Future Goals"
                  content="Set new targets and work towards achieving even greater academic success in your learning journey."
                  index={2}
                />
                <InfoBox 
                  title="Performance Summary"
                  content={`Currently maintaining a ${studentStats.averageGrade}% average across ${studentStats.currentSubjects} subjects.`}
                  index={3}
                />
              </>
            )}

            {selectedDashboard === 'Recent Activity' && (
              <div className={styles.activityGrid}>
                {recentActivity.map((activity, i) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                {recentActivity.length === 0 && !statsLoading && (
                  <InfoBox 
                    title="No Recent Activity"
                    content="Complete some lessons or schedule new sessions to see your recent activity here."
                    index={0}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {!isEditing && (
          <div className={styles.quickActions}>
            <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
            <div className={styles.actionsGrid}>
              <button className={styles.actionCard}>
                <Calendar className={styles.actionIcon} />
                <p className={styles.actionTitle}>Book Lesson</p>
                <p className={styles.actionDescription}>Schedule a new tutoring session</p>
              </button>
              <button className={styles.actionCard}>
                <BookOpen className={styles.actionIcon} />
                <p className={styles.actionTitle}>Study Materials</p>
                <p className={styles.actionDescription}>Access your course resources</p>
              </button>
              <button className={styles.actionCard}>
                <User className={styles.actionIcon} />
                <p className={styles.actionTitle}>View Progress</p>
                <p className={styles.actionDescription}>Track your learning journey</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;