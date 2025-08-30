// src/components/BookingModalStudent.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Booking, Student } from '../../services/types';
import moment from 'moment';

type Props = {
  booking: Booking;
  student: Student;
  onClose: () => void;
  onJoin?: () => void;
};

const BookingModalStudent: React.FC<Props> = ({ booking, student, onClose, onJoin }) => {
  const start = new Date(booking.date.year, booking.date.month - 1, booking.date.day, booking.date.hour, booking.date.minute);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: 10,
        width: 'min(720px, 96%)',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Booking Details</h2>
          <button onClick={onClose} style={{ fontSize: 22, lineHeight: 1, border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
            <strong>Subject:</strong>
            <span>{booking.subject}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
            <strong>Time:</strong>
            <span>{`${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}, ${moment(start).format('MMMM D, YYYY')}`}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
            <strong>Booking ID:</strong>
            <span style={{ fontFamily: 'monospace' }}>{booking.bookingId}</span>
          </div>

          <div style={{ padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
            <strong>Parent:</strong>
            <div>{student.parentName}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{student.parentContactNumber}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{student.parentEmail}</div>
          </div>

          {booking.extraDetails && (
            <div style={{ padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
              <strong>Notes:</strong>
              <div style={{ marginTop: 8 }}>{booking.extraDetails}</div>
            </div>
          )}

          {booking.meetingLink && (
            <div style={{ padding: 12, background: '#f7f7f7', borderRadius: 8 }}>
              <strong>Meeting Link:</strong>
              <div style={{ marginTop: 8 }}>
                <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">{booking.meetingLink}</a>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button
            onClick={() => { if (onJoin) onJoin(); else if (booking.meetingLink) window.open(booking.meetingLink, '_blank', 'noopener,noreferrer'); }}
            style={{ flex: 1, background: '#7c3aed', color: 'white', padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
          >
            {booking.meetingLink ? 'Join Lesson' : 'No Meeting Link'}
          </button>

          <button onClick={onClose} style={{ flex: 1, background: '#e5e7eb', padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal into document.body so it overlays everything
  const root = typeof document !== 'undefined' ? document.body : null;
  if (!root) return null;
  return ReactDOM.createPortal(modalContent, root);
};

export default BookingModalStudent;
