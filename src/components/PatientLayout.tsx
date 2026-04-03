import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, FileText, Plus, User as UserIcon, Shield, Search, 
  Bell, LogOut, Settings, Info, Lock, HelpCircle, User, ChevronRight, X, Zap 
} from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface PatientLayoutProps {
  children: React.ReactNode;
  user: UserType;
}

export default function PatientLayout({ children, user }: PatientLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWorkingModal, setShowWorkingModal] = useState(false);
  const [workingStep, setWorkingStep] = useState(0);

  const navItems = [
    { icon: <Activity size={24} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={24} />, label: 'Records', path: '/records' },
    { icon: <Shield size={24} />, label: 'Claims', path: '/vault' },
    { icon: <Settings size={24} />, label: 'Settings', path: '/settings' },
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
      color: "bg-pink-50"
    },
    {
      title: "One-Tap Access",
      description: "Hospitals and emergency responders can access your life-saving data instantly via QR or NFC tap.",
      icon: <Zap size={48} className="text-brand-purple" />,
      color: "bg-purple-50"
    },
    {
      title: "Secure Records",
      description: "All your medical records and insurance details are encrypted and only accessible with your permission.",
      icon: <Shield size={48} className="text-brand-blue" />,
      color: "bg-blue-50"
    },
    {
      title: "Emergency SOS",
      description: "In a crisis, one tap triggers an SOS that finds the nearest hospital and alerts emergency services.",
      icon: <Activity size={48} className="text-red-500" />,
      color: "bg-red-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 candy-gradient rounded-lg flex items-center justify-center text-white font-bold">M</div>
              <span className="text-xl font-bold italic text-brand-pink">MediTap</span>
            </div>
            
            {/* Top Nav Items Removed as per request */}
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search records..." 
                className="pl-12 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm focus:border-brand-pink outline-none w-64 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-brand-pink transition-colors relative">
                <Bell size={22} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-pink rounded-full border-2 border-white"></span>
              </button>
              
              <div className="relative flex items-center gap-3 pl-4 border-l border-gray-100">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <img 
                    src={user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full bg-brand-light object-cover border-2 border-brand-pink/20"
                  />
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
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 z-20"
                      >
                        <div className="p-4 border-b border-gray-50 mb-2">
                          <p className="font-black text-gray-800 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 font-bold truncate">{user.email}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <button 
                            onClick={() => { navigate('/onboarding'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <User size={18} className="text-brand-pink" />
                            Profile
                          </button>
                          <button 
                            onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Settings size={18} className="text-brand-blue" />
                            Settings
                          </button>
                          <button 
                            onClick={() => { setShowWorkingModal(true); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Info size={18} className="text-brand-purple" />
                            How it Works
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <Lock size={18} className="text-green-500" />
                            Privacy & Policy
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors"
                          >
                            <HelpCircle size={18} className="text-orange-500" />
                            Help & Support
                          </button>
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 text-red-500 font-bold text-sm transition-colors"
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
        </div>
      </header>

      <div className="pb-24 lg:pb-0">
        {children}
      </div>

      {/* Working Modal */}
      <AnimatePresence>
        {showWorkingModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setShowWorkingModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowWorkingModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10">
                <div className={`w-24 h-24 ${workingSteps[workingStep].color} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}>
                  {workingSteps[workingStep].icon}
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">{workingSteps[workingStep].title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {workingSteps[workingStep].description}
                </p>
              </div>

              <div className="flex justify-center gap-2 mb-10">
                {workingSteps.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${workingStep === i ? 'w-8 bg-brand-pink' : 'w-2 bg-gray-200'}`}
                  ></div>
                ))}
              </div>

              <div className="flex gap-4">
                {workingStep > 0 && (
                  <button 
                    onClick={() => setWorkingStep(workingStep - 1)}
                    className="flex-1 py-4 bg-gray-50 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-colors"
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
                  className="flex-1 py-4 candy-button-primary rounded-2xl font-black flex items-center justify-center gap-2"
                >
                  {workingStep === workingSteps.length - 1 ? 'Get Started' : 'Next'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-around z-30 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <button 
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-brand-pink' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
        <button 
          onClick={() => navigate('/id-card')}
          className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/id-card' ? 'text-brand-pink' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] font-bold">My ID</span>
        </button>
      </nav>
    </div>
  );
}
