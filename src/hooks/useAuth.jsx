import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        const activeUser = await authService.checkSession();
        setUser(activeUser);
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
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const signupTeacher = async (data) => {
    setError(null);
    try {
      const newUser = await authService.signupTeacher(data);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message || 'Teacher signup failed');
      throw err;
    }
  };

  const signupStudent = async (data) => {
    setError(null);
    try {
      const newUser = await authService.signupStudent(data);
      setUser(newUser);
      return newUser;
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
    setUser(updated);
    return updated;
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
