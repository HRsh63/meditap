import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Scan, Phone, User, ArrowRight, Shield, Zap, Activity, Clock, Loader2, AlertCircle, X } from 'lucide-react';
import { User as UserType } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import QRScanner from '../components/QRScanner';

interface HospitalPortalProps {
  user: UserType;
}

export default function HospitalPortal({ user }: HospitalPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  const fetchRecentLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select(`
          *,
          profiles:patient_id (name, id)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsSearching(true);
    setError(null);
    try {
      // Search by phone or ID
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${searchQuery},id.eq.${searchQuery}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Patient not found. Please check the phone number or ID.');
        }
        throw error;
      }

      if (data) {
        navigate(`/emergency/${data.id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 p-8 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 candy-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="text-2xl font-bold tracking-tight">MediTap</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          {[
            { icon: <Zap size={20} />, label: 'Rapid Lookup', active: true },
            { icon: <User size={20} />, label: 'Patient Directory', active: false },
            { icon: <Activity size={20} />, label: 'Emergency Queue', active: false },
            { icon: <Clock size={20} />, label: 'Access Logs', active: false },
            { icon: <Shield size={20} />, label: 'Security Center', active: false },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${item.active ? 'bg-brand-pink text-white shadow-lg shadow-pink-200' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
          <img src={user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-10 h-10 rounded-xl bg-brand-light object-cover" />
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">Hospital Admin</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold mb-2">Patient Rapid Lookup</h1>
            <p className="text-gray-500">Scan or search to access patient medical identity instantly.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-100 text-green-600 rounded-full text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              System Online
            </div>
          </div>
        </header>

        {/* Search & Scan Area */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 candy-card p-10 bg-white flex flex-col items-center justify-center text-center"
          >
            <div className="w-24 h-24 bg-brand-light text-brand-pink rounded-3xl flex items-center justify-center mb-8">
              <Scan size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Scan Patient ID</h2>
            <p className="text-gray-500 mb-8 max-w-sm">Place the patient's MediTap card or phone near the NFC reader or scan the QR code.</p>
            <div className="flex gap-4">
              <button className="candy-button-primary px-8">Activate NFC</button>
              <button 
                onClick={() => setShowScanner(true)}
                className="candy-button-outline px-8"
              >
                Open Scanner
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="candy-card p-10 bg-white"
          >
            <div className="w-16 h-16 bg-purple-100 text-brand-purple rounded-2xl flex items-center justify-center mb-6">
              <Phone size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Manual Search</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Phone or MediTap ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. +15550000000" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <button 
                type="submit" 
                disabled={isSearching}
                className="w-full candy-button-secondary flex items-center justify-center gap-2"
              >
                {isSearching ? <Loader2 size={20} className="animate-spin" /> : 'Search Patient'}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Recent Access Log */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Access Log</h2>
            <button onClick={fetchRecentLogs} className="text-brand-pink font-bold flex items-center gap-1">
              Refresh <Clock size={16} />
            </button>
          </div>
          <div className="candy-card overflow-hidden bg-white">
            {loadingLogs ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
              </div>
            ) : recentLogs.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Access Type</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center text-brand-pink font-bold text-xs">
                            {log.profiles?.name?.[0] || 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{log.profiles?.name || 'Unknown Patient'}</p>
                            <p className="text-xs text-gray-500">{log.patient_id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{log.access_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">{log.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/emergency/${log.patient_id}`)} className="text-brand-pink font-bold text-sm hover:underline">View File</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500 font-medium">
                No recent access logs found.
              </div>
            )}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showScanner && (
          <QRScanner 
            onClose={() => setShowScanner(false)} 
            onScan={(text) => {
              console.log("Scanned Patient ID:", text);
              // In a real app, we'd validate the ID format
              if (text.length > 5) {
                navigate(`/emergency/${text}`);
              }
            }}
            title="Scan Patient ID"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
