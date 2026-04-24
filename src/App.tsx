/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import HospitalPortal from './pages/HospitalPortal';
import InsurancePortal from './pages/InsurancePortal';
import EmergencyView from './pages/EmergencyView';
import Onboarding from './pages/Onboarding';
import IDCard from './pages/IDCard';
import Records from './pages/Records';
import Vault from './pages/Vault';
import Settings from './pages/Settings';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import FriendSOSListener from './components/FriendSOSListener';
import { User } from './types';
import { supabase } from './lib/supabase';

function AnimatedRoutes({ user, loading }: { user: User | null, loading: boolean }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.02, y: -10 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={user ? <Navigate to={user.role === 'patient' ? '/dashboard' : user.role === 'hospital' ? '/hospital' : '/insurance'} /> : <LandingPage user={user} />} />
          <Route path="/onboarding" element={user ? <Onboarding user={user} /> : <Navigate to="/" />} />
          <Route 
            path="/dashboard" 
            element={user?.role === 'patient' ? <Dashboard user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/hospital" 
            element={user?.role === 'hospital' ? <HospitalPortal user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/insurance" 
            element={user?.role === 'insurance' ? <InsurancePortal user={user} /> : <Navigate to="/" />} 
          />
          <Route path="/emergency/:id" element={<EmergencyView />} />
          <Route path="/id-card" element={user ? <IDCard user={user} /> : <Navigate to="/" />} />
          <Route path="/records" element={user ? <Records user={user} /> : <Navigate to="/" />} />
          <Route path="/vault" element={user ? <Vault user={user} /> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <Settings user={user} /> : <Navigate to="/" />} />
          <Route path="/friends" element={user ? <Friends user={user} /> : <Navigate to="/" />} />
          <Route path="/chats" element={user ? <Chat user={user} /> : <Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
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
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as any,
          profileImage: data.profile_image
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F8]">
        <div className="w-12 h-12 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      {user && <FriendSOSListener user={user} />}
      <AnimatedRoutes user={user} loading={loading} />
    </Router>
  );
}

