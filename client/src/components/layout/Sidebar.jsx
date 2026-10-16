import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Sparkles,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ isOpen, onCloseMobile }) {
  const location = useLocation();
  const { user, role } = useAuth();

  // Content sub-menu open state
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

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/home" className="brand-logo" onClick={handleLinkClick}>
          <div className="brand-icon">
            <GraduationCap size={20} />
          </div>
          <span className="brand-text">Pathwise</span>
        </NavLink>
      </div>

      {/* Role-Specific Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {role === 'teacher' ? 'Instructor Workspace' : 'Student Portal'}
        </div>

        {/* ============================================================== */}
        {/* STUDENT NAVIGATION */}
        {/* Home -> Dashboard -> Content (Concepts, Quizzes, Coding) -> Progress */}
        {/* ============================================================== */}
        {role !== 'teacher' && (
          <>
            {/* 1. Home */}
            <NavLink
              to="/home"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Home className="nav-pill-icon" />
              <span>Home</span>
            </NavLink>

            {/* 2. Dashboard */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <LayoutDashboard className="nav-pill-icon" />
              <span>Dashboard</span>
            </NavLink>

            {/* 3. Content (Collapsible Parent) */}
            <div>
              <button
                type="button"
                className={`nav-pill ${isContentActive ? 'active' : ''}`}
                onClick={() => setContentOpen((prev) => !prev)}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BookOpen className="nav-pill-icon" />
                  <span>Content</span>
                </div>
                {contentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {contentOpen && (
                <div className="nested-pills">
                  {/* Concepts */}
                  <NavLink
                    to="/content/concepts"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Layers size={15} />
                    <span>Concepts</span>
                  </NavLink>

                  {/* Quizzes on that Concept */}
                  <NavLink
                    to="/content/quizzes"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <HelpCircle size={15} />
                    <span>Quizzes on Concepts</span>
                  </NavLink>

                  {/* Coding Assessment */}
                  <NavLink
                    to="/content/coding"
                    className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Code2 size={15} />
                    <span>Coding Assessment</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 4. Progress */}
            <NavLink
              to="/progress"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <TrendingUp className="nav-pill-icon" />
              <span>Progress</span>
            </NavLink>
          </>
        )}

        {/* ============================================================== */}
        {/* TEACHER NAVIGATION */}
        {/* Home -> Dashboard (All students progress & mastery) */}
        {/* -> Content Uploading (Syllabus, LLM extracts Concepts, Quizzes, Coding) */}
        {/* -> Progress of the students */}
        {/* ============================================================== */}
        {role === 'teacher' && (
          <>
            {/* 1. Home */}
            <NavLink
              to="/home"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Home className="nav-pill-icon" />
              <span>Home</span>
            </NavLink>

            {/* 2. Dashboard: all students progress with each of their mastery level */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Users className="nav-pill-icon" />
              <span>Dashboard (Students)</span>
            </NavLink>

            {/* 3. Content Uploading: Syllabus upload -> LLM extraction */}
            <NavLink
              to="/teacher/content-upload"
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <UploadCloud className="nav-pill-icon" />
              <span>Content Uploading</span>
              <span className="nav-pill-badge">AI</span>
            </NavLink>

            {/* 4. Progress of the students */}
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

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`role-badge ${role === 'teacher' ? 'teacher' : 'student'}`}>
            {role === 'teacher' ? (
              <>
                <ShieldCheck size={13} />
                <span>Instructor</span>
              </>
            ) : (
              <>
                <GraduationCap size={13} />
                <span>Student</span>
              </>
            )}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '600' }}>
          v2.0
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
