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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

export function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('teacher'); // 'teacher' | 'student'

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
          setSuccessMessage('Teacher account created successfully! Redirecting...');
          setTimeout(() => navigate('/home'), 1000);
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
          setSuccessMessage('Student account created and enrolled successfully! Redirecting...');
          setTimeout(() => navigate('/home'), 1000);
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
        padding: '24px 16px',
      }}
    >
      <div
        className="studdy-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '36px 36px 28px',
          boxShadow: '0 20px 40px -10px rgba(22, 38, 80, 0.1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              background: 'var(--primary-gradient)',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontWeight: '800',
              fontSize: '24px',
              boxShadow: 'var(--primary-glow)',
              marginBottom: '12px',
            }}
          >
            P
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
            Pathwise
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Adaptive Learning & Assessment Workspace
          </p>
        </div>

        {/* 1-Click Fast Demo Credentials */}
        <div
          style={{
            background: 'var(--surface-muted)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '20px',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.05em' }}>
              Instant Demo Access
            </span>
            <span className="ai-badge">Instant Login</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn-studdy btn-studdy-secondary"
              style={{ padding: '8px 12px', fontSize: '12.5px', borderRadius: '12px' }}
              onClick={() => handleQuickDemo('teacher')}
              disabled={loading}
            >
              <ShieldCheck style={{ width: '15px', height: '15px', color: 'var(--primary)' }} />
              Teacher Demo
            </button>
            <button
              type="button"
              className="btn-studdy btn-studdy-secondary"
              style={{ padding: '8px 12px', fontSize: '12.5px', borderRadius: '12px' }}
              onClick={() => handleQuickDemo('student')}
              disabled={loading}
            >
              <UserCheck style={{ width: '15px', height: '15px', color: 'var(--primary)' }} />
              Student Demo
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs: Sign In vs Sign Up */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--surface-muted)',
            borderRadius: '16px',
            padding: '4px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            className="nav-pill"
            style={{
              justifyContent: 'center',
              padding: '9px 12px',
              borderRadius: '12px',
              backgroundColor: mode === 'signin' ? 'var(--primary)' : 'transparent',
              color: mode === 'signin' ? '#FFFFFF' : 'var(--text-muted)',
              boxShadow: mode === 'signin' ? 'var(--primary-glow)' : 'none',
            }}
            onClick={() => {
              setMode('signin');
              setErrorMessage('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="nav-pill"
            style={{
              justifyContent: 'center',
              padding: '9px 12px',
              borderRadius: '12px',
              backgroundColor: mode === 'signup' ? 'var(--primary)' : 'transparent',
              color: mode === 'signup' ? '#FFFFFF' : 'var(--text-muted)',
              boxShadow: mode === 'signup' ? 'var(--primary-glow)' : 'none',
            }}
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Role Selector: Teacher vs Student */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Select Workspace Role
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn-studdy"
              style={{
                borderRadius: '14px',
                border: role === 'teacher' ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: role === 'teacher' ? 'var(--primary-subtle)' : 'var(--surface)',
                color: role === 'teacher' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: '700',
              }}
              onClick={() => setRole('teacher')}
            >
              <ShieldCheck style={{ width: '16px', height: '16px' }} />
              Teacher Portal
            </button>
            <button
              type="button"
              className="btn-studdy"
              style={{
                borderRadius: '14px',
                border: role === 'student' ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: role === 'student' ? 'var(--primary-subtle)' : 'var(--surface)',
                color: role === 'student' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: '700',
              }}
              onClick={() => setRole('student')}
            >
              <GraduationCap style={{ width: '16px', height: '16px' }} />
              Student Portal
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--danger-subtle)',
              border: '1px solid #FECACA',
              color: 'var(--danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
            role="alert"
          >
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--success-subtle)',
              border: '1px solid #A7F3D0',
              color: 'var(--success)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit}>
          {/* Sign Up Specific Fields */}
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder={role === 'teacher' ? 'e.g. Dr. Priya Nair' : 'e.g. Arjun Sharma'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              {/* Class & Roll No Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Class / Cohort
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'teacher' ? 'e.g. CSE Batch 2026' : 'e.g. Section B'}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                    {role === 'teacher' ? 'Employee / Roll No' : 'Roll Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'teacher' ? 'e.g. EMP-CS-804' : 'e.g. 23CS104'}
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              {/* Phone No */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
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
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              {/* Teacher-only: which course teacher teaches */}
              {role === 'teacher' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Which Course Do You Teach?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS201: Data Structures & Algorithms"
                    value={courseTaught}
                    onChange={(e) => setCourseTaught(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              )}

              {/* Student-only: checking which course student wants to enroll from all available teachers */}
              {role === 'student' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Select Course & Teacher to Enroll In
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '13.5px',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.courseTaught}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Email Address */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. name@pathwise.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '13.5px',
              }}
            />
          </div>

          {/* Password with Show/Hide toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  fontSize: '13.5px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn-studdy btn-studdy-primary"
            style={{ width: '100%', padding: '12px', borderRadius: '14px', fontSize: '14px' }}
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : mode === 'signin' ? (
              `Sign In as ${role === 'teacher' ? 'Teacher' : 'Student'}`
            ) : role === 'teacher' ? (
              'Create Teacher Account'
            ) : (
              'Complete Student Enrollment'
            )}
          </button>
        </form>

        {/* Bottom Switcher */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'signin' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                onClick={() => setMode('signup')}
              >
                Sign up here
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
