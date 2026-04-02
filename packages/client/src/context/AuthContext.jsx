import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import * as api from '../api/webauthn.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMe().then((result) => {
      if (result.ok) {
        setUser(result.data.user);
        setCredentials(result.data.credentials);
      }
      setLoading(false);
    });
  }, []);

  const register = useCallback(async (username) => {
    setStep('requesting');
    setError(null);

    try {
      // Get registration options
      const optionsResult = await api.getRegistrationOptions(username);
      if (!optionsResult.ok) {
        throw new Error(optionsResult.error);
      }

      // Trigger browser biometric prompt and sign challenge
      setStep('authenticating');
      const attResp = await startRegistration({
        optionsJSON: optionsResult.data,
      });

      // Send signed challenge to server
      setStep('verifying');
      const verifyResult = await api.verifyRegistration(attResp);
      if (!verifyResult.ok) {
        throw new Error(verifyResult.error);
      }

      if (!verifyResult.data.verified) {
        throw new Error('Registration failed. Please try again.');
      }

      // Registration successful, get user profile to display
      const meResult = await api.getMe();
      if (meResult.ok) {
        setUser(meResult.data.user);
        setCredentials(meResult.data.credentials);
      }

      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setStep('error');
    }
  }, []);

  const login = useCallback(async (username) => {
    setStep('requesting');
    setError(null);

    try {
      // Retrieve auth options
      const optionsResult = await api.getAuthenticationOptions(username);
      if (!optionsResult.ok) {
        throw new Error(optionsResult.error);
      }

      // Trigger browser biometric prompt and sign challenge
      setStep('authenticating');
      const assertResp = await startAuthentication({
        optionsJSON: optionsResult.data,
      });

      // Send signed challenge to server
      setStep('verifying');
      const verifyResult = await api.verifyAuthentication(assertResp);
      if (!verifyResult.ok) {
        throw new Error(verifyResult.error);
      }

      if (!verifyResult.data.verified) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Auth successful, get user profile to display
      const meResult = await api.getMe();
      if (meResult.ok) {
        setUser(meResult.data.user);
        setCredentials(meResult.data.credentials);
      }

      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setStep('error');
    }
  }, []);

  const logoutUser = useCallback(async () => {
    await api.logout();
    setUser(null);
    setCredentials([]);
    setStep('idle');
    setError(null);
  }, []);

  const removeCredential = useCallback(async (id) => {
    const result = await api.deleteCredential(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStep('idle');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        credentials,
        loading,
        step,
        error,
        register,
        login,
        logout: logoutUser,
        removeCredential,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Gives calling component access to auth context
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
