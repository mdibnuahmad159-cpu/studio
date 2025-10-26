
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = 'useAdmin'; // Store password securely in a real app

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check sessionStorage only on the client side
    try {
      const storedIsAdmin = sessionStorage.getItem('isAdmin') === 'true';
      if (storedIsAdmin) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Could not access sessionStorage.');
    }
    setIsInitialized(true);
  }, []);

  const login = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
        return true;
      } catch (error) {
        console.error('Could not access sessionStorage.');
        setIsAdmin(true); // Still allow login if sessionStorage fails
        return true;
      }
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem('isAdmin');
    } catch (error) {
      console.error('Could not access sessionStorage.');
    }
    setIsAdmin(false);
  }, []);
  
  // Don't render anything on the server or before initialization
  if (!isInitialized) {
      return null;
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

