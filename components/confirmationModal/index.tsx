// src/components/ConfirmBookingModal.tsx

import React from 'react';
import { X } from 'lucide-react';
import { Booking } from '../../services/types';
import moment from 'moment';
import styles from './confirmationModal.module.css';

interface ConfirmBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  studentName?: string; // You'll need to fetch this based on studentId
  onConfirm: (bookingId: string) => void;
  onDelete: (bookingId: string) => void;
  isLoading?: boolean;
}

const ConfirmBookingModal = ({
  isOpen,
  onClose,
  booking,
  studentName = "Student",
  onConfirm,
  onDelete,
  isLoading = false
}: ConfirmBookingModalProps) => {
  console.log('=== ConfirmBookingModal Render ===');
  console.log('isOpen:', isOpen);
  console.log('booking:', booking);
  console.log('studentName:', studentName);

  if (!isOpen || !booking) {
    console.log('Modal not rendering - isOpen:', isOpen, 'booking:', booking);
    return null;
  }

  const formatDateTime = (booking: Booking) => {
    const { date } = booking;
    const lessonDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    return moment(lessonDate).format('MMMM D, YYYY [at] h:mm A');
  };

  const handleConfirm = () => {
    console.log('Confirm button clicked, booking ID:', booking.bookingId);
    onConfirm(booking.bookingId);
  };

  const handleDelete = () => {
    console.log('Delete button clicked, booking ID:', booking.bookingId);
    onDelete(booking.bookingId);
  };

  const handleClose = () => {
    console.log('Close button clicked');
    onClose();
  };

  console.log('Rendering modal with booking:', booking);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Confirm Booking</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.message}>
            You are about to confirm booking for{' '}
            <span className={styles.studentName}>({studentName})</span> for{' '}
            <span className={styles.dateTime}>({formatDateTime(booking)})</span>
          </p>

          {/* Action Buttons */}
          <div className={styles.buttonContainer}>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className={`${styles.button} ${styles.DeleteButton}`}
            >
              {isLoading ? 'Processing...' : 'Delete'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`${styles.button} ${styles.confirmButton}`}
            >
              {isLoading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBookingModal;