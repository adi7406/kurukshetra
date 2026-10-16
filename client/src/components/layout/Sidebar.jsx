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
  Shield,
  User,
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
          <span className="brand-badge">BETA</span>
        </NavLink>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {role === 'teacher' ? 'Instructor Portal' : 'Student Portal'}
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

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <LayoutDashboard className="nav-pill-icon" />
              <span>Dashboard</span>
            </NavLink>

            {/* Content (Collapsible Parent) */}
            <div>
              <button
                type="button"
                className={`nav-pill ${isContentActive ? 'active' : ''}`}
                onClick={() => setContentOpen((prev) => !prev)}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen className="nav-pill-icon" />
                  <span>Content</span>
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
                    <span>Concepts</span>
                    <span className="nav-pill-badge">DAG</span>
                  </NavLink>

                  <NavLink
                    to="/content/quizzes"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <HelpCircle size={14} />
                    <span>Quizzes on Concepts</span>
                  </NavLink>

                  <NavLink
                    to="/content/coding"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Code2 size={14} />
                    <span>Coding Assessment</span>
                    <span className="nav-pill-badge">Sandbox</span>
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
              <span>Progress</span>
              <span className="nav-pill-badge">BKT</span>
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
              <span>Dashboard (Students)</span>
              <span className="nav-pill-badge">38</span>
            </NavLink>

            <NavLink
              to="/teacher/content-upload"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <UploadCloud className="nav-pill-icon" />
              <span>Content Uploading</span>
              <span className="nav-pill-badge">AI Pipeline</span>
            </NavLink>

            <NavLink
              to="/teacher/student-progress"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <TrendingUp className="nav-pill-icon" />
              <span>Students Progress</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer User Profile Card */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user-card"
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
          title="Click to view profile"
        >
          <div className="sidebar-user-avatar">
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Authorized User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role === 'teacher' ? (user?.courseTaught || 'Instructor') : (user?.className || 'Student')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <span className={`badge-clean ${role === 'teacher' ? 'amber' : 'blue'}`}>
            {role === 'teacher' ? 'Instructor' : 'Student'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '500' }}>
            v2.4 Production
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
