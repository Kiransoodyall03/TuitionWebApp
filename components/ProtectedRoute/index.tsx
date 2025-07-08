// components/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '../../services/userContext';

interface ProtectedRouteProps {
  children: ReactNode;
  userType: 'student' | 'tutor';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const { userType: currentUserType, isLoading } = useUserContext();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!currentUserType) {
    return <Navigate to="/login" replace />;
  }

  if (currentUserType !== userType) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};