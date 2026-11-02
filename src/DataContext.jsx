import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {

  // ── Server health ──────────────────────────────────────────────────────────
  const [serverStatus, setServerStatus] = useState({
    isChecking: true,
    isActive: false,
    error: null,
    retryCount: 0
  });

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const maxRetries = 10000;
    const retryDelay = 3000;

    const attemptHealthCheck = async (attempt) => {
      try {
        setServerStatus(prev => ({ ...prev, isChecking: true, retryCount: attempt }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setServerStatus({ isChecking: false, isActive: true, error: null, retryCount: attempt });
          return true;
        }
      } catch {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptHealthCheck(attempt + 1);
        } else {
          setServerStatus({
            isChecking: false,
            isActive: false,
            error: 'Server is not responding. Please try again later.',
            retryCount: attempt
          });
          return false;
        }
      }
    };

    attemptHealthCheck(0);
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [authData, setAuthData] = useState({
    phoneNumber: '',
    pin: '',
    otp: '',
    isAuthenticated: false
  });

  const updateAuthData = (data) => setAuthData(prev => ({ ...prev, ...data }));

  const resetAllData = () => {
    setAuthData({ phoneNumber: '', pin: '', otp: '', isAuthenticated: false });
  };

  const value = {
    serverStatus,
    authData,
    updateAuthData,
    resetAllData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
