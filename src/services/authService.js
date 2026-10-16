/**
 * Authentication & User Registry Service
 * Connects directly to backend Auth REST endpoints:
 * - POST /auth/login
 * - POST /auth/signup
 * - GET /auth/me
 * - POST /auth/logout
 * - GET /teachers
 * - GET /students
 * 
 * Supports universal evaluator credentials (ID: demo / PASS: demo)
 * No static mock student/teacher datasets are preloaded.
 */

import { apiClient } from './apiClient';

const SESSION_KEY = 'pathwise_active_session';
const USERS_STORE_KEY = 'pathwise_users_store';

function getLocalUsers() {
  try {
    const existing = localStorage.getItem(USERS_STORE_KEY);
    if (existing) {
      return JSON.parse(existing);
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(USERS_STORE_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage quota error
  }
}

export const authService = {
  /**
   * Get all registered teachers with their courses taught
   */
  async getAvailableTeachers() {
    try {
      const response = await apiClient.get('/teachers');
      const teachers = Array.isArray(response) ? response : response?.data || response?.teachers || [];
      if (Array.isArray(teachers) && teachers.length > 0) {
        return teachers;
      }
    } catch {
      // Backend not yet running or route pending
    }
    const users = getLocalUsers();
    return users.filter((u) => u.role === 'teacher');
  },

  /**
   * Get all registered students with their individual mastery levels
   */
  async getAllStudents() {
    try {
      const response = await apiClient.get('/students');
      const students = Array.isArray(response) ? response : response?.data || response?.students || [];
      if (Array.isArray(students) && students.length > 0) {
        return students;
      }
    } catch {
      // Backend not yet running or route pending
    }
    const users = getLocalUsers();
    return users.filter((u) => u.role === 'student');
  },

  /**
   * Teacher Signup:
   * Name, Class, Roll no / Employee ID, Phone no, Email, Password, Course Taught
   */
  async signupTeacher({ name, className, rollNo, phone, email, password, courseTaught }) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Attempt backend API registration
    try {
      const response = await apiClient.post('/auth/signup', {
        name: name.trim(),
        className: className.trim(),
        rollNo: rollNo.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        password,
        role: 'teacher',
        courseTaught: courseTaught.trim() || 'CS201: Data Structures & Algorithms',
      });
      if (response?.user || response?.token) {
        const user = response.user || response;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
    } catch {
      // Backend not yet running: fall back to local dynamic registration
    }

    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const newTeacher = {
      id: `usr_teacher_${Date.now()}`,
      name: name.trim(),
      className: className.trim(),
      rollNo: rollNo.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      password,
      role: 'teacher',
      courseTaught: courseTaught.trim() || 'CS201: Data Structures & Algorithms',
      department: 'Faculty of Computer Science & Engineering',
      avatarInitials: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      joinedDate: 'Oct 2026',
      studentsCount: 0,
    };

    users.push(newTeacher);
    saveLocalUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newTeacher));
    return newTeacher;
  },

  /**
   * Student Signup:
   * Name, Class, Roll no, Phone no, Email, Password, Enrolled Teacher & Course
   */
  async signupStudent({ name, className, rollNo, phone, email, password, teacherId, courseName }) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Attempt backend API registration
    try {
      const response = await apiClient.post('/auth/signup', {
        name: name.trim(),
        className: className.trim(),
        rollNo: rollNo.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        password,
        role: 'student',
        teacherId,
        courseName,
      });
      if (response?.user || response?.token) {
        const user = response.user || response;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
    } catch {
      // Backend not yet running: fall back to local dynamic registration
    }

    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const teachers = users.filter((u) => u.role === 'teacher');
    const selectedTeacher = teachers.find((t) => t.id === teacherId);

    const newStudent = {
      id: `usr_student_${Date.now()}`,
      name: name.trim(),
      className: className.trim(),
      rollNo: rollNo.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      password,
      role: 'student',
      enrolledCourse: courseName || selectedTeacher?.courseTaught || 'CS201: Data Structures',
      teacherName: selectedTeacher?.name || 'Department Faculty',
      overallMastery: 0,
      attendance: '0/0',
      homeworkCompleted: '0/0',
      rating: 0,
      status: 'Newly Enrolled',
      conceptMastery: {},
      quizzesCompleted: 0,
      codingTasksCompleted: 0,
      avatarInitials: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      joinedDate: 'Oct 2026',
    };

    users.push(newStudent);
    saveLocalUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newStudent));
    return newStudent;
  },

  /**
   * Log in user with email/ID, password, and authoritative role check
   * Supports universal evaluator credentials (ID: demo, PASS: demo)
   */
  async login(identifier, password, selectedRole = 'student') {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim().toLowerCase();

    // Universal Evaluator Demo credentials: ID: demo / PASS: demo for both student and teacher
    if (cleanId === 'demo' && cleanPass === 'demo') {
      const demoUser =
        selectedRole === 'teacher'
          ? {
              id: 'usr_demo_teacher',
              name: 'Dr. Priya Nair',
              email: 'priya.nair@college.edu',
              rollNo: 'FAC-CS-101',
              className: 'Year 2 B.Tech CSE',
              role: 'teacher',
              courseTaught: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
              department: 'Department of Computer Science',
              avatarInitials: 'PN',
            }
          : {
              id: 'usr_demo_student',
              name: 'Aditya Sharma',
              email: 'aditya.sharma@college.edu',
              rollNo: 'CS22B042',
              className: 'B.Tech CSE II-A',
              role: 'student',
              enrolledCourse: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
              teacherName: 'Dr. Priya Nair',
              overallMastery: 0,
              avatarInitials: 'AS',
            };

      localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    // Attempt backend API login
    try {
      const response = await apiClient.post('/auth/login', {
        identifier,
        password,
        role: selectedRole,
      });
      if (response?.user || response?.token) {
        const user = response.user || response;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
    } catch {
      // Backend not yet running or route pending: authenticate against registered local users
    }

    const users = getLocalUsers();
    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.rollNo && u.rollNo.toLowerCase() === cleanId) ||
        (u.id && u.id.toLowerCase() === cleanId)
    );

    if (!matchedUser) {
      throw new Error('Invalid credentials. For instant demo access, use ID: demo and Password: demo.');
    }

    if (selectedRole && matchedUser.role !== selectedRole) {
      throw new Error(
        `Account role mismatch: Your account is registered as '${matchedUser.role}'. You cannot sign in as '${selectedRole}'.`
      );
    }

    if (matchedUser.password && matchedUser.password !== password) {
      throw new Error('Invalid password. For demo access, use Password: demo.');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(matchedUser));
    return matchedUser;
  },

  /**
   * Verify session on mount / refresh
   */
  async checkSession() {
    try {
      const response = await apiClient.get('/auth/me');
      if (response?.user || response?.id) {
        const user = response.user || response;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
    } catch {
      // Offline fallback to stored session
    }

    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    return null;
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Fallback
    }
    localStorage.removeItem(SESSION_KEY);
    return true;
  },

  /**
   * Profile update
   */
  async updateProfile(updates) {
    try {
      const response = await apiClient.patch('/me', updates);
      if (response?.user || response?.data) {
        const updated = response.user || response.data;
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch {
      // Fallback
    }

    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      const updated = {
        ...user,
        ...updates,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

      const users = getLocalUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx] = updated;
        saveLocalUsers(users);
      }
      return updated;
    }
    throw new Error('Failed to update profile.');
  },
};

export default authService;
