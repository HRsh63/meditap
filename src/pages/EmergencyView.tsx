import { motion } from 'motion/react';
import { Shield, Zap, Heart, Activity, Phone, ArrowLeft, Download, Share2, AlertTriangle, Thermometer, Droplet, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PatientData, User } from '../types';

export default function EmergencyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<User | null>(null);
  const [medicalData, setMedicalData] = useState<PatientData | null>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmergencyData() {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setPatient(profile as User);

        // Fetch patient data
        const { data: pData, error: pDataError } = await supabase
          .from('patient_data')
          .select('*')
          .eq('user_id', id)
          .single();

        if (pDataError && pDataError.code !== 'PGRST116') throw pDataError;
        setMedicalData(pData as PatientData);

        // Fetch latest vitals
        const { data: vitalsData } = await supabase
          .from('vitals')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        
        if (vitalsData) setVitals(vitalsData);

        // Fetch medical records
        const { data: recordsData } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        
        if (recordsData) setRecords(recordsData);

        // Log the access
        await supabase.from('access_logs').insert({
          patient_id: id,
          access_type: 'Emergency View',
          status: 'Authorized',
          action: 'Emergency Record Access'
        });

      } catch (err: any) {
        console.error('Error fetching emergency data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEmergencyData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Patient Not Found</h1>
        <p className="text-gray-500 mb-8">The MediTap ID provided does not match any record in our system.</p>
        <button onClick={() => navigate(-1)} className="candy-button-primary bg-red-600">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF2F8] pb-24 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-brand-pink/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-blue/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-brand-purple/20 rounded-full blur-[120px]"
        />
      </div>

      {/* Emergency Header */}
      <header className="glass-nav text-white px-6 py-6 sticky top-0 z-50 !border-t-0 !border-b border-white/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-600 hover:bg-red-500/30 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200">
            <Zap size={14} className="animate-pulse" />
            EMERGENCY ACCESS ACTIVE
          </div>
          <div className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-600">
            <Shield size={20} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        {/* Patient Profile */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-32 h-32 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl flex items-center justify-center text-red-600 font-black text-5xl"
          >
            {patient.name.charAt(0)}
          </motion.div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{patient.name}</h1>
              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-100">Critical View</span>
            </div>
            <p className="text-gray-500 text-lg font-medium tracking-tight mb-6">MediTap ID: {id?.slice(0, 8).toUpperCase()} • Age: {medicalData?.age || 'N/A'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-red-100">
                <Download size={18} /> Download PDF
              </button>
              <button className="bg-white/40 backdrop-blur-md border border-white/50 text-gray-700 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-white/60 transition-all">
                <Share2 size={18} /> Share Access
              </button>
            </div>
          </div>
        </div>

        {/* Critical Information Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 glass-card border-red-500/20 mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 opacity-5 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <AlertTriangle className="text-red-500" size={28} />
            <h2 className="text-2xl font-black text-red-600 tracking-tight uppercase">Critical Information</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <div>
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {medicalData?.allergies && medicalData.allergies.length > 0 ? (
                  medicalData.allergies.map((item, idx) => (
                    <span key={`${item}-${idx}`} className="px-4 py-2 bg-white/60 backdrop-blur-md text-red-600 border border-white/50 rounded-xl font-black text-xs shadow-sm">{item}</span>
                  ))
                ) : (
                  <span className="text-gray-400 font-bold italic text-sm">No known allergies</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Current Medications</h3>
              <div className="flex flex-wrap gap-2">
                {medicalData?.medications && medicalData.medications.length > 0 ? (
                  medicalData.medications.map((item, idx) => (
                    <span key={`${item}-${idx}`} className="px-4 py-2 bg-white/60 backdrop-blur-md text-red-600 border border-white/50 rounded-xl font-black text-xs shadow-sm">{item}</span>
                  ))
                ) : (
                  <span className="text-gray-400 font-bold italic text-sm">No current medications</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vitals & Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: <Droplet size={24} />, label: 'Blood Group', value: medicalData?.blood_group || 'N/A', color: 'text-red-500 bg-red-500/10' },
            { icon: <Heart size={24} />, label: 'Heart Rate', value: vitals.find(v => v.type === 'Heart Rate')?.value ? `${vitals.find(v => v.type === 'Heart Rate').value} BPM` : 'N/A', color: 'text-pink-500 bg-pink-500/10' },
            { icon: <Activity size={24} />, label: 'Blood Pressure', value: vitals.find(v => v.type === 'Blood Pressure')?.value ? `${vitals.find(v => v.type === 'Blood Pressure').value} mmHg` : 'N/A', color: 'text-purple-500 bg-purple-500/10' },
            { icon: <Thermometer size={24} />, label: 'Temperature', value: vitals.find(v => v.type === 'Temperature')?.value ? `${vitals.find(v => v.type === 'Temperature').value} °F` : 'N/A', color: 'text-blue-500 bg-blue-500/10' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card p-6 flex flex-col items-center text-center gap-3"
            >
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center transition-transform hover:scale-110`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl font-black text-gray-800 tracking-tight">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Emergency Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-black tracking-tight mb-6">Emergency Contact</h2>
          <div className="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-[1.5rem] flex items-center justify-center font-black text-2xl">
                {medicalData?.emergency_contact_name?.[0] || '?'}
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-800">{medicalData?.emergency_contact_name || 'Not Provided'}</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Primary Emergency Contact</p>
              </div>
            </div>
            {medicalData?.emergency_contact_phone && (
              <a href={`tel:${medicalData.emergency_contact_phone}`} className="w-full md:w-auto px-10 py-5 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-green-100">
                <Phone size={20} /> Call Now
              </a>
            )}
          </div>
        </section>

        {/* Medical History Summary */}
        <section>
          <h2 className="text-2xl font-black tracking-tight mb-6">Recent Medical History</h2>
          <div className="space-y-4">
            {records.length > 0 ? (
              records.slice(0, 5).map((item) => (
                <div key={item.id} className="glass-card p-6 flex items-center justify-between group hover:border-brand-pink/20 transition-all">
                  <div>
                    <h4 className="font-black text-lg text-gray-800 tracking-tight">{item.title}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{item.hospital} • {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="px-4 py-1.5 bg-white/40 backdrop-blur-md text-gray-600 border border-white/50 rounded-full text-[10px] font-black uppercase tracking-widest">{item.record_type}</span>
                </div>
              ))
            ) : (
              <div className="p-16 text-center glass-card border-dashed text-gray-400 font-bold">
                No medical history available.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
