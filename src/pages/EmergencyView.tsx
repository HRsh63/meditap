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
    <div className="min-h-screen bg-white pb-24">
      {/* Emergency Header */}
      <header className="bg-red-600 text-white px-6 py-8 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full font-bold text-sm">
            <Zap size={16} />
            EMERGENCY ACCESS ACTIVE
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Patient Profile */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          <motion.img 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={patient.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}`} 
            alt={patient.name} 
            className="w-32 h-32 rounded-3xl bg-brand-light border-4 border-red-50 shadow-xl object-cover"
          />
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-bold">{patient.name}</h1>
              <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider">Critical View</span>
            </div>
            <p className="text-gray-500 text-lg mb-6">MediTap ID: {id?.slice(0, 8).toUpperCase()} • Age: {medicalData?.age || 'N/A'} • {patient.role}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button className="candy-button-primary bg-red-600 shadow-red-200 flex items-center gap-2">
                <Download size={18} /> Download Full PDF
              </button>
              <button className="candy-button-outline border-red-600 text-red-600 flex items-center gap-2">
                <Share2 size={18} /> Share Access
              </button>
            </div>
          </div>
        </div>

        {/* Critical Information Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-red-50 border-2 border-red-100 rounded-3xl mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 opacity-5 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="text-red-600" size={28} />
            <h2 className="text-2xl font-bold text-red-600 uppercase tracking-tight">Critical Information</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {medicalData?.allergies && medicalData.allergies.length > 0 ? (
                  medicalData.allergies.map((item, i) => (
                    <span key={i} className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl font-bold text-sm shadow-sm">{item}</span>
                  ))
                ) : (
                  <span className="text-gray-500 italic">No known allergies</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Current Medications</h3>
              <div className="flex flex-wrap gap-2">
                {medicalData?.medications && medicalData.medications.length > 0 ? (
                  medicalData.medications.map((item, i) => (
                    <span key={i} className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl font-bold text-sm shadow-sm">{item}</span>
                  ))
                ) : (
                  <span className="text-gray-500 italic">No current medications</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vitals & Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: <Droplet size={24} />, label: 'Blood Group', value: medicalData?.blood_group || 'N/A', color: 'text-red-600 bg-red-50' },
            { icon: <Heart size={24} />, label: 'Heart Rate', value: vitals.find(v => v.type === 'Heart Rate')?.value ? `${vitals.find(v => v.type === 'Heart Rate').value} BPM` : 'N/A', color: 'text-pink-600 bg-pink-50' },
            { icon: <Activity size={24} />, label: 'Blood Pressure', value: vitals.find(v => v.type === 'Blood Pressure')?.value ? `${vitals.find(v => v.type === 'Blood Pressure').value} mmHg` : 'N/A', color: 'text-purple-600 bg-purple-50' },
            { icon: <Thermometer size={24} />, label: 'Temperature', value: vitals.find(v => v.type === 'Temperature')?.value ? `${vitals.find(v => v.type === 'Temperature').value} °F` : 'N/A', color: 'text-blue-600 bg-blue-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="candy-card p-6 flex flex-col items-center text-center gap-3 bg-white"
            >
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Emergency Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Emergency Contact</h2>
          <div className="candy-card p-8 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-light text-brand-pink rounded-2xl flex items-center justify-center font-bold text-2xl">
                {medicalData?.emergency_contact_name?.[0] || '?'}
              </div>
              <div>
                <h4 className="text-xl font-bold">{medicalData?.emergency_contact_name || 'Not Provided'}</h4>
                <p className="text-gray-500">Primary Contact</p>
              </div>
            </div>
            {medicalData?.emergency_contact_phone && (
              <a href={`tel:${medicalData.emergency_contact_phone}`} className="candy-button-primary bg-green-600 shadow-green-200 flex items-center gap-2 px-8">
                <Phone size={20} /> Call Now
              </a>
            )}
          </div>
        </section>

        {/* Medical History Summary */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Recent Medical History</h2>
          <div className="space-y-4">
            {records.length > 0 ? (
              records.slice(0, 5).map((item, i) => (
                <div key={i} className="candy-card p-6 bg-white flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.hospital} • {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">{item.record_type}</span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400 font-bold">
                No medical history available.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
