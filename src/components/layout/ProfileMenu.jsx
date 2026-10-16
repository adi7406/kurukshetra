import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close menu on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigateProfile = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="profile-menu-container" ref={containerRef}>
      <button
        type="button"
        className={`avatar-button ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User account menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="profile-dropdown" role="menu" aria-orientation="vertical">
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-name">{user?.name || 'Pathwise User'}</div>
            <div className="profile-dropdown-email">{user?.email || ''}</div>
          </div>

          {/* Item 1: My profile */}
          <button
            type="button"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={handleNavigateProfile}
          >
            <User style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
            <span>My profile</span>
          </button>

          {/* Item 2: Sign out */}
          <button
            type="button"
            className="profile-dropdown-item danger"
            role="menuitem"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
