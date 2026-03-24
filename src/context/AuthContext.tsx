/**
 * Authentication Context
 * PRD: Firebase Phone OTP Authentication
 * 
 * Provides auth state and methods for the entire app.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// User type from our backend
interface User {
  id: string;
  phoneNumber: string;
  displayName?: string;
  role: string;
  preferredLanguage: string;
  reportsSubmitted: number;
  reportsResolved: number;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  // Phone auth methods
  sendOTP: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  // State
  isAuthenticated: boolean;
  confirmationResult: ConfirmationResult | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// RecaptchaVerifier singleton
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Fetch user profile from backend
        try {
          const token = await fbUser.getIdToken();
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize recaptcha
  const initRecaptcha = () => {
    if (!recaptchaVerifier) {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
      });
    }
    return recaptchaVerifier;
  };

  // Send OTP to phone number
  const sendOTP = async (phoneNumber: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Format phone number (ensure +91 prefix for India)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+91${phoneNumber.replace(/^0/, '')}`;
      
      const verifier = initRecaptcha();
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send OTP');
      // Reset recaptcha on error
      recaptchaVerifier = null;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (otp: string) => {
    if (!confirmationResult) {
      setError('No OTP sent. Please request a new OTP.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      await confirmationResult.confirm(otp);
      setConfirmationResult(null);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setConfirmationResult(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    sendOTP,
    verifyOTP,
    signOut,
    isAuthenticated: !!user,
    confirmationResult,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
