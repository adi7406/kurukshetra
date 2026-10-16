import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Topbar() {
  const { user, role, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await logout();
      navigate('/login');
    } finally {
      setSigningOut(false);
      setProfileOpen(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const userHandle = user?.email ? `@${user.email.split('@')[0]}` : '@pathwise_user';

  return (
    <header className="app-topbar">
      {/* Search Bar Pill (Studdy Style) */}
      <div className="search-pill-container">
        <Search size={16} color="var(--text-light)" />
        <input
          type="text"
          className="search-pill-input"
          placeholder="Search syllabus, concepts, quizzes, code problems..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
        />
      </div>

      {/* Right Topbar Actions */}
      <div className="topbar-actions">
        {/* Notification Bell Pill */}
        <button
          type="button"
          className="icon-btn-pill"
          aria-label="Notifications"
          title="Notifications & Updates"
        >
          <Bell size={18} />
          <span className="notif-badge" />
        </button>

        {/* User Profile Pill & Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            className="user-profile-pill"
            onClick={() => setProfileOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <div className="avatar-circle">{initials}</div>
            <div className="user-profile-meta">
              <span className="user-name-text">{user?.name || 'User'}</span>
              <span className="user-role-text">{userHandle}</span>
            </div>
            <ChevronDown size={14} color="var(--text-light)" />
          </div>

          {/* Profile Menu Dropdown */}
          {profileOpen && (
            <div
              className="studdy-card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '210px',
                padding: '8px',
                borderRadius: '16px',
                boxShadow: '0 15px 30px rgba(15, 23, 42, 0.12)',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>
                  {role === 'teacher' ? 'Faculty Instructor' : 'Enrolled Student'}
                </div>
              </div>

              <button
                type="button"
                className="nav-pill"
                style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/profile');
                }}
              >
                <User size={15} />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                className="nav-pill"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  color: 'var(--danger)',
                }}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut size={15} />
                <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
