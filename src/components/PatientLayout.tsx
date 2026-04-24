import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, FileText, Plus, User as UserIcon, Shield, Search, 
  Bell, LogOut, Settings, Info, Lock, HelpCircle, User, ChevronRight, X, Zap,
  MessageSquare
} from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface PatientLayoutProps {
  children: React.ReactNode;
  user: UserType;
  noScroll?: boolean;
}

export default function PatientLayout({ children, user, noScroll = false }: PatientLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWorkingModal, setShowWorkingModal] = useState(false);
  const [workingStep, setWorkingStep] = useState(0);

  useEffect(() => {
    if (noScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [noScroll]);

  const navItems = [
    { icon: <Activity size={22} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={22} />, label: 'Records', path: '/records' },
    { icon: <MessageSquare size={22} />, label: 'Chats', path: '/chats' },
    { icon: <UserIcon size={22} />, label: 'My ID', path: '/id-card' },
    { icon: <Settings size={22} />, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const workingSteps = [
    {
      title: "Instant Identity",
      description: "MediTap creates a unique digital medical ID that stores your critical health information securely.",
      icon: <UserIcon size={48} className="text-brand-pink" />,
      color: "bg-pink-50",
      accent: "border-pink-200"
    },
    {
      title: "One-Tap Access",
      description: "Hospitals and emergency responders can access your life-saving data instantly via QR or NFC tap.",
      icon: <Zap size={48} className="text-brand-purple" />,
      color: "bg-purple-50",
      accent: "border-purple-200"
    },
    {
      title: "Secure Records",
      description: "All your medical records and insurance details are encrypted and only accessible with your permission.",
      icon: <Shield size={48} className="text-brand-blue" />,
      color: "bg-blue-50",
      accent: "border-blue-200"
    },
    {
      title: "Emergency SOS",
      description: "In a crisis, one tap triggers an SOS that finds the nearest hospital and alerts emergency services.",
      icon: <Activity size={48} className="text-red-500" />,
      color: "bg-red-50",
      accent: "border-red-200"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Background Blobs for Glass Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-pink/15 blur-[120px] rounded-full"
        ></motion.div>
        <motion.div 
          animate={{
            x: [0, -40, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[-10%] w-[45%] h-[45%] bg-brand-blue/15 blur-[120px] rounded-full"
        ></motion.div>
        <motion.div 
          animate={{
            x: [0, 30, 0],
            y: [0, 40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[15%] w-[30%] h-[30%] bg-brand-purple/15 blur-[120px] rounded-full"
        ></motion.div>
      </div>

      {/* Top Navigation Header */}
      <header className="fixed top-0 left-0 right-0 glass-nav px-6 py-3.5 z-[100] !border-t-0 !border-b border-white/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 candy-gradient rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">M</div>
              <span className="text-xl font-bold italic text-brand-pink tracking-tight">MediTap</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-md border border-white/40 rounded-xl text-xs focus:border-brand-pink outline-none w-48 transition-all focus:bg-white/80 focus:w-64"
              />
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2 text-gray-400 hover:text-brand-pink transition-colors relative hover:bg-white/50 rounded-xl">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-brand-pink rounded-full border-2 border-white"></span>
              </button>
              
              <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>
              
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/60 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-brand-pink text-white flex items-center justify-center font-black text-xs group-hover:scale-105 transition-transform">
                  {user.name.charAt(0)}
                </div>
                <span className="text-xs font-black text-gray-700 hidden sm:block tracking-tight">{user.name.split(' ')[0]}</span>
              </button>

                <AnimatePresence>
                  {showDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowDropdown(false)}
                      ></div>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white/70 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/50 p-2 z-20"
                      >
                        <div className="p-4 border-b border-white/30 mb-2 text-center md:text-left">
                          <p className="font-black text-gray-800 truncate">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold truncate tracking-widest">{user.email}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <button 
                            onClick={() => { navigate('/onboarding'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <User size={18} className="text-brand-pink" />
                            Profile
                          </button>
                          <button 
                            onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Settings size={18} className="text-brand-blue" />
                            Settings
                          </button>
                          <button 
                            onClick={() => { setShowWorkingModal(true); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Info size={18} className="text-brand-purple" />
                            How it Works
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Lock size={18} className="text-green-500" />
                            Privacy & Policy
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <HelpCircle size={18} className="text-orange-500" />
                            Help & Support
                          </button>
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50/50 text-red-500 font-bold text-sm transition-colors"
                          >
                            <LogOut size={18} />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

      <div className={`pt-24 pb-32 relative z-10 ${noScroll ? 'h-screen flex flex-col pt-20 pb-20' : ''}`}>
        {children}
      </div>

      {/* Working Modal */}
      <AnimatePresence>
        {showWorkingModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md"
            onClick={() => setShowWorkingModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-2xl w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden border border-white/50"
            >
              <button 
                onClick={() => setShowWorkingModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors border border-white/50"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10">
                <motion.div 
                  key={workingStep}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-32 h-32 ${workingSteps[workingStep].color} border-4 ${workingSteps[workingStep].accent} rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-gray-100 flex-shrink-0`}
                >
                  {workingSteps[workingStep].icon}
                </motion.div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">{workingSteps[workingStep].title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                  {workingSteps[workingStep].description}
                </p>
              </div>

              <div className="flex justify-center gap-2 mb-10">
                {workingSteps.map((step, i) => (
                  <div 
                    key={step.title}
                    className={`h-2 rounded-full transition-all duration-300 ${workingStep === i ? 'w-8 bg-brand-pink' : 'w-2 bg-gray-200'}`}
                  ></div>
                ))}
              </div>

              <div className="flex gap-4">
                {workingStep > 0 && (
                  <button 
                    onClick={() => setWorkingStep(workingStep - 1)}
                    className="flex-1 py-4 bg-white/50 text-gray-600 font-black rounded-2xl hover:bg-white transition-colors border border-white/50"
                  >
                    Back
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (workingStep < workingSteps.length - 1) {
                      setWorkingStep(workingStep + 1);
                    } else {
                      setShowWorkingModal(false);
                      setWorkingStep(0);
                    }
                  }}
                  className="flex-1 py-4 candy-button-primary rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-pink-200"
                >
                  {workingStep === workingSteps.length - 1 ? 'Get Started' : 'Next'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav px-2 py-3 flex items-center justify-between z-[9999] md:px-12">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button 
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-brand-pink' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tighter transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="w-1 h-1 bg-brand-pink rounded-full mt-0.5"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
