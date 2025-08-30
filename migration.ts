// migrationScript.ts
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './services/firebase/config';

export const migrateUserData = async () => {
  try {
    console.log('Starting user data migration...');

    // Migrate tutors
    const tutorsSnapshot = await getDocs(collection(db, 'tutor')); // Note: your old collection name
    
    for (const tutorDoc of tutorsSnapshot.docs) {
      const oldData = tutorDoc.data();
      const userId = tutorDoc.id;

      // Create new user document
      const userProfile = {
        uid: userId,
        email: oldData.microsoftAuth?.userInfo?.mail || `${userId}@placeholder.com`,
        displayName: oldData.microsoftAuth?.userInfo?.displayName || oldData.username || 'Unknown User',
        userType: 'tutor',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        ...(oldData.microsoftAuth && { microsoftAuth: oldData.microsoftAuth })
      };

      // Create new tutor document
      const tutorProfile = {
        userId: userId,
        bio: oldData.bio || '',
        contactNumber: oldData.contactNumber || '',
        subjects: oldData.subjects || [],
        hourlyRate: oldData.hourlyRate || 0,
      };

      // Save to new structure
      await setDoc(doc(db, 'users', userId), userProfile);
      await setDoc(doc(db, 'tutors', userId), tutorProfile);

      console.log(`Migrated tutor: ${userProfile.displayName}`);
    }

    // Migrate students (if you have a separate student collection)
    const studentsSnapshot = await getDocs(collection(db, 'student')); // Note: your old collection name
    
    for (const studentDoc of studentsSnapshot.docs) {
      const oldData = studentDoc.data();
      const userId = studentDoc.id;

      // Create new user document
      const userProfile = {
        uid: userId,
        email: oldData.microsoftAuth?.userInfo?.mail || `${userId}@placeholder.com`,
        displayName: oldData.microsoftAuth?.userInfo?.displayName || oldData.username || 'Unknown User',
        userType: 'student',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        ...(oldData.microsoftAuth && { microsoftAuth: oldData.microsoftAuth })
      };

      // Create new student document
      const studentProfile = {
        userId: userId,
        grade: oldData.grade || 12,
        subjects: oldData.subjects || [],
        enrolledCourses: oldData.enrolledCourses || []
      };

      // Save to new structure
      await setDoc(doc(db, 'users', userId), userProfile);
      await setDoc(doc(db, 'students', userId), studentProfile);

      console.log(`Migrated student: ${userProfile.displayName}`);
    }

    console.log('Migration completed successfully!');
    
    // Optional: Clean up old collections (BE VERY CAREFUL WITH THIS)
    // Uncomment only after verifying migration worked correctly
    /*
    console.log('Cleaning up old collections...');
    for (const tutorDoc of tutorsSnapshot.docs) {
      await deleteDoc(tutorDoc.ref);
    }
    for (const studentDoc of studentsSnapshot.docs) {
      await deleteDoc(studentDoc.ref);
    }
    console.log('Cleanup completed!');
    */

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Helper function to run migration with confirmation
export const runMigrationWithConfirmation = async () => {
  const confirmed = window.confirm(
    'This will migrate your user data to the new structure. ' +
    'Make sure you have a backup of your database. ' +
    'Do you want to continue?'
  );
  
  if (confirmed) {
    try {
      await migrateUserData();
      alert('Migration completed successfully!');
    } catch (error) {
      alert('Migration failed. Check console for details.');
      console.error(error);
    }
  }
};
