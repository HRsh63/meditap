/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { User } from './types';
import { supabase } from './lib/supabase';

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
          profileImage: data.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
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
      </Routes>
    </Router>
  );
}

