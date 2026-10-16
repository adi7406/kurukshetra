import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Layers,
  HelpCircle,
  Code2,
  TrendingUp,
  Users,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function MobileBottomNav() {
  const { role } = useAuth();

  const studentItems = [
    { to: '/home', label: 'Home', icon: Home, end: true },
    { to: '/content/concepts', label: 'Concept Map', icon: Layers },
    { to: '/content/quizzes', label: 'Quizzes', icon: HelpCircle },
    { to: '/content/coding', label: 'Coding', icon: Code2 },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
  ];

  const instructorItems = [
    { to: '/home', label: 'Home', icon: Home, end: true },
    { to: '/dashboard', label: 'Cohort', icon: Users },
    { to: '/teacher/student-progress', label: 'Analytics', icon: TrendingUp },
    { to: '/teacher/content-upload', label: 'Syllabus', icon: UploadCloud },
  ];

  const items = role === 'teacher' ? instructorItems : studentItems;

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-hairline)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 50,
        boxShadow: '0 -2px 10px rgba(20, 20, 30, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          width: '100%',
          overflowX: 'auto',
          gap: '4px',
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '56px',
                minHeight: '44px',
                padding: '4px 8px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? 'var(--coral)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                transition: 'color 150ms ease',
              })}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span style={{ marginTop: '2px', whiteSpace: 'nowrap' }}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
