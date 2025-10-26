import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Set this to true while developing frontend-only to bypass Supabase/backend.
// When ready to re-enable backend auth, set to false.
export const FRONTEND_ONLY = true;

const fakeUser = {
  id: 'dev-user',
  email: 'dev@local',
} as unknown as User;

const fakeSession = {
  provider_token: null,
  access_token: 'dev-token',
  expires_in: 0,
  token_type: 'bearer',
  user: fakeUser,
} as unknown as Session;

const fakeProfile = {
  id: 'dev-user',
  email: 'dev@local',
  full_name: 'Muthu Manoj L',
  company_name: 'Local',
  biometric_enabled: false,
  theme_preference: 'dark',
};

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string;
  biometric_enabled: boolean;
  theme_preference: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (FRONTEND_ONLY) {
      // In frontend-only mode we do NOT auto-login so the login screen remains visible.
      // The signIn/signUp functions will simulate login when the user interacts with the UI.
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

  supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (FRONTEND_ONLY) {
      setProfile(fakeProfile as Profile);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (FRONTEND_ONLY) {
      // simulate successful sign in
      setSession(fakeSession);
      setUser(fakeUser);
      setProfile(fakeProfile as Profile);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (FRONTEND_ONLY) {
      // simulate sign up and auto-login
      setSession(fakeSession);
      setUser(fakeUser);
      setProfile({ ...(fakeProfile as Profile), full_name: fullName || 'Developer' });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        full_name: fullName || null,
      });
      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    if (FRONTEND_ONLY) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
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
