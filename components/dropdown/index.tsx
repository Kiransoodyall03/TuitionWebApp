import React, { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.css';

export interface DropdownProps {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  selected,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.dropdown} ref={containerRef}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen((o) => !o)}
      >
        {selected || label}
        <span className={styles.arrow}>▾</span>
      </button>
      {isOpen && (
        <ul className={styles.menu}>
          {options.map((opt) => (
            <li
              key={opt}
              className={styles.item + (opt === selected ? ` ${styles.selected}` : '')}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
