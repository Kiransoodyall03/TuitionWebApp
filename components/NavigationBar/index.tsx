// components/NavigationBar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './NavigationBar.module.css';

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
    <nav className={styles.navContainer}>
      <div className={styles.navWrapper}>
        <div className={styles.navInner}>
          <div className={styles.leftSection}>
            <div className={styles.welcomeText}>
              Welcome {userName}
            </div>
            
            <div className={styles.navLinks}>
              {tabs.map((tab) => (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`${styles.navItem} ${
                    location.pathname === tab.path
                      ? styles.navItemActive
                      : styles.navItemInactive
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className={styles.rightSection}>
            <button
              onClick={onLogout}
              className={styles.logoutBtn}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};