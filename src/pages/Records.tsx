import { motion } from 'motion/react';
import { FileText, Search, Filter, Plus, ArrowLeft, Download, Share2, MoreVertical, CheckCircle, Clock, Zap, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MedicalRecord, User } from '../types';
import PatientLayout from '../components/PatientLayout';

interface RecordsProps {
  user: User;
}

export default function Records({ user }: RecordsProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data as MedicalRecord[]);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record: MedicalRecord) => {
    alert(`Downloading ${record.title}...`);
    // Mock download
    const link = document.createElement('a');
    link.href = record.file_url || '#';
    link.download = `${record.title.replace(/\s+/g, '_')}.pdf`;
    link.click();
  };

  const filters = ['All', 'Checkup', 'Lab Report', 'Prescription', 'Discharge Note'];

  const filteredRecords = records.filter(record => {
    const matchesFilter = activeFilter === 'All' || record.record_type === activeFilter;
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         record.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group records by month
  const groupedRecords: { [key: string]: MedicalRecord[] } = {};
  filteredRecords.forEach(record => {
    const date = new Date(record.created_at);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groupedRecords[monthYear]) {
      groupedRecords[monthYear] = [];
    }
    groupedRecords[monthYear].push(record);
  });

  return (
    <PatientLayout user={user}>
      {/* Header */}
      <header className="glass-nav px-6 py-4 sticky top-0 z-20 !border-t-0 !border-b border-white/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-600 hover:text-brand-pink transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Medical Records</h1>
          <button className="w-10 h-10 rounded-full bg-brand-pink flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform active:scale-95">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="w-full pl-12 pr-6 py-3 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl focus:border-brand-pink outline-none transition-all placeholder:text-gray-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {filters.map((filter) => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition-all ${activeFilter === filter ? 'bg-brand-pink text-white shadow-lg shadow-pink-200' : 'bg-white/40 backdrop-blur-md text-gray-500 border border-white/50'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Records List */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-12 h-12 text-brand-pink animate-spin" />
            </div>
          ) : Object.keys(groupedRecords).length > 0 ? (
            Object.entries(groupedRecords).map(([monthYear, monthRecords]) => (
              <section key={monthYear}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{monthYear}</h3>
                <div className="space-y-4">
                  {monthRecords.map((record, i) => (
                    <motion.div 
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card p-6 flex items-center gap-6"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        record.record_type === 'Checkup' ? 'bg-blue-100 text-brand-blue' : 
                        record.record_type === 'Lab Report' ? 'bg-purple-100 text-brand-purple' : 
                        record.record_type === 'Prescription' ? 'bg-pink-100 text-brand-pink' :
                        'bg-orange-100 text-orange-500'
                      }`}>
                        <FileText size={28} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-lg truncate">{record.title}</h4>
                        <p className="text-sm text-gray-500 truncate">{record.hospital} • {new Date(record.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDownload(record)}
                          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-400 hover:text-brand-pink transition-all hover:scale-110 active:scale-95"
                        >
                          <Download size={18} />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-400 hover:text-brand-pink transition-all hover:scale-110 active:scale-95">
                          <Share2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No records found</h3>
              <p className="text-gray-400">Start by adding your first medical record.</p>
            </div>
          )}
        </div>

        {/* Health Tip */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-12 p-8 candy-gradient rounded-[2.5rem] text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={24} />
              <h4 className="text-xl font-bold">Health Tip of the Day</h4>
            </div>
            <p className="text-white/90 leading-relaxed mb-6">Regular checkups can help find problems before they start. They also can help find problems early, when your chances for treatment and cure are better.</p>
            <button className="px-6 py-3 bg-white text-brand-pink rounded-full font-bold text-sm shadow-lg">Learn More</button>
          </div>
        </motion.div>
      </main>
    </PatientLayout>
  );
}
