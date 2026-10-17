import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

function normalizeUser(u) {
  if (!u) return null;
  const isTeacher = u.role === 'trainer' || u.role === 'teacher';
  return {
    ...u,
    role: isTeacher ? 'teacher' : (u.role || 'student'),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        const activeUser = await authService.checkSession();
        setUser(normalizeUser(activeUser));
      } catch (err) {
        console.error('Session check failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, []);

  const login = async (email, password, selectedRole) => {
    setError(null);
    try {
      const authenticatedUser = await authService.login(email, password, selectedRole);
      const normalized = normalizeUser(authenticatedUser);
      setUser(normalized);
      return normalized;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const signupTeacher = async (data) => {
    setError(null);
    try {
      const newUser = await authService.signupTeacher(data);
      const normalized = normalizeUser(newUser);
      setUser(normalized);
      return normalized;
    } catch (err) {
      setError(err.message || 'Teacher signup failed');
      throw err;
    }
  };

  const signupStudent = async (data) => {
    setError(null);
    try {
      const newUser = await authService.signupStudent(data);
      const normalized = normalizeUser(newUser);
      setUser(normalized);
      return normalized;
    } catch (err) {
      setError(err.message || 'Student signup failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (updates) => {
    const updated = await authService.updateProfile(updates);
    const normalized = normalizeUser(updated);
    setUser(normalized);
    return normalized;
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    signupTeacher,
    signupStudent,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
