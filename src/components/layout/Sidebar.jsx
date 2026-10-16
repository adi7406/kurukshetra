import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Layers,
  HelpCircle,
  Code2,
  TrendingUp,
  UploadCloud,
  Users,
  GraduationCap,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ isOpen, onCloseMobile }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PW';

  return (
    <aside
      className={`app-sidebar ${isOpen ? 'open' : ''}`}
      aria-label="Main Application Navigation"
    >
      {/* Brand at top */}
      <div className="sidebar-brand-wrapper">
        <NavLink to="/home" className="sidebar-brand" onClick={handleLinkClick}>
          <div className="sidebar-brand-icon">
            <GraduationCap size={18} strokeWidth={1.5} />
          </div>
          <span className="sidebar-brand-title">Pathwise</span>
          <span className="sidebar-brand-tag">ADAPTIVE</span>
        </NavLink>
      </div>

      {/* Nav grouped under tiny uppercase grey labels */}
      <nav className="sidebar-nav-scroll">
        {role !== 'teacher' ? (
          <>
            {/* Student Group 1: LEARNING */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">LEARNING</span>
              <NavLink
                to="/home"
                end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Home size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Home</span>
              </NavLink>

              <NavLink
                to="/content/concepts"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Layers size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Concept Map</span>
              </NavLink>
            </div>

            {/* Student Group 2: PRACTICE */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">PRACTICE</span>
              <NavLink
                to="/content/quizzes"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <HelpCircle size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Practice Quizzes</span>
              </NavLink>

              <NavLink
                to="/content/coding"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Code2 size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Coding Practice</span>
              </NavLink>
            </div>

            {/* Student Group 3: INSIGHTS */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">INSIGHTS</span>
              <NavLink
                to="/progress"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <TrendingUp size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Mastery & Progress</span>
              </NavLink>
            </div>
          </>
        ) : (
          <>
            {/* Instructor Group 1: OVERVIEW */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">OVERVIEW</span>
              <NavLink
                to="/home"
                end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Home size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Home</span>
              </NavLink>
            </div>

            {/* Instructor Group 2: CURRICULUM & STUDIO */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">CURRICULUM & STUDIO</span>
              <NavLink
                to="/teacher/content-upload"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <UploadCloud size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Syllabus Studio</span>
              </NavLink>

              <NavLink
                to="/content/concepts"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Layers size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Concept Map</span>
              </NavLink>

              <NavLink
                to="/content/quizzes"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <HelpCircle size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Practice Quizzes</span>
              </NavLink>

              <NavLink
                to="/content/coding"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Code2 size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Coding Sandbox</span>
              </NavLink>
            </div>

            {/* Instructor Group 3: COHORT & ANALYTICS */}
            <div className="sidebar-nav-group">
              <span className="sidebar-group-title">COHORT & ANALYTICS</span>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <Users size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Cohort Roster</span>
              </NavLink>

              <NavLink
                to="/teacher/student-progress"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <TrendingUp size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Class Analytics</span>
              </NavLink>

              <NavLink
                to="/progress"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                <TrendingUp size={18} strokeWidth={1.5} className="sidebar-item-icon" />
                <span className="sidebar-item-label">Mastery Evidence</span>
              </NavLink>
            </div>
          </>
        )}
      </nav>

      {/* Profile lives ONLY at the bottom of the sidebar */}
      <div className="sidebar-bottom-profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div className="sidebar-avatar-circle">
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user?.name || 'User'}
            >
              {user?.name || 'Authorized User'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {role === 'teacher' ? (user?.courseTaught?.split(':')[0] || 'Instructor') : (user?.className || 'Student')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
          <button
            type="button"
            onClick={() => {
              handleLinkClick();
              navigate('/profile');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <User size={13} strokeWidth={1.5} />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: '11.5px',
              color: 'var(--mastery-weak)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LogOut size={13} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
