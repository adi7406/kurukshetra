import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search,
  User,
  LogOut,
  Sun,
  Moon,
  Bell,
  Menu,
  ChevronRight,
  GraduationCap,
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
  const location = useLocation();

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

  // Compute clean breadcrumbs based on route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/home') return [{ label: 'Home', path: '/home' }];
    if (path.startsWith('/content/concepts')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Curriculum', path: '/content/concepts' },
        { label: 'Concept Map', path: '/content/concepts' },
      ];
    }
    if (path.startsWith('/content/quizzes')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Curriculum', path: '/content/concepts' },
        { label: 'Practice Quizzes', path: '/content/quizzes' },
      ];
    }
    if (path.startsWith('/content/coding')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Curriculum', path: '/content/concepts' },
        { label: 'Coding Practice', path: '/content/coding' },
      ];
    }
    if (path.startsWith('/progress')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Insights', path: '/progress' },
        { label: 'Mastery & Progress', path: '/progress' },
      ];
    }
    if (path.startsWith('/dashboard')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Students', path: '/dashboard' },
        { label: 'Cohort Roster', path: '/dashboard' },
      ];
    }
    if (path.startsWith('/teacher/content-upload')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Content', path: '/teacher/content-upload' },
        { label: 'Syllabus & Upload', path: '/teacher/content-upload' },
      ];
    }
    if (path.startsWith('/teacher/student-progress')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Students', path: '/dashboard' },
        { label: 'Class Analytics', path: '/teacher/student-progress' },
      ];
    }
    if (path.startsWith('/teacher/replay')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Review', path: '/teacher/student-progress' },
        { label: 'Session Replay', path: location.pathname },
      ];
    }
    if (path.startsWith('/profile')) {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Settings', path: '/profile' },
        { label: 'My Profile', path: '/profile' },
      ];
    }
    return [{ label: 'Home', path: '/home' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="app-topbar">
        {/* Left Side: Mobile Menu Button + Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {onToggleMobileSidebar && (
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={onToggleMobileSidebar}
              aria-label="Toggle navigation menu"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
              }}
            >
              <Menu size={16} strokeWidth={1.5} />
            </button>
          )}

          {/* Breadcrumb Path (Reference format: Home / Curriculum / Hash Tables) */}
          <nav aria-label="Breadcrumb" className="topbar-breadcrumbs">
            <ol style={{ display: 'flex', alignItems: 'center', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li key={crumb.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {idx > 0 && (
                      <ChevronRight size={13} strokeWidth={1.5} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                    )}
                    {isLast ? (
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.path}
                        style={{
                          fontSize: '13px',
                          fontWeight: '400',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Center/Search Bar: Pill-shaped with grey fill & Ctrl K */}
        <div
          className="search-pill-container"
          onClick={() => setCommandPaletteOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setCommandPaletteOpen(true); }}
          title="Press Ctrl + K to search catalog"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-pill)',
            height: '38px',
            padding: '0 14px',
            maxWidth: '340px',
            width: '100%',
            cursor: 'pointer',
            transition: 'border-color 140ms ease, box-shadow 140ms ease',
          }}
        >
          <Search size={15} strokeWidth={1.5} color="var(--text-secondary)" />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1, userSelect: 'none' }}>
            Search...
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: '500',
              padding: '1px 6px',
              borderRadius: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Ctrl K
          </span>
        </div>

        {/* Right Actions: Dark Pill button + Circular 36px icon buttons + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Dark Pill Switcher Button ("Demo mode · Switch to Instructor") */}
          <button
            type="button"
            className="topbar-demo-pill"
            onClick={handleRoleToggle}
            title={`Switch view between Student and Instructor`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--dark-pill)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 140ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <GraduationCap size={14} strokeWidth={1.5} />
            <span>
              Demo mode &bull; Switch to <strong>{role === 'teacher' ? 'Student' : 'Instructor'}</strong>
            </span>
          </button>

          {/* Circular 36px Notifications Button with Dot */}
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="View notifications"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 140ms ease',
            }}
          >
            <Bell size={16} strokeWidth={1.5} />
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--coral)',
              }}
              aria-hidden="true"
            />
          </button>

          {/* Circular 36px Theme Toggle */}
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme mode"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 140ms ease',
            }}
          >
            {theme === 'dark' ? (
              <Sun size={16} strokeWidth={1.5} color="#F5A524" />
            ) : (
              <Moon size={16} strokeWidth={1.5} color="var(--text-main)" />
            )}
          </button>

          {/* Circular 36px Avatar (No broken box text!) */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="topbar-avatar-btn"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-label="User account menu"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--coral)',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'opacity 140ms ease',
                padding: 0,
              }}
            >
              {initials}
            </button>

            {profileOpen && (
              <div
                className="profile-dropdown-card animate-fade-in"
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '230px',
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-hairline)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '10px',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-hairline)', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: role === 'teacher' ? 'var(--mastery-developing-soft)' : 'var(--coral-soft)',
                        color: role === 'teacher' ? 'var(--mastery-developing)' : 'var(--coral)',
                      }}
                    >
                      {role === 'teacher' ? 'Instructor' : 'Student'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <User size={15} strokeWidth={1.5} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--mastery-weak)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '2px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mastery-weak-soft)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={15} strokeWidth={1.5} />
                  <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Real Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}

export default Topbar;
