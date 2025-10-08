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
        
        // CRITICAL: Block all auth changes during logout
        if (isLoggingOut.current) {
          console.log('Logout in progress, blocking auth state change');
          return;
        }

        // Only synchronous state updates here
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer async calls with setTimeout to prevent deadlocks
          setTimeout(() => {
            if (!isLoggingOut.current) {
              fetchProfile(session.user!.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    if (!isLoggingOut.current) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isLoggingOut.current) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (!isLoggingOut.current) {
              fetchProfile(session.user!.id);
            }
          }, 0);
        } else {
          setLoading(false);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // First check if user has a tenant record
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_info')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (tenantError) {
        console.error('Error fetching tenant data:', tenantError);
      }

      // Then check for profile record
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      // If user has both tenant and profile data, we need to handle role switching
      if (tenantData && profileData) {
        console.log('User has multiple roles - tenant and', profileData.role);
        // For now, prioritize the profile role, but this will be handled by the role switcher
        console.log('🔍 [useAuth] Setting profile for multi-role user:', profileData);
        setProfile(profileData as Profile);
      } else if (tenantData) {
        // User is only a tenant, create a minimal profile
        const tenantProfile = {
          id: tenantData.profile_id, // Use the actual profile_id from tenant_info
          user_id: userId,
          role: 'tenant' as const,
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          phone: tenantData.phone,
          avatar_url: null,
          emergency_contact_name: tenantData.emergency_contact_name,
          emergency_contact_phone: tenantData.emergency_contact_phone,
          bio: null
        };
        console.log('🔍 [useAuth] Setting tenant profile:', tenantProfile);
        setProfile(tenantProfile as Profile);
      } else if (profileData) {
        // User has only profile data
        console.log('🔍 [useAuth] Setting profile for profile-only user:', profileData);
        setProfile(profileData as Profile);
      } else {
        console.log('No profile or tenant data found for user, creating profile...');
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
      
      // Set logout flag FIRST to block all auth state changes
      isLoggingOut.current = true;
      
      // Clear local state immediately for smooth transition
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Clear all local storage auth data
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear Supabase session (non-blocking)
      supabase.auth.signOut({ scope: 'local' }).catch(console.error);
      
      console.log('Logout complete, redirecting...');
      
      // Immediate redirect without delay - use replace to prevent back button issues
      window.location.replace('/');
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Force logout anyway
      isLoggingOut.current = true;
      setUser(null);
      setProfile(null);
      setLoading(false);
      localStorage.clear();
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