import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  role: 'landlord' | 'tenant' | 'caretaker' | 'security';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bio: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    // Listen for auth changes FIRST (critical for preventing deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // If we're logging out, don't process any auth changes
        if (isLoggingOut.current) {
          console.log('Logout in progress, ignoring auth state change');
          return;
        }

        // Only synchronous state updates here
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer async calls with setTimeout to prevent deadlocks
          setTimeout(() => {
            fetchProfile(session.user!.id);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user!.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      } else {
        console.log('No profile found for user, creating one...');
        // Profile doesn't exist, create it using user metadata
        await createProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const profileData = {
        user_id: userId,
        role: user.user_metadata?.role || 'tenant',
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        phone: null,
        avatar_url: null
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      
      // Set logout flag to prevent auth state changes from interfering
      isLoggingOut.current = true;
      
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== 'Auth session missing!') {
        console.error('Error signing out:', error);
      }
      
      console.log('Logout successful, redirecting to login...');
      
      // Use a small delay to ensure state is cleared
      setTimeout(() => {
        isLoggingOut.current = false;
        // Force a full page reload to login page to clear all state
        window.location.replace('/');
      }, 100);
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Still clear state and redirect even if there's an error
      isLoggingOut.current = false;
      setUser(null);
      setProfile(null);
      setLoading(false);
      window.location.replace('/');
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};