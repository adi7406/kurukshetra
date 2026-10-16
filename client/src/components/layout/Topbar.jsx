import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Layers,
  HelpCircle,
  Code2,
  Users,
  X,
  ArrowRight,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Topbar() {
  const { user, role, logout, login } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Command palette shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchModalOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 50);
    }
  }, [searchModalOpen]);

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

  const userHandle = user?.email ? `@${user.email.split('@')[0]}` : '@user';

  const searchableItems = [
    { title: 'Dynamic Arrays & Geometric Doubling', category: 'Concept', path: '/content/concepts', icon: <Layers size={14} /> },
    { title: 'Hash Tables & Quadratic Probing', category: 'Concept', path: '/content/concepts', icon: <Layers size={14} /> },
    { title: 'Self-Balancing AVL Trees', category: 'Concept', path: '/content/concepts', icon: <Layers size={14} /> },
    { title: 'Hash Table Collision Diagnostic Quiz', category: 'Quiz', path: '/content/quizzes', icon: <HelpCircle size={14} /> },
    { title: 'Binary Search Tree Balancing Quiz', category: 'Quiz', path: '/content/quizzes', icon: <HelpCircle size={14} /> },
    { title: 'LRU Cache Design (Coding Sandbox)', category: 'Assessment', path: '/content/coding', icon: <Code2 size={14} /> },
    { title: 'In-Place Dynamic Array Compaction', category: 'Assessment', path: '/content/coding', icon: <Code2 size={14} /> },
    { title: 'Student Roster & Mastery Matrix', category: 'Teacher', path: '/dashboard', icon: <Users size={14} /> },
    { title: 'Syllabus Ingestion Pipeline', category: 'Teacher', path: '/teacher/content-upload', icon: <Layers size={14} /> },
    { title: 'Bayesian Knowledge Tracing Analytics', category: 'Analytics', path: '/progress', icon: <Layers size={14} /> },
  ];

  const filteredItems = searchableItems.filter((i) =>
    i.title.toLowerCase().includes(searchVal.toLowerCase()) ||
    i.category.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <>
      <header className="app-topbar">
        {/* Search Bar with Ctrl+K shortcut */}
        <div
          className="search-pill-container"
          onClick={() => setSearchModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Press Ctrl + K to search"
        >
          <Search size={15} color="var(--text-light)" />
          <span style={{ fontSize: '13px', color: 'var(--text-light)', flex: 1 }}>
            Search concepts, quizzes, coding problems...
          </span>
          <span className="search-kbd-shortcut">Ctrl K</span>
        </div>

        {/* Right Topbar Actions */}
        <div className="topbar-actions">
          {/* Role Switcher */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRoleToggle}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              gap: '6px',
            }}
            title={`Switch to ${role === 'teacher' ? 'Student' : 'Instructor'} View`}
          >
            {role === 'teacher' ? (
              <>
                <GraduationCap size={13} color="var(--primary)" />
                <span>Switch to <strong>Student</strong></span>
              </>
            ) : (
              <>
                <Shield size={13} color="#C2410C" />
                <span>Switch to <strong>Instructor</strong></span>
              </>
            )}
          </button>

          {/* System Status Indicator */}
          <div className="system-status-pill">
            <span className="status-dot" />
            <span>Ready · Judge0 Sandbox & BKT</span>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              className="icon-btn-pill"
              aria-label="Notifications"
              title="System Notifications"
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <Bell size={16} />
              <span className="notif-badge" />
            </button>

            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '320px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--card-radius)',
                  boxShadow: 'var(--dialog-shadow)',
                  border: '1px solid var(--border)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  zIndex: 100,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>Activity & Updates</span>
                  <span className="badge-clean blue">3 New</span>
                </div>

                <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Diagnostic Quiz Graded: Hash Tables
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Score: 92% • Mastery increased to Mastered (+15% BKT)
                  </div>
                </div>

                <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Sandbox Execution Environment
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Isolated container runner verified (C++, Python, JS active)
                  </div>
                </div>

                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Curriculum Ingestion
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Instructor uploaded 3 concepts and 2 code tasks
                  </div>
                </div>
              </div>
            )}
          </div>

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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1.2' }}>
                  {user?.name || 'User'}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-light)' }}>
                  {userHandle}
                </span>
              </div>
              <ChevronDown size={13} color="var(--text-light)" />
            </div>

            {/* Profile Menu Dropdown */}
            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '200px',
                  background: 'var(--surface)',
                  padding: '6px',
                  borderRadius: 'var(--card-radius)',
                  boxShadow: 'var(--dialog-shadow)',
                  border: '1px solid var(--border)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                    {role === 'teacher' ? 'Faculty Instructor' : 'Enrolled Student'}
                  </div>
                </div>

                <button
                  type="button"
                  className="nav-pill"
                  style={{ padding: '6px 10px', fontSize: '12.5px' }}
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                >
                  <User size={14} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="nav-pill"
                  style={{
                    padding: '6px 10px',
                    fontSize: '12.5px',
                    color: 'var(--danger)',
                  }}
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <LogOut size={14} />
                  <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Search Modal */}
      {searchModalOpen && (
        <div className="modal-overlay" onClick={() => setSearchModalOpen(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}>
              <Search size={16} color="var(--primary)" />
              <input
                ref={searchInputRef}
                type="text"
                className="search-pill-input"
                placeholder="Search concepts, quizzes, coding problems, students..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '8px 10px', maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', padding: '4px 8px' }}>
                Quick Navigation ({filteredItems.length})
              </div>

              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  className="nav-pill"
                  onClick={() => {
                    setSearchModalOpen(false);
                    navigate(item.path);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{item.category}</div>
                  </div>
                  <ArrowRight size={13} color="var(--text-light)" />
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
                  No matching resources found for "{searchVal}".
                </div>
              )}
            </div>

            <div style={{ padding: '8px 14px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-light)' }}>
              <span>Use arrow keys to navigate</span>
              <span>ESC to exit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Topbar;
