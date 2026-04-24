import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Zap, FileText, ArrowRight, Activity, Clock, Plus, 
  CheckCircle, AlertCircle, Search, Loader2, CreditCard, Lock, 
  Info, X, ChevronRight, DollarSign, Calendar
} from 'lucide-react';
import { User } from '../types';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';

interface VaultProps {
  user: User;
}

interface Claim {
  id: string;
  title: string;
  amount: string;
  status: string;
  claim_date: string;
}

export default function Vault({ user }: VaultProps) {
  const [loading, setLoading] = useState(true);
  const [insuranceData, setInsuranceData] = useState<any>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddClaim, setShowAddClaim] = useState(false);
  
  const [newClaim, setNewClaim] = useState({ title: '', amount: '' });

  useEffect(() => {
    fetchVaultData();
  }, [user.id]);

  const fetchVaultData = async () => {
    setLoading(true);
    try {
      const { data: patientData } = await supabase
        .from('patient_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientData) {
        setInsuranceData(patientData);
      }

      const { data: claimsData } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', user.id)
        .order('claim_date', { ascending: false });
      
      if (claimsData) {
        setClaims(claimsData);
      }
    } catch (err) {
      console.error('Error fetching vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('claims').insert({
        user_id: user.id,
        title: newClaim.title,
        amount: `$${newClaim.amount}`,
        status: 'Processing'
      });
      if (error) throw error;
      setShowAddClaim(false);
      setNewClaim({ title: '', amount: '' });
      fetchVaultData();
    } catch (err) {
      console.error('Error adding claim:', err);
    }
  };

  return (
    <PatientLayout user={user}>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-light text-brand-pink rounded-2xl flex items-center justify-center">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Insurance Vault</h1>
              <p className="text-gray-500 font-medium">Your secure digital policy wallet.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInfo(true)}
            className="w-12 h-12 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-pink hover:border-brand-pink transition-all"
          >
            <Info size={24} />
          </button>
        </div>

        {/* Insurance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="candy-card p-10 bg-brand-blue text-white mb-12 relative overflow-hidden shadow-2xl shadow-blue-100 group"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full -mr-40 -mt-40 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <span className="font-black tracking-tight text-2xl">MediShield Premium</span>
              </div>
              <div className="px-4 py-2 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm">Active Policy</div>
            </div>

            <div className="mb-16">
              <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-2">Policy Holder</p>
              <h3 className="text-4xl font-black tracking-tight">{user.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Policy Number</p>
                <p className="text-xl font-black">MSP-{user.id.slice(0, 4).toUpperCase()}-2026</p>
              </div>
              <div>
                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Group ID</p>
                <p className="text-xl font-black">G-8821-B</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Coverage Summary */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight">Coverage Summary</h2>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Network</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Primary Care', coverage: '100%', icon: <Activity className="text-blue-500" />, desc: 'Full coverage for regular visits' },
              { label: 'Specialist', coverage: '80%', icon: <Zap className="text-purple-500" />, desc: 'Co-pay for specialized care' },
              { label: 'Emergency Care', coverage: '90%', icon: <AlertCircle className="text-red-500" />, desc: 'Priority emergency admission' },
              { label: 'Pharmacy', coverage: '70%', icon: <FileText className="text-pink-500" />, desc: 'Prescription drug discounts' },
            ].map((item, i) => (
              <motion.div 
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 flex items-center justify-between group hover:border-brand-pink/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/40 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <span className="block font-black text-gray-800 text-lg">{item.label}</span>
                    <span className="text-xs text-gray-400 font-bold">{item.desc}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-brand-pink">{item.coverage}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Claims */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight">Recent Claims</h2>
            <button 
              onClick={() => setShowAddClaim(true)}
              className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/50 text-brand-pink rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
            >
              <Plus size={24} />
            </button>
          </div>
          
          <div className="space-y-4">
            {claims.length > 0 ? (
              claims.map((claim) => (
                <motion.div 
                  key={claim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-8 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-brand-pink transition-colors">
                      <CreditCard size={28} />
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-gray-800 tracking-tight">{claim.title}</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{new Date(claim.claim_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-gray-800">{claim.amount}</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${claim.status === 'Approved' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                      {claim.status}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-16 text-center text-gray-400 font-bold glass-card border-dashed">
                No claims found. Click + to file a new claim.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">About Your Vault</h3>
                <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-brand-light text-brand-pink rounded-2xl flex items-center justify-center shrink-0">
                    <Shield size={28} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg mb-2">Insurance Vault</h4>
                    <p className="text-gray-500 leading-relaxed">
                      A secure digital storage for all your health insurance policies, coverage details, and claim history. It allows instant verification by hospitals during emergencies.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center shrink-0">
                    <Zap size={28} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg mb-2">MediShield Premium</h4>
                    <p className="text-gray-500 leading-relaxed">
                      Our high-tier insurance plan that provides comprehensive coverage across primary, specialist, and emergency care. It includes priority hospital admission and direct billing.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full mt-10 candy-button-primary py-5 text-lg font-black"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}

        {/* Add Claim Modal */}
        {showAddClaim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">File New Claim</h3>
                <button onClick={() => setShowAddClaim(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddClaim} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Service Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dental Cleaning"
                    required
                    value={newClaim.title}
                    onChange={(e) => setNewClaim({...newClaim, title: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Amount (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      required
                      value={newClaim.amount}
                      onChange={(e) => setNewClaim({...newClaim, amount: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full candy-button-primary py-5 text-lg font-black">
                  Submit Claim
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PatientLayout>
  );
}
