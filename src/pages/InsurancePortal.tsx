import { motion } from 'motion/react';
import { Shield, Zap, Users, FileText, ArrowRight, Activity, Clock, Upload, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InsurancePortalProps {
  user: UserType;
}

export default function InsurancePortal({ user }: InsurancePortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    patients: '0',
    records: '0',
    pending: '0'
  });
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // Fetch counts
      const { count: patientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      const { count: recordCount } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true });

      setStats({
        patients: (patientCount || 0).toLocaleString(),
        records: (recordCount || 0).toLocaleString(),
        pending: '12' // Mock pending for now
      });

      // Fetch recent records
      const { data: records, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          profiles:user_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentUploads(records || []);

    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
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
            { icon: <Shield size={20} />, label: 'Command Center', active: true },
            { icon: <Users size={20} />, label: 'Managed Patients', active: false },
            { icon: <FileText size={20} />, label: 'Digital Records', active: false },
            { icon: <Activity size={20} />, label: 'Pending Claims', active: false },
            { icon: <Clock size={20} />, label: 'Audit Logs', active: false },
          ].map((item) => (
            <button 
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${item.active ? 'bg-brand-blue text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-sm shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">Insurance Admin</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold mb-2">Insurance Command Center</h1>
            <p className="text-gray-500">Automated claim verification and direct digital record integration.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search policy or patient..." 
                className="pl-12 pr-6 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-brand-blue outline-none transition-all w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: <Users size={32} />, label: 'Managed Patients', value: stats.patients, color: 'bg-blue-100 text-brand-blue', change: '+12% from last month' },
            { icon: <FileText size={32} />, label: 'Digital Records', value: stats.records, color: 'bg-purple-100 text-brand-purple', change: '+8% from last month' },
            { icon: <Zap size={32} />, label: 'Pending Claims', value: stats.pending, color: 'bg-pink-100 text-brand-pink', change: '-5% from last month' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="candy-card p-8 bg-white"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full">{stat.change}</span>
              </div>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-4xl font-bold">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Uploads Table */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Uploads</h2>
              <button onClick={fetchPortalData} className="text-brand-blue font-bold flex items-center gap-1">
                Refresh <Clock size={16} />
              </button>
            </div>
            <div className="candy-card overflow-hidden bg-white">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                </div>
              ) : recentUploads.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Record Type</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentUploads.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm">{row.profiles?.name || 'Unknown'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{row.record_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit bg-green-100 text-green-600">
                            <CheckCircle size={12} />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-500 font-medium">
                  No recent uploads found.
                </div>
              )}
            </div>
          </section>

          {/* Quick Upload Area */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Quick Upload</h2>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="candy-card p-8 bg-white border-dashed border-4 border-gray-100 flex flex-col items-center justify-center text-center h-[400px]"
            >
              <div className="w-20 h-20 bg-blue-50 text-brand-blue rounded-3xl flex items-center justify-center mb-6">
                <Upload size={40} />
              </div>
              <h3 className="text-xl font-bold mb-2">Upload Records</h3>
              <p className="text-gray-500 mb-8">Drag and drop medical records or insurance documents here.</p>
              <button className="candy-button-primary bg-brand-blue shadow-blue-200 w-full">Select Files</button>
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  );
}
