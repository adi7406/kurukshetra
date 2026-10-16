import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  GraduationCap,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import CommandPalette from '../common/CommandPalette';

export function Topbar({ onToggleMobileSidebar }) {
  const { user, role, logout, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Command palette keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for profile menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleRoleToggle = async () => {
    try {
      if (role === 'teacher') {
        await login('student@pathwise.edu', 'student123', 'student');
      } else {
        await login('teacher@pathwise.edu', 'teacher123', 'teacher');
      }
      navigate('/home');
    } catch (err) {
      console.error('Role switch failed:', err);
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

  return (
    <>
      <header className="app-topbar">
        {/* Mobile Hamburger Menu Toggle */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="mobile-menu-toggle btn-secondary"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            style={{ padding: '6px 8px' }}
          >
            <Menu size={18} color="var(--text-main)" />
          </button>
        )}

        {/* Search Bar with Ctrl+K shortcut */}
        <div
          className="search-pill-container"
          onClick={() => setCommandPaletteOpen(true)}
          role="button"
          tabIndex={0}
          title="Press Ctrl + K to search catalog"
        >
          <Search size={15} color="var(--text-light)" />
          <span style={{ fontSize: '13px', color: 'var(--text-light)', flex: 1 }}>
            Search...
          </span>
          <span className="search-kbd-shortcut">Ctrl K</span>
        </div>

        {/* Right Topbar Actions */}
        <div className="topbar-actions">
          {/* Demo Mode Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Demo Mode
            </span>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleRoleToggle}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                gap: '6px',
              }}
              title={`Toggle demo view between Student and Instructor`}
            >
              <GraduationCap size={13} color="var(--primary)" />
              <span>Switch to <strong>{role === 'teacher' ? 'Student' : 'Instructor'}</strong></span>
            </button>
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            className="btn-secondary"
            onClick={toggleTheme}
            style={{
              padding: '6px 9px',
              borderRadius: '8px',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? <Sun size={15} color="#FBBF24" /> : <Moon size={15} color="#3B82F6" />}
          </button>

          {/* Single Authoritative Profile Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="topbar-profile-btn"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-label="Account menu"
            >
              <div className="topbar-avatar">{initials}</div>
              <span className="topbar-username">{user?.name ? user.name.split(' ')[0] : 'User'}</span>
              <ChevronDown size={14} color="var(--text-light)" />
            </button>

            {profileOpen && (
              <div className="profile-dropdown-card animate-fade-in" style={{ width: '220px' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '1px' }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge-clean ${role === 'teacher' ? 'amber' : 'blue'}`}>
                      {role === 'teacher' ? 'Instructor' : 'Student'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '6px' }}>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <User size={14} />
                    <span>My Profile</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                  <button
                    type="button"
                    className="dropdown-item danger"
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    <LogOut size={14} />
                    <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Real Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}

export default Topbar;
