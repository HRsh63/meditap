import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Users, Heart, ArrowRight, X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { downloadHospitalDatabase } from '../services/hospitalService';

interface LandingPageProps {
  user: User | null;
}

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'patient' | 'hospital' | 'insurance'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [downloadDb, setDownloadDb] = useState(false);
  const [dbRange, setDbRange] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          if (role === 'patient') {
            // Handle optional hospital DB download
            if (downloadDb) {
              try {
                // Get current location for download
                navigator.geolocation.getCurrentPosition(async (pos) => {
                  await downloadHospitalDatabase(pos.coords.latitude, pos.coords.longitude, dbRange);
                  // Update patient data with download status
                  await supabase.from('patient_data').update({
                    hospital_db_downloaded: true,
                    hospital_db_range: dbRange
                  }).eq('user_id', authData.user!.id);
                });
              } catch (e) {
                console.error("Initial DB download failed", e);
              }
            }
            navigate('/onboarding');
          } else if (role === 'hospital') {
            navigate('/hospital');
          } else {
            navigate('/insurance');
          }
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        
        // Profile fetch is handled in App.tsx via onAuthStateChange
        if (data.user) {
          // We need to wait for the profile to be fetched in App.tsx or fetch it here to redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (profile) {
            if (profile.role === 'patient') navigate('/dashboard');
            else if (profile.role === 'hospital') navigate('/hospital');
            else navigate('/insurance');
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAuth = (mode: 'login' | 'signup', selectedRole: 'patient' | 'hospital' | 'insurance' = 'patient') => {
    setAuthMode(mode);
    setRole(selectedRole);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 candy-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="text-2xl font-bold tracking-tight">MediTap</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
          <a href="#" className="hover:text-brand-pink">How it works</a>
          <a href="#" className="hover:text-brand-pink">Security</a>
          <a href="#" className="hover:text-brand-pink">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <button 
              onClick={() => navigate(user.role === 'patient' ? '/dashboard' : user.role === 'hospital' ? '/hospital' : '/insurance')}
              className="candy-button-primary"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="font-bold text-gray-600 hover:text-brand-pink">Login</button>
              <button 
                onClick={() => openAuth('signup')}
                className="candy-button-primary"
              >
                Patient Signup
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-12 md:py-24 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-pink rounded-full font-bold text-sm mb-6">
            <Zap size={16} />
            Instant Medical Identity
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Your Health, <br />
            <span className="text-brand-pink">One Tap Away.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-lg">
            The world's first instant medical identity platform. Access your records, insurance, and emergency data instantly.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => openAuth('signup', 'patient')} className="candy-button-primary text-lg px-8">Get Started Free</button>
            <button onClick={() => openAuth('login', 'hospital')} className="candy-button-outline text-lg px-8">Hospital Portal</button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="candy-card p-8 relative z-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 candy-gradient opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="flex items-center gap-4 mb-8">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Elena" 
                alt="Elena" 
                className="w-16 h-16 rounded-2xl bg-brand-light"
              />
              <div>
                <h3 className="text-xl font-bold">Elena Rodriguez</h3>
                <p className="text-gray-500">ID: MT-8829-X</p>
              </div>
              <div className="ml-auto px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">CRITICAL</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                <p className="text-lg font-bold">O Positive</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">Allergies</p>
                <p className="text-lg font-bold">Penicillin</p>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400">
              <Shield size={20} />
              <span className="font-medium">Encrypted & Secure</span>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-brand-purple opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -top-6 -left-6 w-64 h-64 bg-brand-blue opacity-10 rounded-full blur-3xl"></div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for the Ecosystem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Connecting patients, hospitals, and insurance providers in a seamless digital health network.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="candy-card p-8 bg-white cursor-pointer" onClick={() => openAuth('signup', 'patient')}>
              <div className="w-14 h-14 bg-pink-100 text-brand-pink rounded-2xl flex items-center justify-center mb-6">
                <Heart size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Patients</h3>
              <p className="text-gray-600 mb-6">Manage your medical identity, records, and insurance in one beautiful dashboard.</p>
              <div className="flex items-center text-brand-pink font-bold gap-2">
                Learn more <ArrowRight size={18} />
              </div>
            </div>

            <div className="candy-card p-8 bg-white cursor-pointer" onClick={() => openAuth('login', 'hospital')}>
              <div className="w-14 h-14 bg-purple-100 text-brand-purple rounded-2xl flex items-center justify-center mb-6">
                <Zap size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Hospitals</h3>
              <p className="text-gray-600 mb-6">Rapid patient lookup, instant record access, and streamlined emergency care.</p>
              <div className="flex items-center text-brand-purple font-bold gap-2">
                Learn more <ArrowRight size={18} />
              </div>
            </div>

            <div className="candy-card p-8 bg-white cursor-pointer" onClick={() => openAuth('login', 'insurance')}>
              <div className="w-14 h-14 bg-blue-100 text-brand-blue rounded-2xl flex items-center justify-center mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Insurance</h3>
              <p className="text-gray-600 mb-6">Automated claim verification and direct digital record integration.</p>
              <div className="flex items-center text-brand-blue font-bold gap-2">
                Learn more <ArrowRight size={18} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-500">
                  {authMode === 'login' ? 'Sign in to your MediTap account' : `Join MediTap as a ${role}`}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      required
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {authMode === 'signup' && role === 'patient' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="downloadDb"
                        className="w-5 h-5 rounded-lg accent-blue-500"
                        checked={downloadDb}
                        onChange={(e) => setDownloadDb(e.target.checked)}
                      />
                      <label htmlFor="downloadDb" className="text-sm font-black text-blue-900">
                        Download Offline Hospital DB
                      </label>
                    </div>
                    {downloadDb && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          <span>Range</span>
                          <span>{dbRange === 0 ? 'Full India' : `${dbRange} km`}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1000" 
                          step="50"
                          value={dbRange}
                          onChange={(e) => setDbRange(parseInt(e.target.value))}
                          className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <p className="text-[10px] text-blue-700/60 font-medium leading-tight">
                          {dbRange === 0 
                            ? "Downloads major hospitals across all of India for offline access." 
                            : `Downloads hospitals within ${dbRange}km of your location.`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm font-medium text-center">{error}</p>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full candy-button-primary py-4 text-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    authMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-gray-500 font-medium hover:text-brand-pink"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 candy-gradient rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <span className="text-xl font-bold">MediTap</span>
          </div>
          <div className="flex gap-8 text-gray-500 font-medium">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
          <p className="text-gray-400 text-sm">© 2026 MediTap Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
