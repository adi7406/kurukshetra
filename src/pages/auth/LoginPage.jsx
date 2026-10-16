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
    <div className="min-h-screen flex items-center justify-center bg-[#F4F2F0] p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-[1fr_1.2fr] bg-white rounded-[28px] border border-[#ECEAE8] shadow-[0_20px_50px_rgba(20,19,18,0.06)] overflow-hidden">
        {/* Left Hero & Feature Showcase Column */}
        <div className="bg-[#1C1C21] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF5B37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10">
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-[#2A2A32] border border-white/10 flex items-center justify-center text-[#FF5B37]">
                <GraduationCap size={20} strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xl tracking-tight text-white font-['Outfit',sans-serif]">
                  Pathwise
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/80 border border-white/10 tracking-wide uppercase">
                  Beta
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white leading-snug mb-3 font-['Outfit',sans-serif]">
              Structured curriculum.<br />Measurable mastery.
            </h2>
            <p className="text-xs text-white/70 leading-relaxed mb-8">
              Adaptive concept progression driven by probabilistic knowledge tracing, real-time isolated code sandboxes, and automated syllabus extraction.
            </p>

            {/* Feature Cards */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-[#26262D] border border-white/5 p-3 rounded-[12px]">
                <div className="w-7 h-7 rounded-lg bg-[#17A673]/15 text-[#17A673] flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Bayesian Mastery Model (BKT)</div>
                  <div className="text-[11px] text-white/60">Probabilistic skill estimation with DAG prerequisite validation</div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#26262D] border border-white/5 p-3 rounded-[12px]">
                <div className="w-7 h-7 rounded-lg bg-[#F5A524]/15 text-[#F5A524] flex items-center justify-center shrink-0 mt-0.5">
                  <Layers size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Syllabus Ingestion Pipeline</div>
                  <div className="text-[11px] text-white/60">Automated document parsing & diagnostic quiz generation</div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#26262D] border border-white/5 p-3 rounded-[12px]">
                <div className="w-7 h-7 rounded-lg bg-[#FF5B37]/15 text-[#FF5B37] flex items-center justify-center shrink-0 mt-0.5">
                  <Code2 size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Judge0 Sandbox & AI Viva</div>
                  <div className="text-[11px] text-white/60">Isolated execution with conceptual comprehension assessment</div>
                </div>
              </div>
            </div>
          </div>

            {/* Institutional Trust Badge */}
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60 relative z-10">
            <span className="flex items-center gap-1.5">
              <Building2 size={13} strokeWidth={1.5} />
              <span>Kurukshetra Institute of Technology</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock size={12} strokeWidth={1.5} /> Enterprise Grade
            </span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          {/* Header Switcher: Sign In vs Sign Up */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#141312] mb-1 font-['Outfit',sans-serif]">
                {mode === 'signin' ? 'Sign In to Portal' : 'Create an Account'}
              </h1>
              <p className="text-xs text-[#6E6B68]">
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
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-[#141312] bg-[#F8F7F6] hover:bg-[#F0EEEA] border border-[#ECEAE8] transition-colors"
            >
              {mode === 'signin' ? 'Create Account' : 'Back to Sign In'}
            </button>
          </div>

          {/* Quick Demo Access */}
          <div className="bg-[#F8F7F6] border border-[#ECEAE8] rounded-[16px] p-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#9B9793] uppercase tracking-wider">
                Instant Evaluator Access
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFEDE8] text-[#FF5B37] border border-[#FF5B37]/20">
                1-Click Demo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-medium bg-white hover:bg-neutral-50 text-[#141312] border border-[#ECEAE8] shadow-sm transition-all"
                onClick={() => handleQuickDemo('student')}
                disabled={loading}
              >
                <User size={13} strokeWidth={1.5} className="text-[#FF5B37]" />
                <span>Demo <strong>Student</strong></span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-medium bg-white hover:bg-neutral-50 text-[#141312] border border-[#ECEAE8] shadow-sm transition-all"
                onClick={() => handleQuickDemo('teacher')}
                disabled={loading}
              >
                <Shield size={13} strokeWidth={1.5} className="text-[#1C1C21]" />
                <span>Demo <strong>Instructor</strong></span>
              </button>
            </div>
          </div>

          {/* Workspace Role Selector */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase text-[#9B9793] mb-1.5 tracking-wider">
              Active Workspace Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F8F7F6] rounded-[14px] border border-[#ECEAE8]">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] text-xs font-medium transition-all ${
                  role === 'student'
                    ? 'bg-white text-[#141312] shadow-sm font-semibold'
                    : 'text-[#6E6B68] hover:text-[#141312]'
                }`}
                onClick={() => setRole('student')}
              >
                <GraduationCap size={14} strokeWidth={1.5} className={role === 'student' ? 'text-[#FF5B37]' : ''} />
                Student Portal
              </button>

              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] text-xs font-medium transition-all ${
                  role === 'teacher'
                    ? 'bg-white text-[#141312] shadow-sm font-semibold'
                    : 'text-[#6E6B68] hover:text-[#141312]'
                }`}
                onClick={() => setRole('teacher')}
              >
                <Shield size={14} strokeWidth={1.5} className={role === 'teacher' ? 'text-[#FF5B37]' : ''} />
                Instructor Workspace
              </button>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-[12px] bg-[#FDE8E8] border border-[#E5484D]/30 text-[#E5484D] text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={15} strokeWidth={1.5} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-[12px] bg-[#E8F7F0] border border-[#17A673]/30 text-[#17A673] text-xs flex items-center gap-2 mb-4">
              <CheckCircle2 size={15} strokeWidth={1.5} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#141312] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'teacher' ? 'Dr. Priya Nair' : 'Aarav Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                  />
                </div>

                {/* Class & Roll Number */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#141312] mb-1">
                      Class / Cohort
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'CSE Faculty' : 'B.Tech CSE Sec A'}
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#141312] mb-1">
                      {role === 'teacher' ? 'Faculty ID' : 'Roll Number'}
                    </label>
                    <input
                      type="text"
                      placeholder={role === 'teacher' ? 'EMP-8841' : '23CS0104'}
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#141312] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                  />
                </div>

                {/* Teacher Specific: Course Taught */}
                {role === 'teacher' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#141312] mb-1">
                      Course You Teach
                    </label>
                    <input
                      type="text"
                      placeholder="CS201: Data Structures & Algorithms"
                      value={courseTaught}
                      onChange={(e) => setCourseTaught(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                    />
                  </div>
                )}

                {/* Student Specific: Dynamic Teacher Selection */}
                {role === 'student' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#141312] mb-1">
                      Select Instructor & Course
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
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
              <label className="block text-xs font-semibold text-[#141312] mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder={role === 'teacher' ? 'faculty@college.edu' : 'student@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#141312] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secret password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 pr-10 rounded-[12px] border border-[#ECEAE8] bg-[#F8F7F6]/50 focus:bg-white text-xs outline-none focus:border-[#FF5B37] focus:ring-2 focus:ring-[#FF5B37]/15 transition-all text-[#141312]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9793] hover:text-[#141312] transition-colors"
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-full bg-[#FF5B37] hover:bg-[#EE4A26] text-white font-semibold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="mt-5 text-center text-[11px] text-[#9B9793] flex items-center justify-center gap-1.5">
            <Lock size={12} strokeWidth={1.5} />
            <span>Authoritative server-validated authentication with Supabase & JWT.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
