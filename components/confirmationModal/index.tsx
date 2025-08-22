// src/components/ConfirmBookingModal.tsx
import React, { useState } from 'react';
import { X, Video, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
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

  if (!isOpen || !booking) {
    return null;
  }

  const formatDateTime = (booking: Booking) => {
    const { date } = booking;
    const lessonDate = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
    return moment(lessonDate).format('MMMM D, YYYY [at] h:mm A');
  };

  // This function ONLY makes HTTP requests - no server-side imports
  const createTeamsMeeting = async (bookingData: Booking) => {
    try {
      const { date } = bookingData;
      const startTime = new Date(date.year, date.month - 1, date.day, date.hour, date.minute);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

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
        throw new Error(`HTTP error! status: ${response.status}`);
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
      onConfirm(booking.bookingId);
    } catch (error) {
      setTeamsResult({
        success: false,
        error: 'Failed to create Teams meeting. Please try again.'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ... rest of your component JSX
};

export default ConfirmBookingModal;