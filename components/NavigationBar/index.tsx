// components/NavigationBar.tsx
import React from 'react';

type Tab = { key: string; label: string };

interface NavigationBarProps {
  userName: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  userName,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
}) => {
  return (
    <nav className="bg-orange-600 text-white">
      <div className="flex h-12 items-center w-full">
        <div className="px-4 font-medium">
          Welcome {userName}
        </div>
        <div className="flex space-x-2 ml-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-6 py-3 font-medium hover:bg-orange-700 transition-colors ${
                activeTab === tab.key ? 'bg-orange-700' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto px-4">
          <button
            onClick={onLogout}
            className="px-6 py-3 font-medium hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};
