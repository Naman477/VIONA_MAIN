import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile from Supabase
    async function fetchProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
        }
        setProfile(data || null);
        return data;
    }

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Auth methods
    async function signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        return { data, error };
    }

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            setUser(null);
            setProfile(null);
        }
        return { error };
    }

    async function updateProfile(updates) {
        if (!user) return { error: { message: 'Not authenticated' } };

        const { data, error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
            .select()
            .single();

        if (!error && data) {
            setProfile(data);
        }
        return { data, error };
    }

    async function deleteAllUserData() {
        if (!user) return;

        // Delete in order: messages → sessions → notes → ideas → reminders
        await supabase.from('messages').delete().eq('user_id', user.id);
        await supabase.from('chat_sessions').delete().eq('user_id', user.id);
        await supabase.from('smart_notes').delete().eq('user_id', user.id);
        await supabase.from('idea_vault').delete().eq('user_id', user.id);
        await supabase.from('reminders').delete().eq('user_id', user.id);
    }

    async function deleteAccount() {
        await deleteAllUserData();
        await supabase.from('profiles').delete().eq('id', user.id);
        await signOut();
    }

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        deleteAllUserData,
        deleteAccount,
        fetchProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
