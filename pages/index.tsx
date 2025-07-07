import React, { useState } from 'react';
import LoginPage from './login';
import { HomePage } from './tutor/home';
import { ProfilePage } from './tutor/profile';
import { NavigationBar } from '../components/NavigationBar';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('Home');

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUserName(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setActiveTab('Home');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'Home':
        return <HomePage navigation={{}} />;
      case 'Profile':
        return <ProfilePage userName={userName} navigation={{}} />;
      default:
        return <HomePage navigation={{}} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar
        userName={userName}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      {renderPage()}
    </div>
  );
};

export default App;
