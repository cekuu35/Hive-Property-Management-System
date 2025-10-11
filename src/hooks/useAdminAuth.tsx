import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'apollo.sankii@gmail.com'; // Your admin email
const ADMIN_PASSWORD = 'AdminPassword123!'; // Hardcoded admin password (you can change this)

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      // Check if admin is logged in via localStorage (separate from Supabase auth)
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        if (sessionData.email === ADMIN_EMAIL && sessionData.isAdmin) {
          setIsAdmin(true);
          setUser({ email: ADMIN_EMAIL, id: 'admin' });
        } else {
          localStorage.removeItem('admin_session');
          setIsAdmin(false);
          setUser(null);
        }
      } else {
        setIsAdmin(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Admin auth check error:', error);
      setIsAdmin(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsAdmin = async (email: string, password: string) => {
    if (email !== ADMIN_EMAIL) {
      throw new Error('Access denied. This portal is restricted to authorized administrators only.');
    }

    // Check if there's a stored admin password, otherwise use default
    const adminSession = localStorage.getItem('admin_session');
    let storedPassword = ADMIN_PASSWORD; // Default password
    
    if (adminSession) {
      try {
        const sessionData = JSON.parse(adminSession);
        if (sessionData.password) {
          storedPassword = sessionData.password;
        }
      } catch (error) {
        // If there's an error parsing the session, use default password
        console.log('Error parsing admin session, using default password');
        storedPassword = ADMIN_PASSWORD;
      }
    }

    console.log('Attempting admin login:', { email, providedPassword: password, expectedPassword: storedPassword });

    if (password !== storedPassword) {
      throw new Error('Invalid credentials. Please check your email and password.');
    }

    // Create admin session in localStorage (separate from Supabase)
    const newAdminSession = {
      email: ADMIN_EMAIL,
      isAdmin: true,
      password: storedPassword,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('admin_session', JSON.stringify(newAdminSession));
    setIsAdmin(true);
    setUser({ email: ADMIN_EMAIL, id: 'admin' });

    return { user: { email: ADMIN_EMAIL, id: 'admin' } };
  };

  const signOut = async () => {
    localStorage.removeItem('admin_session');
    setIsAdmin(false);
    setUser(null);
  };

  return {
    isAdmin,
    isLoading,
    user,
    signInAsAdmin,
    signOut,
    checkAdminAuth
  };
};