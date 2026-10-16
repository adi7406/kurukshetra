import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  Code2,
  TrendingUp,
  UploadCloud,
  Users,
  ChevronDown,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ isOpen, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const isContentActive = location.pathname.startsWith('/content');
  const [contentOpen, setContentOpen] = useState(isContentActive || true);

  useEffect(() => {
    if (isContentActive) {
      setContentOpen(true);
    }
  }, [isContentActive]);

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
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
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/home" className="brand-logo" onClick={handleLinkClick}>
          <div className="brand-icon">
            <GraduationCap size={18} />
          </div>
          <span className="brand-text">Pathwise</span>
          <span className="brand-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>ADAPTIVE</span>
        </NavLink>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {role === 'teacher' ? 'Instructor Workspace' : 'Learning Workspace'}
        </div>

        {/* STUDENT NAVIGATION */}
        {role !== 'teacher' && (
          <>
            <NavLink
              to="/home"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Home className="nav-pill-icon" />
              <span>Home</span>
            </NavLink>

            {/* Content (Collapsible Parent) */}
            <div>
              <button
                type="button"
                className={`nav-pill ${isContentActive ? 'active' : ''}`}
                onClick={() => setContentOpen((prev) => !prev)}
                style={{ justifyContent: 'space-between', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen className="nav-pill-icon" />
                  <span>Curriculum</span>
                </div>
                {contentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {contentOpen && (
                <div className="nested-pills">
                  <NavLink
                    to="/content/concepts"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Layers size={14} />
                    <span>Concept Map</span>
                  </NavLink>

                  <NavLink
                    to="/content/quizzes"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <HelpCircle size={14} />
                    <span>Practice Quizzes</span>
                  </NavLink>

                  <NavLink
                    to="/content/coding"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Code2 size={14} />
                    <span>Coding Practice</span>
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink
              to="/progress"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <TrendingUp className="nav-pill-icon" />
              <span>Mastery & Progress</span>
            </NavLink>
          </>
        )}

        {/* TEACHER NAVIGATION */}
        {role === 'teacher' && (
          <>
            <NavLink
              to="/home"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Home className="nav-pill-icon" />
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Users className="nav-pill-icon" />
              <span>Students</span>
            </NavLink>

            <NavLink
              to="/teacher/content-upload"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <UploadCloud className="nav-pill-icon" />
              <span>Syllabus & Content</span>
            </NavLink>

            <NavLink
              to="/teacher/student-progress"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <TrendingUp className="nav-pill-icon" />
              <span>Class Analytics</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer User Info */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 4px' }}>
          <div className="sidebar-user-avatar">
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Authorized User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role === 'teacher' ? (user?.courseTaught?.split(':')[0] || 'Instructor') : (user?.className || 'Student')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginTop: '6px' }}>
          <span className={`badge-clean ${role === 'teacher' ? 'amber' : 'blue'}`}>
            {role === 'teacher' ? 'Instructor' : 'Student'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '500' }}>
            Pathwise v2.4
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
