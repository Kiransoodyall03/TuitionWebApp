import React from 'react';
import { X } from 'lucide-react';
import styles from './bookingModal.module.css';

const BookingDetailsModal = ({  
  isOpen, 
  onClose, 
  subject = "",
  time = "",
  parentFullName = "",
  parentContactNumber = "",
  parentEmail = "",
  meetingLink = "",
  onJoinLesson = () => {}
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Booking Details</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Subject */}
          <div>
            <label className={styles.label}>Subject:</label>
            <div className={styles.infoBox}>{subject}</div>
          </div>

          {/* Time */}
          <div>
            <label className={styles.label}>Time:</label>
            <div className={styles.infoBox}>{time}</div>
          </div>

          {/* Parent Full Name */}
          <div>
            <label className={styles.label}>Parent Full Name:</label>
            <div className={styles.infoBox}>{parentFullName}</div>
          </div>

          {/* Parent Contact Number */}
          <div>
            <label className={styles.label}>Parent Contact Number:</label>
            <div className={styles.infoBox}>{parentContactNumber}</div>
          </div>

          {/* Parent Email */}
          <div>
            <label className={styles.label}>Parent Email:</label>
            <div className={styles.infoBox}>{parentEmail}</div>
          </div>

          {/* Meeting Link Section */}
          <div className={styles.meetingSection}>
            <div className={styles.meetingLabel}>Link to join meeting</div>
            <div className={styles.meetingLabel}>or</div>
            <button onClick={onJoinLesson} className={styles.joinButton}>
              Join Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;