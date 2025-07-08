// components/NavigationBar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  key: string;
  label: string;
  path: string;
}

interface NavigationBarProps {
  tabs: Tab[];
  userName: string;
  onLogout: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  tabs,
  userName,
  onLogout,
}) => {
  const location = useLocation();

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === tab.path
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm">Welcome, {userName}</span>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};