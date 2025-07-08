// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './login';
import { StudentHome } from './student/home';
import { StudentProfile } from './student/profile';
import { TutorHome } from './tutor/home';
import { TutorProfile } from './tutor/profile';
import { NavigationBar } from '../components/NavigationBar';
import { UserProvider, useUserContext } from '../services/userContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

const AppContent: React.FC = () => {
  const { user, userType, logout, isLoading } = useUserContext();

  // Show loading spinner while checking cookies
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Only show NavigationBar if user is logged in */}
        {userType && user && (
          <NavigationBar
            tabs={[
              { key: 'Home', label: 'Home', path: '/home' },
              { key: 'Profile', label: 'Profile', path: '/profile' },
            ]}
            userName={
              userType === 'student' 
                ? (user as any).username || (user as any).name || 'Student'
                : (user as any).username || (user as any).name || 'Tutor'
            }
            onLogout={logout}
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