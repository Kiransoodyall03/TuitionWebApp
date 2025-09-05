// App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './login';
import RegistrationPage from './register'; // Add this import
import { StudentHome } from './student/home';
import  {StudentProfile}  from './student/profile';
import { TutorHome } from './tutor/home';
import { TutorProfile } from './tutor/profile';
import { NavigationBar } from '../components/NavigationBar';
import { UserProvider, useUserContext } from '../services/userContext';
import { ProtectedRoute } from '../components/ProtectedRoute';


const AppContent: React.FC = () => {
  const { user, userType, signOut, isLoading, userProfile } = useUserContext();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--neutral-100)' }}>
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto"
            style={{ borderColor: 'var(--primary-500)' }}
          ></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--neutral-100)' }}>
        {/* Only show NavigationBar if user is logged in */}
        {userType && user && (
          <NavigationBar
            tabs={[
              { key: 'Home', label: 'Home', path: '/home' },
              { key: 'Profile', label: 'Profile', path: '/profile' },
            ]}
            userName={
              userProfile?.displayName || 
              (user as any).displayName || 
              (userType === 'student' ? 'Student' : 'Tutor')
            }
            onLogout={signOut}
          />
        )}
        
        <main className={`flex-1 ${userType && user ? 'p-4' : ''}`}>
          <Routes>
            {/* Login Route */}
            <Route 
              path="/login" 
              element={
                userType && user ? (
                  <Navigate to="/home" replace />
                ) : (
                  <LoginPage />
                )
              } 
            />
            
            {/* Registration Route */}
            <Route 
              path="/register" 
              element={
                userType && user ? (
                  <Navigate to="/home" replace />
                ) : (
                  <RegistrationPage />
                )
              } 
            />
            
            {/* Student Routes */}
            {userType === 'student' && (
              <>
                <Route 
                  path="/home" 
                  element={
                    <ProtectedRoute userType={userType}>
                      <StudentHome />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute userType={userType}>
                      <StudentProfile />
                    </ProtectedRoute>
                  } 
                />
              </>
            )}
            
            {/* Tutor Routes */}
            {userType === 'tutor' && (
              <>
                <Route 
                  path="/home" 
                  element={
                    <ProtectedRoute userType={userType}>
                      <TutorHome />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute userType={userType}>
                      <TutorProfile />
                    </ProtectedRoute>
                  } 
                />
              </>
            )}
            
            {/* Default redirects */}
            <Route 
              path="/" 
              element={
                userType && user ? (
                  <Navigate to="/home" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            
            {/* Redirect unknown routes */}
            <Route 
              path="*" 
              element={
                userType && user ? (
                  <Navigate to="/home" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const App: React.FC = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;