// src/components/ConfirmBookingModal.tsx
import React, { useState } from 'react';
import { X, Video, ExternalLink, AlertCircle, CheckCircle, Calendar, Clock, User, BookOpen, Trash2 } from 'lucide-react';
import { Booking } from '../../services/types';
import moment from 'moment';
import styles from './confirmationModal.module.css';

interface ConfirmBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  studentName?: string;
  tutorId: string;
  onConfirm: (bookingId: string) => void;
  onDelete: (bookingId: string) => void;
  isLoading?: boolean;
}

interface TeamsCreationResult {
  success: boolean;
  teamsJoinUrl?: string;
  error?: string;
  requiresMicrosoftReconnection?: boolean;
}

const ConfirmBookingModal = ({
  isOpen,
  onClose,
  booking,
  studentName = "Student",
  tutorId,
  onConfirm,
  onDelete,
  isLoading = false
}: ConfirmBookingModalProps) => {
  const [teamsResult, setTeamsResult] = useState<TeamsCreationResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !booking) {
    return null;
  }

  const formatDateTime = (booking: Booking) => {
    const { date } = booking;
    const lessonDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    return moment(lessonDate).format('MMMM D, YYYY [at] h:mm A');
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '60 minutes';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
  };

  // This function ONLY makes HTTP requests - no server-side imports
  const createTeamsMeeting = async (bookingData: Booking) => {
    try {
      const { date } = bookingData;
      const startTime = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
      const durationMs = (bookingData.durationMinutes || 60) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationMs);

      const response = await fetch(`/api/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          tutorId,
          subject: bookingData.subject || 'Tuition Session',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating Teams meeting:', error);
      throw error;
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;
    
    setIsConfirming(true);
    setTeamsResult(null);
    
    try {
      const result = await createTeamsMeeting(booking);
      setTeamsResult(result);
      
      // Wait a moment to show success message
      setTimeout(() => {
        onConfirm(booking.bookingId);
        onClose();
      }, 2000);
    } catch (error: any) {
      setTeamsResult({
        success: false,
        error: error.message || 'Failed to create Teams meeting. Please try again.'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    
    if (window.confirm('Are you sure you want to delete this booking?')) {
      setIsDeleting(true);
      try {
        await onDelete(booking.bookingId);
        onClose();
      } catch (error) {
        console.error('Error deleting booking:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {booking.confirmed ? 'Booking Details' : 'Confirm Booking'}
          </h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            disabled={isConfirming || isDeleting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Booking Details */}
          <div className={styles.bookingDetails}>
            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <User size={20} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Student</span>
                <span className={styles.detailValue}>{studentName}</span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <BookOpen size={20} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Subject</span>
                <span className={styles.detailValue}>{booking.subject}</span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <Calendar size={20} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Date & Time</span>
                <span className={styles.detailValue}>{formatDateTime(booking)}</span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <Clock size={20} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Duration</span>
                <span className={styles.detailValue}>{formatDuration(booking.durationMinutes)}</span>
              </div>
            </div>

            {booking.extraDetails && (
              <div className={styles.detailRow}>
                <div className={styles.detailIcon}>
                  <AlertCircle size={20} />
                </div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Additional Notes</span>
                  <span className={styles.detailValue}>{booking.extraDetails}</span>
                </div>
              </div>
            )}

            {booking.meetingLink && (
              <div className={styles.detailRow}>
                <div className={styles.detailIcon}>
                  <Video size={20} />
                </div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Teams Meeting</span>
                  <a 
                    href={booking.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.meetingLink}
                  >
                    Join Meeting <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {teamsResult && (
            <div className={`${styles.statusMessage} ${teamsResult.success ? styles.success : styles.error}`}>
              <div className={styles.statusIcon}>
                {teamsResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div className={styles.statusText}>
                {teamsResult.success ? (
                  <>
                    <strong>Teams meeting created successfully!</strong>
                    {teamsResult.teamsJoinUrl && (
                      <a 
                        href={teamsResult.teamsJoinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.statusLink}
                      >
                        Open Teams Meeting
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Failed to create Teams meeting</strong>
                    <span>{teamsResult.error}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {!booking.confirmed ? (
            <>
              <button
                onClick={handleDelete}
                className={`${styles.button} ${styles.deleteButton}`}
                disabled={isConfirming || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className={styles.spinner}></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Booking
                  </>
                )}
              </button>
              <button
                onClick={handleConfirm}
                className={`${styles.button} ${styles.confirmButton}`}
                disabled={isConfirming || isDeleting}
              >
                {isConfirming ? (
                  <>
                    <span className={styles.spinner}></span>
                    Creating Teams Meeting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirm & Create Teams Meeting
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className={`${styles.button} ${styles.cancelButton}`}
              >
                Close
              </button>
              {booking.meetingLink && (
                <a
                  href={booking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.button} ${styles.confirmButton}`}
                >
                  <Video size={18} />
                  Join Teams Meeting
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmBookingModal;