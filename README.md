# TuitionWebApp

Sample usage of createbooking:
const handleCreateBooking = async () => {
  const newBooking: Booking = {
    bookingId: "", // Firestore generates this automatically unless you want to use `setDoc`
    tutorId: "abc123",
    studentId: "xyz789",
    date: {
      year: 2025,
      month: 7,
      day: 10,
      hour: 16,
      minute: 0,
    },
    subject: "Mathematics",
    extraDetails: "Need help with trigonometry",
    confirmed: false,
  };

  await createBooking(newBooking);
};

sample usage of convertBookingtoLesson:
if (newBooking.confirmed) {
  await convertBookingToLesson(newBooking);
}

