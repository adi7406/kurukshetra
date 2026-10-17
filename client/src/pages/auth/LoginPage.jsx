import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Code2,
  TrendingUp,
  Layers,
  ArrowRight,
  Lock,
  Building2,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import MasterPathLogo from '../../components/common/MasterPathLogo';

export function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('student'); // 'teacher' | 'student'

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Teacher specific
  const [courseTaught, setCourseTaught] = useState('CS201: Data Structures & Algorithmic Problem Solving');

  // Student specific
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login, signupTeacher, signupStudent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTeachers() {
      try {
        const teachers = await authService.getAvailableTeachers();
        setAvailableTeachers(teachers);
        if (teachers.length > 0) {
          setSelectedTeacherId(teachers[0].id);
        }
      } catch (err) {
        console.error('Failed to load teachers:', err);
      }
    }
    loadTeachers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email, password, role);
        navigate('/home');
      } else {
        // Sign up mode
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        if (role === 'teacher') {
          if (!name || !className || !rollNo || !phone || !email || !password) {
            throw new Error('Please fill out all required teacher fields.');
          }
          await signupTeacher({
            name,
            className,
            rollNo,
            phone,
            email,
            password,
            courseTaught,
          });
          setSuccessMessage('Teacher account created successfully. Redirecting...');
          setTimeout(() => navigate('/home'), 800);
        } else {
          // Student signup
          if (!name || !className || !rollNo || !phone || !email || !password) {
            throw new Error('Please fill out all required student fields.');
          }
          const chosenTeacher = availableTeachers.find((t) => t.id === selectedTeacherId);
          await signupStudent({
            name,
            className,
            rollNo,
            phone,
            email,
            password,
            teacherId: selectedTeacherId || null,
            courseName: chosenTeacher?.courseTaught || courseTaught || 'General Computer Science',
          });
          setSuccessMessage('Student account created and enrolled. Redirecting...');
          setTimeout(() => navigate('/home'), 800);
        }
      }
    } catch (err) {
      let msg = 'Authentication error. Please check your credentials.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err?.message && typeof err.message === 'string') {
        msg = err.message;
      } else if (err?.error && typeof err.error === 'string') {
        msg = err.error;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Left Hero & Feature Showcase Column */}
        <div className="auth-hero-column">
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 91, 55, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* MasterPath Official Brand Logo */}
            <div style={{ marginBottom: '32px' }}>
              <MasterPathLogo variant="full" height={42} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3, marginBottom: '12px' }}>
              Structured curriculum.<br />Measurable mastery.
            </h2>
            <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, marginBottom: '28px' }}>
              Adaptive concept progression driven by probabilistic knowledge tracing, real-time isolated code sandboxes, and automated syllabus extraction.
            </p>

            {/* Feature Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-feature-card">
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(23, 166, 115, 0.15)',
                    color: '#17A673',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <TrendingUp size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                    Bayesian Mastery Model (BKT)
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                    Probabilistic skill estimation with DAG prerequisite validation
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 165, 36, 0.15)',
                    color: '#F5A524',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Layers size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                    Syllabus Ingestion Pipeline
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                    Automated document parsing & diagnostic quiz generation
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 91, 55, 0.15)',
                    color: 'var(--coral)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Code2 size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                    Judge0 Sandbox & AI Viva
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                    Isolated execution with conceptual comprehension assessment
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Trust Badge */}
          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={13} strokeWidth={1.5} />
              <span>Kurukshetra Institute of Technology</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} strokeWidth={1.5} /> Enterprise Grade
            </span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="auth-form-column">
          {/* Header Switcher: Sign In vs Sign Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                {mode === 'signin' ? 'Sign In to Portal' : 'Create an Account'}
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                {mode === 'signin'
                  ? 'Access your personalized learning and assessment workspace'
                  : 'Register your academic profile and join your cohort'}
              </p>
            </div>

            {/* Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="btn-ghost-pill btn-compact"
              style={{ whiteSpace: 'nowrap' }}
            >
              {mode === 'signin' ? 'Create Account' : 'Back to Sign In'}
            </button>
          </div>


          {/* Workspace Role Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.04em' }}>
              Active Workspace Role
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                padding: '4px',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: '14px',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: role === 'student' ? 600 : 500,
                  backgroundColor: role === 'student' ? '#FFFFFF' : 'transparent',
                  color: role === 'student' ? 'var(--text-main)' : 'var(--text-secondary)',
                  boxShadow: role === 'student' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onClick={() => setRole('student')}
              >
                <GraduationCap size={14} strokeWidth={1.5} color={role === 'student' ? 'var(--coral)' : 'currentColor'} />
                <span>Student Portal</span>
              </button>

              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: role === 'teacher' ? 600 : 500,
                  backgroundColor: role === 'teacher' ? '#FFFFFF' : 'transparent',
                  color: role === 'teacher' ? 'var(--text-main)' : 'var(--text-secondary)',
                  boxShadow: role === 'teacher' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onClick={() => setRole('teacher')}
              >
                <Shield size={14} strokeWidth={1.5} color={role === 'teacher' ? 'var(--coral)' : 'currentColor'} />
                <span>Instructor Workspace</span>
              </button>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--danger-subtle)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--success-subtle)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'teacher' ? 'Dr. Priya Nair' : 'Aarav Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>

                {/* Class & Roll Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Class / Cohort
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'CSE Faculty' : 'B.Tech CSE Sec A'}
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required
                      className="auth-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      {role === 'teacher' ? 'Faculty ID' : 'Roll Number'}
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'EMP-8841' : '23CS0104'}
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>

                {/* Teacher Specific: Course Taught */}
                {role === 'teacher' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Course You Teach
                    </label>
                    <input
                      type="text"
                      placeholder="CS201: Data Structures & Algorithms"
                      value={courseTaught}
                      onChange={(e) => setCourseTaught(e.target.value)}
                      required
                      className="auth-input"
                    />
                  </div>
                )}

                {/* Student Specific: Dynamic Teacher Selection */}
                {role === 'student' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      {availableTeachers.length > 0 ? 'Select Instructor & Course' : 'Course / Field of Study'}
                    </label>
                    {availableTeachers.length > 0 ? (
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="auth-input"
                        style={{ backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Choose Instructor --</option>
                        {availableTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.courseTaught || 'General Track'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Data Structures & Algorithms (or general track)"
                        value={courseTaught}
                        onChange={(e) => setCourseTaught(e.target.value)}
                        className="auth-input"
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* User ID / Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder={role === 'teacher' ? 'faculty@college.edu' : 'student@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === 'signup' ? 6 : 1}
                  required
                  className="auth-input"
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
              {mode === 'signup' && (
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Password must be at least 6 characters
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-coral-pill"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 16px',
                fontSize: '13px',
                marginTop: '6px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span>Authenticating with server...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In as {role === 'teacher' ? 'Instructor' : 'Student'}</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lock size={12} strokeWidth={1.5} />
            <span>Authoritative server-validated authentication with Supabase & JWT.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
