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

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Log out active user and clear session
   */
  async logout() {
    try {
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
   * Get current stored session user
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
    return null;
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
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch {
      // If offline or token expired
    }
    return this.getCurrentUser();
  },
};

export default authService;
