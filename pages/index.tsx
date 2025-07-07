// App.tsx
import React, { JSX, useState } from 'react';
import LoginPage from './login';
import { StudentHome } from './student/home';
import { StudentProfile } from './student/profile';
import { TutorHome } from './tutor/home';
import { TutorProfile } from './tutor/profile';
import { NavigationBar } from '../components/NavigationBar';
import { UserProvider, useUserContext } from '../services/userContext';

const AppContent: React.FC = () => {
  const { userType, logout } = useUserContext();
  const [activeTab, setActiveTab] = useState<string>('Home');

  // If not logged in yet, show LoginPage
  if (!userType) {
    return <LoginPage onLogin={() => {}} />;
  }

  // Define tabs and pages based on userType
  let tabs: { key: string; label: string }[] = [];
  const pageMap: Record<string, JSX.Element> = {};

  if (userType === 'student') {
    tabs = [
      { key: 'Home', label: 'Home' },
      { key: 'Profile', label: 'Profile' },
    ];
    pageMap['Home'] = <StudentHome />;
    pageMap['Profile'] = <StudentProfile />;
  } else if (userType === 'tutor') {
    tabs = [
      { key: 'Home', label: 'Home' },
      { key: 'Profile', label: 'Profile' },
    ];
    pageMap['Home'] = <TutorHome />;
    pageMap['Profile'] = <TutorProfile />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar
        tabs={tabs}
        userName={/* pull username from context or state */ ''}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={logout}
      />
      <main className="flex-1 p-4">
        {pageMap[activeTab]}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;
