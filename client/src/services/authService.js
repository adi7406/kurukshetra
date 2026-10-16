/**
 * Authentication & User Registry Service
 * Implements:
 * - Teacher Signup (Name, Class, Roll/Emp No, Phone, Email, Password, Course Taught)
 * - Student Signup (Name, Class, Roll No, Phone, Email, Password, Enrolled Teacher/Course)
 * - Authoritative Role Login
 * - Persistent User Store in LocalStorage
 */

import { INITIAL_TEACHERS, INITIAL_STUDENTS } from './mockData';

const SESSION_KEY = 'pathwise_active_session';
const USERS_STORE_KEY = 'pathwise_users_store';

function getUsers() {
  const existing = localStorage.getItem(USERS_STORE_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      // Fallback
    }
  }
  const initial = [...INITIAL_TEACHERS, ...INITIAL_STUDENTS];
  localStorage.setItem(USERS_STORE_KEY, JSON.stringify(initial));
  return initial;
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORE_KEY, JSON.stringify(users));
}

export const authService = {
  /**
   * Get all registered teachers with their courses taught
   * Used in Student Signup for course enrollment
   */
  async getAvailableTeachers() {
    const users = getUsers();
    return users.filter((u) => u.role === 'teacher');
  },

  /**
   * Get all registered students with their individual mastery levels
   * Used in Teacher Dashboard
   */
  async getAllStudents() {
    const users = getUsers();
    return users.filter((u) => u.role === 'student');
  },

  /**
   * Teacher Signup:
   * Name, Class, Roll no / Employee ID, Phone no, Email, Password, Course Taught
   */
  async signupTeacher({ name, className, rollNo, phone, email, password, courseTaught }) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();

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
    saveUsers(users);

    localStorage.setItem(SESSION_KEY, JSON.stringify(newTeacher));
    return newTeacher;
  },

  /**
   * Student Signup:
   * Name, Class, Roll no, Phone no, Email, Password, Enrolled Teacher & Course
   */
  async signupStudent({ name, className, rollNo, phone, email, password, teacherId, courseName }) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const teachers = users.filter((u) => u.role === 'teacher');
    const selectedTeacher = teachers.find((t) => t.id === teacherId) || teachers[0];

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
      teacherName: selectedTeacher?.name || 'Dr. Priya Nair',
      overallMastery: 25,
      attendance: '1/1',
      homeworkCompleted: '0/10',
      rating: 70,
      status: 'Newly Enrolled',
      conceptMastery: {
        c_arrays: 25,
        c_linkedlists: 0,
        c_hashtables: 0,
        c_recursion: 0,
        c_dp: 0,
        c_bst: 0,
      },
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
    saveUsers(users);

    localStorage.setItem(SESSION_KEY, JSON.stringify(newStudent));
    return newStudent;
  },

  /**
   * Log in user with email, password, and authoritative role check
   */
  async login(email, password, selectedRole = 'student') {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    const matchedUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!matchedUser) {
      throw new Error('Invalid email or password. Please verify your credentials or sign up.');
    }

    // Role check
    if (selectedRole && matchedUser.role !== selectedRole) {
      throw new Error(
        `Account role mismatch: Your account is registered as '${matchedUser.role}'. You cannot sign in as '${selectedRole}'.`
      );
    }

    if (matchedUser.password && matchedUser.password !== password) {
      throw new Error('Invalid password. Please try again.');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(matchedUser));
    return matchedUser;
  },

  /**
   * Verify session on mount / refresh
   */
  async checkSession() {
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
    localStorage.removeItem(SESSION_KEY);
    return true;
  },

  /**
   * Profile update
   */
  async updateProfile(updates) {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      const updated = {
        ...user,
        ...updates,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

      // Also update in users store
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx] = updated;
        saveUsers(users);
      }
      return updated;
    }
    throw new Error('Failed to update profile.');
  },
};
