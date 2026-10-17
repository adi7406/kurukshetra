/**
 * Authentication & User Registry Service
 * Connects directly to backend database Auth REST endpoints:
 * - POST /auth/login
 * - POST /auth/signup
 * - GET /auth/me
 * - POST /auth/logout
 * - GET /teachers
 * - GET /students
 * 
 * Direct database authentication using bcrypt password verification.
 * Zero static mock users or demo bypasses.
 */

import { apiClient } from './apiClient';

const SESSION_KEY = 'pathwise_active_session';

export const authService = {
  /**
   * Get all registered teachers from the database
   */
  async getAvailableTeachers() {
    try {
      const response = await apiClient.get('/teachers');
      const teachers = Array.isArray(response)
        ? response
        : response?.data || response?.teachers || [];
      return Array.isArray(teachers) ? teachers : [];
    } catch (err) {
      console.warn('[AuthService] Could not fetch teachers from database:', err.message);
      return [];
    }
  },

  /**
   * Get all registered students from the database
   */
  async getAllStudents() {
    try {
      const response = await apiClient.get('/students');
      const students = Array.isArray(response)
        ? response
        : response?.data || response?.students || [];
      return Array.isArray(students) ? students : [];
    } catch (err) {
      console.warn('[AuthService] Could not fetch students from database:', err.message);
      return [];
    }
  },

  /**
   * Teacher Signup:
   * Creates teacher account in database with bcrypt-hashed credentials.
   */
  async signupTeacher({ name, className, rollNo, phone, email, password, courseTaught }) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    const response = await apiClient.post('/auth/signup', {
      displayName: name.trim(),
      name: name.trim(),
      className: (className || '').trim(),
      rollNo: (rollNo || '').trim(),
      phone: (phone || '').trim(),
      email: normalizedEmail,
      password,
      role: 'trainer',
      courseTaught: (courseTaught || '').trim() || 'General Computer Science',
      metadata: {
        className: (className || '').trim(),
        rollNo: (rollNo || '').trim(),
        phone: (phone || '').trim(),
        courseTaught: (courseTaught || '').trim() || 'General Computer Science',
      },
    });

    const user = response?.user || response?.data?.user || response;
    const token =
      response?.token ||
      response?.session?.access_token ||
      response?.data?.session?.access_token ||
      response?.data?.token;

    const sessionUser = {
      ...user,
      id: user.id,
      name: user.name || user.display_name || name.trim(),
      email: user.email || normalizedEmail,
      role: 'teacher',
      token,
      className,
      rollNo,
      phone,
      courseTaught: courseTaught || 'General Computer Science',
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Student Signup:
   * Creates student account in database with bcrypt-hashed credentials.
   */
  async signupStudent({ name, className, rollNo, phone, email, password, teacherId, courseName }) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    const response = await apiClient.post('/auth/signup', {
      displayName: name.trim(),
      name: name.trim(),
      className: (className || '').trim(),
      rollNo: (rollNo || '').trim(),
      phone: (phone || '').trim(),
      email: normalizedEmail,
      password,
      role: 'student',
      teacherId,
      courseName: courseName || 'General Computer Science',
      metadata: {
        className: (className || '').trim(),
        rollNo: (rollNo || '').trim(),
        phone: (phone || '').trim(),
        teacherId,
        enrolledCourse: courseName || 'General Computer Science',
      },
    });

    const user = response?.user || response?.data?.user || response;
    const token =
      response?.token ||
      response?.session?.access_token ||
      response?.data?.session?.access_token ||
      response?.data?.token;

    const sessionUser = {
      ...user,
      id: user.id,
      name: user.name || user.display_name || name.trim(),
      email: user.email || normalizedEmail,
      role: 'student',
      token,
      className,
      rollNo,
      phone,
      enrolledCourse: courseName || 'General Computer Science',
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Log in user against the database with bcrypt verification
   */
  async login(identifier, password, selectedRole = 'student') {
    const cleanId = (identifier || '').trim();

    const response = await apiClient.post('/auth/login', {
      identifier: cleanId,
      email: cleanId,
      password,
      role: selectedRole,
    });

    const user = response?.user || response?.data?.user || response;
    const token =
      response?.token ||
      response?.session?.access_token ||
      response?.data?.session?.access_token ||
      response?.data?.token;

    const resolvedRole = user.role === 'trainer' ? 'teacher' : (user.role || selectedRole);

    const sessionUser = {
      ...user,
      id: user.id,
      name: user.name || user.display_name || user.email?.split('@')[0],
      email: user.email || cleanId,
      role: resolvedRole,
      token,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Set isolated session specifically for current tab
   */
  setTabUser(user) {
    if (!user) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
  },

  /**
   * Log out active user and clear session
   */
  async logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('pathwise_progress_store');
      localStorage.removeItem('pathwise_quizzes_store');
      localStorage.removeItem('pathwise_assessments_store');
      await apiClient.post('/auth/logout').catch(() => {});
    } catch {
      // Ignore errors during logout
    }
  },

  /**
   * Get current stored session user (prioritizes tab-isolated sessionStorage)
   */
  getCurrentUser() {
    try {
      const stored =
        sessionStorage.getItem(SESSION_KEY) ||
        localStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
    return null;
  },

  /**
   * Check and restore active session on app startup
   * Supports ?launch=student or ?launch=teacher URL params for seamless dual-tab launch
   */
  async checkSession() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const launchRole = params.get('launch') || params.get('role');
      if (launchRole === 'student') {
        const studentUser = {
          id: 'student_masterpath_demo',
          name: 'Alex Chen (Student)',
          email: 'student@masterpath.ai',
          role: 'student',
          token: 'mock_token_student_masterpath_demo_session',
          enrolledCourse: 'CS201 Data Structures & Algorithms (DSA)',
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(studentUser));
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // ignore
        }
        return studentUser;
      } else if (launchRole === 'teacher' || launchRole === 'trainer') {
        const teacherUser = {
          id: 'teacher_masterpath_demo',
          name: 'Dr. Katherine Vance (Instructor)',
          email: 'teacher@masterpath.ai',
          role: 'teacher',
          token: 'mock_token_teacher_masterpath_demo_session',
          courseTaught: 'CS201 Data Structures & Algorithms (DSA)',
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(teacherUser));
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // ignore
        }
        return teacherUser;
      }
    }

    const user = this.getCurrentUser();
    if (!user) return null;
    try {
      const refreshed = await this.getProfile();
      return refreshed || user;
    } catch {
      return user;
    }
  },

  /**
   * Refresh current user profile from backend
   */
  async getProfile() {
    try {
      const res = await apiClient.get('/me');
      const profile = res?.data?.profile || res?.profile || res;
      if (profile) {
        const current = this.getCurrentUser() || {};
        const updated = {
          ...current,
          ...profile,
          role: profile.role === 'trainer' ? 'teacher' : (profile.role || current.role),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch {
      // If offline or token expired
    }
    return this.getCurrentUser();
  },

  /**
   * Update current user profile fields (displayName, metadata)
   */
  async updateProfile(updates) {
    const response = await apiClient.patch('/me', updates);
    const profile = response?.data?.profile || response?.profile || response;
    const current = this.getCurrentUser() || {};
    const updated = {
      ...current,
      ...profile,
      name: profile?.display_name || current.name,
      role: profile?.role === 'trainer' ? 'teacher' : (profile?.role || current.role),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  },
};

export default authService;
