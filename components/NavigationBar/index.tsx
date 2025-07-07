// Navigation Bar Component
export const NavigationBar = ({ userName, activeTab, onTabChange, onLogout }) => {
  return (
    <nav className="bg-orange-600 text-white">
      <div className="flex h-12">
        <div className="flex items-center px-4 text-white font-medium">
          Welcome {userName}
        </div>
        <button
          onClick={() => onTabChange('Home')}
          className={`px-6 py-3 text-white font-medium hover:bg-orange-700 transition-colors ${
            activeTab === 'Home' ? 'bg-orange-700' : ''
          }`}
        >
          Home
        </button>
        <button
          onClick={() => onTabChange('Profile')}
          className={`px-6 py-3 text-white font-medium hover:bg-orange-700 transition-colors ${
            activeTab === 'Profile' ? 'bg-orange-700' : ''
          }`}
        >
          Profile
        </button>
        <button
          onClick={onLogout}
          className="px-6 py-3 text-white font-medium hover:bg-red-600 transition-colors ml-auto"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};