import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Layers,
  HelpCircle,
  Code2,
  Users,
  TrendingUp,
  UploadCloud,
  Home,
  User,
  ArrowRight,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { learningService } from '../../services/learningService';
import { authService } from '../../services/authService';

export function CommandPalette({ isOpen, onClose }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const [concepts, quizzes, assessments, students] = await Promise.all([
          learningService.getAllConcepts(),
          learningService.getQuizzes(),
          learningService.getAssessments(),
          role === 'teacher' ? authService.getAllStudents() : Promise.resolve([]),
        ]);

        const catalog = [
          // Common pages
          { id: 'page-home', title: 'Home (Workspace Overview)', category: 'Navigation', path: '/home', icon: Home },
          { id: 'page-concepts', title: 'Interactive Concept Map', category: 'Navigation', path: '/content/concepts', icon: Layers },
          { id: 'page-quizzes', title: 'Practice Quizzes', category: 'Navigation', path: '/content/quizzes', icon: HelpCircle },
          { id: 'page-coding', title: 'Coding Practice (Sandbox)', category: 'Navigation', path: '/content/coding', icon: Code2 },
          { id: 'page-progress', title: 'Mastery & Learning Progress', category: 'Navigation', path: '/progress', icon: TrendingUp },
          { id: 'page-profile', title: 'My Profile & Account', category: 'Navigation', path: '/profile', icon: User },
        ];

        if (role === 'teacher') {
          catalog.push(
            { id: 'page-upload', title: 'Syllabus & Content Extraction', category: 'Instructor', path: '/teacher/content-upload', icon: UploadCloud },
            { id: 'page-dashboard', title: 'Instructor Dashboard & Roster', category: 'Instructor', path: '/dashboard', icon: Users },
            { id: 'page-roster', title: 'Students Progress Matrix', category: 'Instructor', path: '/teacher/student-progress', icon: Users }
          );

          // Add real students
          students.forEach((s) => {
            catalog.push({
              id: `student-${s.id}`,
              title: `${s.name} (${s.rollNo})`,
              subtitle: `${s.overallMastery}% Mastery · ${s.className}`,
              category: 'Student',
              path: `/teacher/student-progress?studentId=${s.id}`,
              icon: Users,
            });
          });
        }

        // Add real concepts
        concepts.forEach((c) => {
          catalog.push({
            id: `concept-${c.id}`,
            title: c.name,
            subtitle: c.moduleTitle || 'Core Concept',
            category: 'Concept',
            path: '/content/concepts',
            icon: Layers,
          });
        });

        // Add real quizzes
        quizzes.forEach((q) => {
          catalog.push({
            id: `quiz-${q.id}`,
            title: q.title,
            subtitle: `${q.questions?.length || 5} questions · Pass ${q.passingScore}%`,
            category: 'Quiz',
            path: '/content/quizzes',
            icon: HelpCircle,
          });
        });

        // Add real assessments
        assessments.forEach((a) => {
          catalog.push({
            id: `code-${a.id}`,
            title: a.title,
            subtitle: `${a.difficulty} difficulty · Unit tests & AI viva`,
            category: 'Coding Challenge',
            path: '/content/coding',
            icon: Code2,
          });
        });

        setItems(catalog);
      } catch (err) {
        console.error('Failed to populate command palette items:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadCatalog();
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, role]);

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }).slice(0, 12);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
    >
      <div
        className="modal-dialog-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '100%',
          border: '1px solid var(--primary-border)',
          boxShadow: 'var(--dialog-shadow)',
        }}
      >
        {/* Search Input Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <Search size={18} color="var(--primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search concepts, practice quizzes, coding challenges, students..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Searching workspace catalog...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>No matching items found</div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Try searching for "Arrays", "Hash Tables", "LRU Cache", or "Quiz"
              </div>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon || Layers;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                    border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 80ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--primary)' : 'var(--surface-muted)',
                        color: isSelected ? '#FFF' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isSelected ? '700' : '600',
                          color: isSelected ? 'var(--text-main)' : 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--surface-muted)',
                        color: 'var(--text-light)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && <CornerDownLeft size={13} color="var(--primary)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-light)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>&uarr;</kbd> <kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>&darr;</kbd> Navigate</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>Enter</kbd> Select</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>Esc</kbd> Close</span>
          </div>
          <span>Pathwise Command Palette</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
