import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "@firebase/firestore";
import { db } from "../firebase/config";
import { useUserContext } from "../userContext";
import { Booking, Lesson, StudentProfile, TokenPurchase, SubjectProgress } from "../types";
import { useCallback } from "react";

// Types for student statistics
export interface StudentStats {
  totalLessons: number;
  completedAssignments: number;
  currentSubjects: number;
  averageGrade: number;
  upcomingLessons: number;
}

export interface WeeklyStats {
  weeklyLessons: number;
  weeklyHours: number;
  weeklyProgress: number;
  completedThisWeek: number;
}

export interface SubjectPerformance {
  subjectName: string;
  currentMark: number;
  targetMark: number;
  progress: number;
  tutorName?: string;
  lessonsCompleted: number;
  nextLessonDate?: Date;
}

export interface RecentActivity {
  id: string;
  type: 'lesson_completed' | 'lesson_scheduled' | 'grade_updated';
  title: string;
  description: string;
  date: Date;
  subjectName?: string;
}

// Fixed useStudent hook that handles undefined studentId properly
export const useStudent = () => {
    const { user, userType, studentProfile } = useUserContext();
    
    // Don't return null - always return the hook object
    // Just make studentId optional/empty when not available
    const studentId = (userType === 'student' && user && studentProfile) 
        ? studentProfile.uid  // Changed from userId to uid to match new types
        : '';

    // Fetch basic student data
    const fetchStudent = useCallback(async (studentId: string): Promise<StudentProfile | null> => {
        if (!studentId) {
            console.log("No studentId provided to fetchStudent");
            return null;
        }
        
        try {
            const docRef = doc(db, "students", studentId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return null;
            return { ...(docSnap.data() as StudentProfile), uid: docSnap.id };
        } catch (err) {
            console.error("Error fetching student:", err);
            return null;
        }
    }, []);

    // Fetch student bookings - FIXED to handle empty studentId
    const fetchStudentBookings = useCallback(async (studentId: string): Promise<Booking[]> => {
        if (!studentId) {
            console.log("No studentId provided to fetchStudentBookings");
            return [];
        }
        
        try {
            const q = query(
                collection(db, "bookings"), 
                where("studentId", "==", studentId),
                orderBy("date.year", "desc"),
                orderBy("date.month", "desc"),
                orderBy("date.day", "desc")
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ ...(d.data() as Booking), bookingId: d.id }));
        } catch (err) {
            console.error("Error fetching bookings:", err);
            return [];
        }
    }, []);

    // Fetch student lessons - FIXED to handle empty studentId
    const fetchStudentLessons = useCallback(async (studentId: string): Promise<Lesson[]> => {
        if (!studentId) {
            console.log("No studentId provided to fetchStudentLessons");
            return [];
        }
        
        try {
            const bookings = await fetchStudentBookings(studentId);
            if (!bookings.length) return [];

            const ids = bookings.map(b => b.bookingId);
            const lessons: Lesson[] = [];
            const chunkSize = 10;

            for (let i = 0; i < ids.length; i += chunkSize) {
                const chunk = ids.slice(i, i + chunkSize);
                const q = query(collection(db, "lessons"), where("bookingId", "in", chunk));
                const snap = await getDocs(q);
                snap.forEach(d => lessons.push({ ...(d.data() as Lesson), lessonId: d.id }));
            }

            return lessons.sort((a, b) => {
                const dateA = new Date(a.date.year, a.date.month - 1, a.date.day, a.date.hour, a.date.minute);
                const dateB = new Date(b.date.year, b.date.month - 1, b.date.day, b.date.hour, b.date.minute);
                return dateB.getTime() - dateA.getTime();
            });
        } catch (err) {
            console.error("Error fetching lessons:", err);
            return [];
        }
    }, [fetchStudentBookings]);

    // Calculate comprehensive student statistics - FIXED for new types
    const calculateStudentStats = useCallback(async (studentId: string): Promise<StudentStats> => {
        if (!studentId) {
            console.log("No studentId provided to calculateStudentStats");
            return {
                totalLessons: 0,
                completedAssignments: 0,
                currentSubjects: 0,
                averageGrade: 0,
                upcomingLessons: 0
            };
        }
        
        try {
            const [student, lessons, bookings] = await Promise.all([
                fetchStudent(studentId),
                fetchStudentLessons(studentId),
                fetchStudentBookings(studentId),
            ]);

            if (!student) {
                console.log("Student not found for stats calculation");
                return {
                    totalLessons: 0,
                    completedAssignments: 0,
                    currentSubjects: 0,
                    averageGrade: 0,
                    upcomingLessons: 0
                };
            }

            const completedLessons = lessons.filter(lesson => lesson.lessonStatus === 'completed');
            const upcomingBookings = bookings.filter(booking => {
                const lessonDate = new Date(
                    booking.date.year,
                    booking.date.month - 1,
                    booking.date.day,
                    booking.date.hour,
                    booking.date.minute
                );
                return lessonDate > new Date() && booking.confirmed;
            });

            // Calculate average grade from student subjects (now SubjectProgress type)
            const gradesSum = student.subjects.reduce((sum, subject) => {
                if (typeof subject === 'object' && 'currentMark' in subject) {
                    return sum + subject.currentMark;
                }
                return sum;
            }, 0);
            const averageGrade = student.subjects.length > 0 ? Math.round(gradesSum / student.subjects.length) : 0;

            return {
                totalLessons: completedLessons.length,
                completedAssignments: completedLessons.length,
                currentSubjects: student.subjects.length,
                averageGrade,
                upcomingLessons: upcomingBookings.length
            };
        } catch (err) {
            console.error("Error calculating student stats:", err);
            return {
                totalLessons: 0,
                completedAssignments: 0,
                currentSubjects: 0,
                averageGrade: 0,
                upcomingLessons: 0
            };
        }
    }, [fetchStudent, fetchStudentLessons, fetchStudentBookings]);

    // Calculate weekly statistics - FIXED
    const calculateWeeklyStats = useCallback(async (studentId: string): Promise<WeeklyStats> => {
        if (!studentId) {
            console.log("No studentId provided to calculateWeeklyStats");
            return {
                weeklyLessons: 0,
                weeklyHours: 0,
                weeklyProgress: 0,
                completedThisWeek: 0
            };
        }
        
        try {
            const [lessons, bookings] = await Promise.all([
                fetchStudentLessons(studentId),
                fetchStudentBookings(studentId)
            ]);

            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weeklyLessons = lessons.filter(lesson => {
                const lessonDate = new Date(
                    lesson.date.year,
                    lesson.date.month - 1,
                    lesson.date.day,
                    lesson.date.hour,
                    lesson.date.minute
                );
                return lessonDate >= weekStart && lessonDate <= weekEnd;
            });

            const weeklyBookings = bookings.filter(booking => {
                const bookingDate = new Date(
                    booking.date.year,
                    booking.date.month - 1,
                    booking.date.day,
                    booking.date.hour,
                    booking.date.minute
                );
                return bookingDate >= weekStart && bookingDate <= weekEnd;
            });

            const completedThisWeek = weeklyLessons.filter(lesson => 
                lesson.lessonStatus === 'completed'
            ).length;

            const estimatedHours = weeklyBookings.reduce((total, booking) => {
                return total + ((booking.durationMinutes || 60) / 60);
            }, 0);

            const totalScheduled = weeklyBookings.length;
            const progressPercentage = totalScheduled > 0 ? Math.round((completedThisWeek / totalScheduled) * 100) : 0;

            return {
                weeklyLessons: weeklyBookings.length,
                weeklyHours: estimatedHours,
                weeklyProgress: progressPercentage,
                completedThisWeek
            };
        } catch (err) {
            console.error("Error calculating weekly stats:", err);
            return {
                weeklyLessons: 0,
                weeklyHours: 0,
                weeklyProgress: 0,
                completedThisWeek: 0
            };
        }
    }, [fetchStudentLessons, fetchStudentBookings]);

    // Get subject performance data - Updated for new SubjectProgress type
    const getSubjectPerformance = useCallback(async (studentId: string): Promise<SubjectPerformance[]> => {
        if (!studentId) {
            console.log("No studentId provided to getSubjectPerformance");
            return [];
        }
        
        try {
            const [student, lessons, bookings] = await Promise.all([
                fetchStudent(studentId),
                fetchStudentLessons(studentId),
                fetchStudentBookings(studentId)
            ]);

            if (!student || !student.subjects || !Array.isArray(student.subjects)) {
                console.log("No student or subjects found");
                return [];
            }

            const performanceData = await Promise.all(
                student.subjects.map(async (subject: SubjectProgress) => {
                    // Now we know subjects are always SubjectProgress type
                    const subjectName = subject.subjectName;
                    const currentMark = subject.currentMark || 0;
                    const targetMark = subject.targetMark || 100;
                    const tutorId = subject.tutorId || undefined;

                    const subjectLessons = lessons.filter(lesson => {
                        const booking = bookings.find(b => b.bookingId === lesson.bookingId);
                        return booking?.subject?.toLowerCase() === subjectName.toLowerCase() && 
                               lesson.lessonStatus === 'completed';
                    });

                    const now = new Date();
                    const upcomingBookings = bookings
                        .filter(booking => {
                            const lessonDate = new Date(
                                booking.date.year,
                                booking.date.month - 1,
                                booking.date.day,
                                booking.date.hour || 0,
                                booking.date.minute || 0
                            );
                            return lessonDate > now && 
                                   booking.subject?.toLowerCase() === subjectName.toLowerCase() && 
                                   booking.confirmed;
                        })
                        .sort((a, b) => {
                            const dateA = new Date(a.date.year, a.date.month - 1, a.date.day, a.date.hour || 0, a.date.minute || 0);
                            const dateB = new Date(b.date.year, b.date.month - 1, b.date.day, b.date.hour || 0, b.date.minute || 0);
                            return dateA.getTime() - dateB.getTime();
                        });

                    const nextLessonDate = upcomingBookings[0] ? new Date(
                        upcomingBookings[0].date.year,
                        upcomingBookings[0].date.month - 1,
                        upcomingBookings[0].date.day,
                        upcomingBookings[0].date.hour || 0,
                        upcomingBookings[0].date.minute || 0
                    ) : undefined;

                    let tutorName = 'No Tutor Assigned';
                    if (tutorId && typeof tutorId === 'string' && tutorId.trim() !== '') {
                        try {
                            if (/^[a-zA-Z0-9_-]+$/.test(tutorId.trim())) {
                                const tutorDoc = await getDoc(doc(db, "tutors", tutorId.trim()));
                                if (tutorDoc.exists()) {
                                    const tutorData = tutorDoc.data();
                                    tutorName = tutorData?.displayName || tutorData?.username || 'Unknown Tutor';
                                } else {
                                    const userDoc = await getDoc(doc(db, "users", tutorId.trim()));
                                    if (userDoc.exists()) {
                                        const userData = userDoc.data();
                                        tutorName = userData?.displayName || 'Unknown Tutor';
                                    } else {
                                        console.log(`Tutor not found for ID: ${tutorId}`);
                                        tutorName = 'Tutor Not Found';
                                    }
                                }
                            } else {
                                console.warn(`Invalid tutor ID format: ${tutorId}`);
                                tutorName = 'Invalid Tutor ID';
                            }
                        } catch (err: any) {
                            console.error(`Error fetching tutor data for ID ${tutorId}:`, err);
                            if (err.code === 'permission-denied') {
                                tutorName = 'Access Denied';
                            } else {
                                tutorName = 'Error Loading Tutor';
                            }
                        }
                    }

                    const progress = targetMark > 0 ? 
                        Math.min(Math.round((currentMark / targetMark) * 100), 100) : 0;

                    return {
                        subjectName,
                        currentMark,
                        targetMark,
                        progress,
                        tutorName,
                        lessonsCompleted: subjectLessons.length,
                        nextLessonDate
                    };
                })
            );

            return performanceData;
            
        } catch (err) {
            console.error("Error fetching subject performance:", err);
            return [];
        }
    }, [fetchStudent, fetchStudentLessons, fetchStudentBookings]);

    // Get recent activity - FIXED
    const getRecentActivity = useCallback(async (studentId: string, limit: number = 10): Promise<RecentActivity[]> => {
        if (!studentId) {
            console.log("No studentId provided to getRecentActivity");
            return [];
        }
        
        try {
            const [lessons, bookings] = await Promise.all([
                fetchStudentLessons(studentId),
                fetchStudentBookings(studentId),
            ]);

            const activities: RecentActivity[] = [];

            lessons
                .filter(lesson => lesson.lessonStatus === 'completed')
                .slice(0, 5)
                .forEach(lesson => {
                    const booking = bookings.find(b => b.bookingId === lesson.bookingId);
                    activities.push({
                        id: lesson.lessonId,
                        type: 'lesson_completed',
                        title: 'Lesson Completed',
                        description: `Completed ${booking?.subject || 'Unknown'} lesson`,
                        date: new Date(lesson.date.year, lesson.date.month - 1, lesson.date.day, lesson.date.hour, lesson.date.minute),
                        subjectName: booking?.subject
                    });
                });

            const upcomingBookings = bookings
                .filter(booking => {
                    const lessonDate = new Date(
                        booking.date.year,
                        booking.date.month - 1,
                        booking.date.day,
                        booking.date.hour,
                        booking.date.minute
                    );
                    return lessonDate > new Date() && booking.confirmed;
                })
                .slice(0, 3);

            upcomingBookings.forEach(booking => {
                activities.push({
                    id: booking.bookingId,
                    type: 'lesson_scheduled',
                    title: 'Lesson Scheduled',
                    description: `Upcoming ${booking.subject} lesson`,
                    date: new Date(booking.date.year, booking.date.month - 1, booking.date.day, booking.date.hour, booking.date.minute),
                    subjectName: booking.subject
                });
            });

            return activities
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, limit);

        } catch (err) {
            console.error("Error fetching recent activity:", err);
            return [];
        }
    }, [fetchStudentLessons, fetchStudentBookings]);

    // Get upcoming lessons with details - FIXED
    const getUpcomingLessons = useCallback(async (studentId: string, limit: number = 5): Promise<(Booking & { tutorName?: string })[]> => {
        if (!studentId) {
            console.log("No studentId provided to getUpcomingLessons");
            return [];
        }
        
        try {
            const bookings = await fetchStudentBookings(studentId);
            
            const upcomingBookings = bookings
                .filter(booking => {
                    const lessonDate = new Date(
                        booking.date.year,
                        booking.date.month - 1,
                        booking.date.day,
                        booking.date.hour,
                        booking.date.minute
                    );
                    return lessonDate > new Date() && booking.confirmed;
                })
                .slice(0, limit);

            const bookingsWithTutors = await Promise.all(
                upcomingBookings.map(async (booking) => {
                    let tutorName = 'Unknown Tutor';
                    try {
                        const tutorDoc = await getDoc(doc(db, "tutors", booking.tutorId));
                        if (tutorDoc.exists()) {
                            const tutorData = tutorDoc.data();
                            tutorName = tutorData.displayName || tutorData.username || 'Unknown Tutor';
                        }
                    } catch (err) {
                        console.error("Error fetching tutor data:", err);
                    }
                    
                    return {
                        ...booking,
                        tutorName
                    };
                })
            );

            return bookingsWithTutors;
        } catch (err) {
            console.error("Error fetching upcoming lessons:", err);
            return [];
        }
    }, [fetchStudentBookings]);

    // Always return the hook object, even if user is not authenticated
    return {
        studentId,
        fetchStudent,
        fetchStudentBookings,
        fetchStudentLessons,
        calculateStudentStats,
        calculateWeeklyStats,
        getSubjectPerformance,
        getRecentActivity,
        getUpcomingLessons
    };
};