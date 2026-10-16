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

export function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('student'); // 'teacher' | 'student'

  // Common fields
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleQuickDemo = async (demoRole) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      setLoading(true);
      if (demoRole === 'teacher') {
        await login('teacher@pathwise.edu', 'teacher123', 'teacher');
      } else {
        await login('student@pathwise.edu', 'student123', 'student');
      }
      navigate('/home');
    } catch (err) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

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
            teacherId: selectedTeacherId,
            courseName: chosenTeacher?.courseTaught,
          });
          setSuccessMessage('Student account created and enrolled. Redirecting...');
          setTimeout(() => navigate('/home'), 800);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--canvas-bg)',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.15fr',
          background: 'var(--surface)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
        }}
      >
        {/* Left Hero & Feature Showcase Column */}
        <div
          style={{
            background: 'var(--primary-gradient)',
            color: '#FFFFFF',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <GraduationCap size={20} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>
                  Pathwise
                </span>
                <span className="brand-badge" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFF', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                  BETA
                </span>
              </div>
            </div>

            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.3', marginBottom: '10px' }}>
              Structured curriculum.<br />Measurable mastery.
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', marginBottom: '28px' }}>
              Powered by Bayesian Knowledge Tracing, automated syllabus-to-curriculum extraction, and isolated coding sandboxes.
            </p>

            {/* Feature Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '10px 12px', borderRadius: '8px' }}>
                <TrendingUp size={16} style={{ color: '#A7F3D0' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>Bayesian Mastery Model (BKT)</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>Probabilistic skill estimation with DAG validation</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '10px 12px', borderRadius: '8px' }}>
                <Layers size={16} style={{ color: '#FDE68A' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>Syllabus Ingestion Pipeline</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>Multer in-memory document parsing & quiz generation</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '10px 12px', borderRadius: '8px' }}>
                <Code2 size={16} style={{ color: '#BAE6FD' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700' }}>Judge0 Sandbox & AI Viva</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>Isolated execution with code comprehension viva</div>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Trust Badge */}
          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.8)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={13} />
              <span>Kurukshetra Institute of Technology</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Enterprise Grade
            </span>
          </div>
        </div>

        {/* Right Form Column */}
        <div style={{ padding: '32px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Header Switcher: Sign In vs Sign Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px' }}>
                {mode === 'signin' ? 'Sign In to Portal' : 'Create an Account'}
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {mode === 'signin'
                  ? 'Access your learning and instruction workspace'
                  : 'Register your academic profile and join your cohort'}
              </p>
            </div>

            {/* Mode Toggle Button */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: '600',
              }}
            >
              {mode === 'signin' ? 'Create Account' : 'Back to Sign In'}
            </button>
          </div>

          {/* Quick Demo Access */}
          <div
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Instant Evaluator Access
              </span>
              <span className="badge-clean blue">1-Click</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 8px', fontSize: '11.5px', background: '#FFF' }}
                onClick={() => handleQuickDemo('student')}
                disabled={loading}
              >
                <User size={13} color="var(--primary)" />
                <span>Demo <strong>Student</strong></span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 8px', fontSize: '11.5px', background: '#FFF' }}
                onClick={() => handleQuickDemo('teacher')}
                disabled={loading}
              >
                <Shield size={13} color="#C2410C" />
                <span>Demo <strong>Instructor</strong></span>
              </button>
            </div>
          </div>

          {/* Workspace Role Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '5px', letterSpacing: '0.04em' }}>
              Active Workspace Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  border: role === 'student' ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: role === 'student' ? 'var(--primary-subtle)' : 'var(--surface)',
                  color: role === 'student' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: role === 'student' ? '700' : '500',
                  padding: '7px 10px',
                  fontSize: '12.5px',
                }}
                onClick={() => setRole('student')}
              >
                <GraduationCap size={14} />
                Student Portal
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  border: role === 'teacher' ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: role === 'teacher' ? 'var(--primary-subtle)' : 'var(--surface)',
                  color: role === 'teacher' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: role === 'teacher' ? '700' : '500',
                  padding: '7px 10px',
                  fontSize: '12.5px',
                }}
                onClick={() => setRole('teacher')}
              >
                <Shield size={14} />
                Instructor Workspace
              </button>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--danger-subtle)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--success-subtle)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
              }}
            >
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'teacher' ? 'Dr. Priya Nair' : 'Aarav Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '12.5px',
                    }}
                  />
                </div>

                {/* Class & Roll Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                      Class / Cohort
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'CSE Faculty' : 'B.Tech CSE Sec A'}
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        fontSize: '12.5px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                      {role === 'teacher' ? 'Faculty ID' : 'Roll Number'}
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'EMP-8841' : '23CS0104'}
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        fontSize: '12.5px',
                      }}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '12.5px',
                    }}
                  />
                </div>

                {/* Teacher Specific: Course Taught */}
                {role === 'teacher' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                      Course You Teach
                    </label>
                    <input
                      type="text"
                      placeholder="CS201: Data Structures & Algorithms"
                      value={courseTaught}
                      onChange={(e) => setCourseTaught(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        fontSize: '12.5px',
                      }}
                    />
                  </div>
                )}

                {/* Student Specific: Dynamic Teacher Selection */}
                {role === 'student' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                      Select Instructor & Course
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        fontSize: '12.5px',
                        background: '#FFF',
                      }}
                    >
                      {availableTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.courseTaught || 'CS201 Data Structures'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder={role === 'teacher' ? 'faculty@college.edu' : 'student@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  fontSize: '12.5px',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '3px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secret password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '7px 32px 7px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '12.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '13px',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <span>Authenticating with server...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In as {role === 'teacher' ? 'Instructor' : 'Student'}</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '11px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Lock size={11} />
            <span>Authoritative server-validated authentication with Supabase & JWT.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
