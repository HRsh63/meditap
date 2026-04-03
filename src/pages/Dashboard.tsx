import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, FileText, Shield, Edit3, Bell, Search, Plus, 
  ArrowRight, Activity, Calendar, LogOut, Zap, Heart, Droplet, 
  ChevronRight, AlertCircle, Clock, X, Check, Save, Trash2, Loader2
} from 'lucide-react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getNearestHospital, getTop3Hospitals, searchLocalHospitals, Hospital } from '../services/hospitalService';
import { EMERGENCY_HOSPITALS } from '../constants/emergencyHospitals';
import PatientLayout from '../components/PatientLayout';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

interface DashboardProps {
  user: User;
}

interface VitalRecord {
  id: string;
  type: string;
  value: string;
  unit: string;
  created_at: string;
}

interface Appointment {
  id: string;
  title: string;
  doctor: string;
  location: string;
  appointment_time: string;
  status: string;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isFindingHospital, setIsFindingHospital] = useState(false);
  const [topHospitals, setTopHospitals] = useState<Hospital[]>([]);
  const [nearestHospital, setNearestHospital] = useState<{name: string, phone: string} | null>(null);
  
  // Form States
  const [newVital, setNewVital] = useState({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
  const [isEditingVital, setIsEditingVital] = useState(false);
  const [newAppt, setNewAppt] = useState({ title: '', doctor: '', location: '', time: '' });

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch access logs
      const { data: logs } = await supabase
        .from('access_logs')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (logs) setAccessLogs(logs);

      // 2. Fetch vitals
      const { data: vitalsData } = await supabase
        .from('vitals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (vitalsData) setVitals(vitalsData);

      // 3. Fetch appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_time', { ascending: true });
      
      if (appts) setAppointments(appts);

      // 4. Calculate profile completion
      const { data: patientData } = await supabase
        .from('patient_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientData) {
        let filledFields = 0;
        const fields = ['blood_group', 'allergies', 'medications', 'emergency_contact_name', 'emergency_contact_phone'];
        const missing = [];
        if (!patientData.blood_group) missing.push('Blood Group');
        if (!patientData.allergies || patientData.allergies.length === 0) missing.push('Allergies');
        if (!patientData.medications || patientData.medications.length === 0) missing.push('Medications');
        if (!patientData.emergency_contact_name) missing.push('Emergency Contact');
        
        fields.forEach(field => {
          if (patientData[field] && (Array.isArray(patientData[field]) ? patientData[field].length > 0 : true)) {
            filledFields++;
          }
        });
        setProfileCompletion(Math.round((filledFields / fields.length) * 100));
        setMissingFields(missing);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vitalData = {
        type: newVital.type,
        value: newVital.value,
        unit: newVital.unit,
        created_at: new Date(newVital.date).toISOString()
      };

      if (isEditingVital && newVital.id) {
        const { error } = await supabase.from('vitals').update(vitalData).eq('id', newVital.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vitals').insert({
          user_id: user.id,
          ...vitalData
        });
        if (error) throw error;
      }
      setShowVitalModal(false);
      setIsEditingVital(false);
      setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
      fetchDashboardData();
    } catch (err) {
      console.error('Error adding/updating vital:', err);
    }
  };

  const deleteVital = async (id: string) => {
    try {
      await supabase.from('vitals').delete().eq('id', id);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting vital:', err);
    }
  };

  const findNearestHospital = async () => {
    setIsFindingHospital(true);
    setTopHospitals([]);
    
    // Use a slightly more generous timeout for the search process
    const SEARCH_TIMEOUT = 12000; // 12 seconds
    let resultsFound = false;
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), SEARCH_TIMEOUT)
    );

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported");
      }

      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        // Try to get location quickly
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 6000, // 6 seconds for GPS
          enableHighAccuracy: true,
          maximumAge: 60000 // Use cached location if less than 1 min old
        });
      });

      // Race the entire search process against the timeout
      await Promise.race([
        (async () => {
          const position = await getPosition();
          const { latitude, longitude } = position.coords;

          // Start both searches
          const localResults = searchLocalHospitals(latitude, longitude);
          
          // If we have local results, show them immediately to reduce perceived latency
          if (localResults.length > 0) {
            setTopHospitals(localResults);
            resultsFound = true;
          }

          // Then wait for online results (or timeout)
          const onlineResults = await getTop3Hospitals(latitude, longitude).catch(() => []);
          
          if (onlineResults.length > 0) {
            // Merge results, prioritizing online ones
            const combined = [...onlineResults, ...localResults];
            const unique = combined.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
            setTopHospitals(unique.slice(0, 3));
            resultsFound = true;
          } else if (localResults.length === 0) {
             throw new Error("NO_HOSPITAL");
          }
        })(),
        timeoutPromise
      ]);

    } catch (err: any) {
      console.error("Error or timeout finding hospital:", err);
      
      // If we have NO hospitals at all after timeout/error, redirect to 112
      if (!resultsFound) {
        window.location.href = `tel:112`;
        
        // Show fallbacks in UI
        const fallbacks = EMERGENCY_HOSPITALS.slice(0, 3).map(h => ({
          name: h.name,
          phone: h.phone,
          address: `${h.city}, ${h.state}`,
          distance: 'Fallback'
        }));
        setTopHospitals(fallbacks);
      }
    } finally {
      setIsFindingHospital(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('appointments').insert({
        user_id: user.id,
        title: newAppt.title,
        doctor: newAppt.doctor,
        location: newAppt.location,
        appointment_time: newAppt.time
      });
      if (error) throw error;
      setShowAppointmentModal(false);
      setNewAppt({ title: '', doctor: '', location: '', time: '' });
      fetchDashboardData();
    } catch (err) {
      console.error('Error adding appointment:', err);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await supabase.from('appointments').delete().eq('id', id);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  // Prepare chart data
  const bpData = vitals
    .filter(v => v.type === 'Blood Pressure')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(v => ({
      time: new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: parseInt(v.value.split('/')[0]) || 0
    }));

  const weightData = vitals
    .filter(v => v.type === 'Weight')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(v => ({
      time: new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: parseFloat(v.value) || 0
    }));

  return (
    <PatientLayout user={user}>
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Greeting & SOS */}
          <div className="flex-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8"
            >
              <h1 className="text-5xl font-black mb-3 tracking-tight">
                Hello, {user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-500 text-lg font-medium">Your health data is safe and updated.</p>
            </motion.div>

            <div className="flex flex-wrap gap-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSOSModal(true)}
                className="bg-red-500 text-white px-10 py-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl shadow-red-100 group"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:animate-pulse">
                  <Zap size={28} />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-widest opacity-80">Emergency</span>
                  <span className="text-2xl font-black uppercase tracking-tighter">SOS</span>
                </div>
              </motion.button>

              {/* Profile Completion */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="candy-card p-6 bg-white flex-1 min-w-[300px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Profile Completion</h3>
                  <span className="text-brand-pink font-black text-xl">{profileCompletion}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full candy-gradient"
                  ></motion.div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                  <AlertCircle size={14} className="text-brand-pink" />
                  {profileCompletion < 100 
                    ? `Add your ${missingFields[0] || 'secondary insurance'} to reach 100%.` 
                    : 'Your profile is fully complete!'}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'My ID', icon: <UserIcon size={32} />, color: 'bg-brand-pink', path: '/id-card' },
            { label: 'Records', icon: <FileText size={32} />, color: 'bg-brand-purple', path: '/records' },
            { label: 'Insurance', icon: <Shield size={32} />, color: 'bg-brand-blue', path: '/vault' },
            { label: 'Edit Profile', icon: <Edit3 size={32} />, color: 'bg-white', textColor: 'text-gray-800', iconColor: 'text-brand-pink', border: 'border-2 border-gray-100', path: '/onboarding' },
          ].map((card, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(card.path)}
              className={`relative h-48 rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden shadow-xl transition-all hover:shadow-2xl ${card.color} ${card.textColor || 'text-white'} ${card.border || ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconColor || 'text-white'} bg-white/20`}>
                {card.icon}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black">{card.label}</span>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                  <ChevronRight size={24} />
                </div>
              </div>
              {/* Decorative circle */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            </motion.button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Blood Pressure Trends */}
          <section className="candy-card p-8 bg-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-50 text-brand-pink rounded-2xl flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <h2 className="text-2xl font-black">Blood Pressure</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:text-brand-pink transition-colors"
                >
                  <Calendar size={20} />
                </button>
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-brand-light text-brand-pink rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                  <h4 className="text-3xl font-black text-brand-purple">
                    {vitals.findLast(v => v.type === 'Blood Pressure')?.value || '118/76'} 
                    <span className="text-sm font-bold text-gray-400 ml-2">mmHg</span>
                  </h4>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bpData}>
                    <defs>
                      <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }}
                      dy={10}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorBp)" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Weight Timeline */}
          <section className="candy-card p-8 bg-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <h2 className="text-2xl font-black">Weight</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Weight', value: '', unit: 'lbs', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:text-brand-blue transition-colors"
                >
                  <Calendar size={20} />
                </button>
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Weight', value: '', unit: 'lbs', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-brand-light text-brand-blue rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Current Weight</p>
                  <h4 className="text-3xl font-black text-brand-blue">
                    {vitals.findLast(v => v.type === 'Weight')?.value || 'N/A'} 
                    <span className="text-sm font-bold text-gray-400 ml-2">lbs</span>
                  </h4>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }}
                      dy={10}
                    />
                    <Area type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Access */}
          <section className="candy-card p-8 bg-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-light text-brand-pink rounded-2xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <h2 className="text-2xl font-black">Recent Hospital Access</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:text-brand-pink transition-colors">
                  <Plus size={20} />
                </button>
                <button className="text-xs font-black text-brand-pink uppercase tracking-widest hover:underline">View All</button>
              </div>
            </div>

              <div className="space-y-4">
                {accessLogs.length > 0 ? (
                  accessLogs.map((log, i) => (
                    <div key={i} className="p-6 border-2 border-gray-50 rounded-[2rem] flex items-center justify-between group hover:border-brand-pink/20 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-light rounded-2xl flex flex-col items-center justify-center text-brand-pink">
                          <span className="text-[10px] font-black uppercase">{new Date(log.created_at).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-2xl font-black leading-none">{new Date(log.created_at).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-black">{log.accessed_by_name || 'St. Jude Medical Center'}</h4>
                          <p className="text-sm text-gray-400 font-medium">{log.access_type} • {log.action || 'Emergency Room'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Access Time</p>
                        <p className="font-black text-gray-700">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-[2rem]">
                    No recent access logs.
                  </div>
                )}
              </div>
            </section>

            {/* Upcoming Appointments / Reminders */}
            <section className="candy-card p-8 bg-white h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 text-brand-purple rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <h2 className="text-2xl font-black">Upcoming Reminders</h2>
                </div>
                <button 
                  onClick={() => setShowAppointmentModal(true)}
                  className="w-10 h-10 bg-brand-light text-brand-pink rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {appointments.length > 0 ? (
                  appointments.map((appt, i) => (
                    <div key={i} className="p-6 bg-brand-purple/5 border-2 border-brand-purple/10 rounded-[2rem] relative group">
                      <button 
                        onClick={() => deleteAppointment(appt.id)}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-purple shadow-sm">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800">{appt.title}</h4>
                          <p className="text-xs text-gray-500 font-bold">{appt.doctor}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-brand-purple uppercase tracking-widest">
                          {new Date(appt.appointment_time).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-black text-gray-400">
                          {new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-[2rem]">
                    No upcoming reminders. Click + to add one.
                  </div>
                )}
              </div>
            </section>
          </div>
      </main>

      {/* Floating QR FAB Removed as per request */}

      {/* Vitals Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setShowSOSModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[3rem] p-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Zap size={24} />
                </div>
                <h3 className="text-xl font-black mb-0.5">Emergency SOS</h3>
                <p className="text-gray-500 text-xs font-medium">Immediate assistance is one tap away.</p>
              </div>

              <div className="space-y-3">
                {/* Option 1: National Emergency */}
                <motion.a 
                  href="tel:112"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 bg-red-50 rounded-[1.5rem] border-2 border-red-100 group transition-all hover:bg-red-500 hover:text-white"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm group-hover:bg-white/20 group-hover:text-white">
                    <Zap size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-black leading-tight">Emergency 112</h4>
                    <p className="text-[10px] font-bold opacity-70">National Helpline (India)</p>
                  </div>
                </motion.a>

                {/* Option 2: Nearest Hospital */}
                <div className="space-y-3">
                  {!isFindingHospital && topHospitals.length === 0 && (
                    <motion.button 
                      onClick={findNearestHospital}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-[1.5rem] border-2 border-blue-100 group transition-all hover:bg-blue-500 hover:text-white"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm group-hover:bg-white/20 group-hover:text-white">
                        <Activity size={24} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-lg font-black leading-tight">Find Nearest Hospitals</h4>
                        <p className="text-[10px] font-bold opacity-70">Parallel online & local search</p>
                      </div>
                    </motion.button>
                  )}

                  {isFindingHospital && (
                    <div className="p-10 text-center bg-blue-50 rounded-[2rem] border-2 border-blue-100">
                      <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="font-black text-blue-500 uppercase tracking-widest text-xs">Searching Hospitals...</p>
                    </div>
                  )}

                  {topHospitals.length > 0 && !isFindingHospital && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Top 3 Nearest Hospitals</p>
                      {topHospitals.map((h, i) => (
                        <motion.button 
                          key={i}
                          onClick={() => window.location.href = `tel:${h.phone}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-[1.5rem] border-2 border-blue-100 hover:bg-blue-500 hover:text-white transition-all group"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-white/20 group-hover:text-white">
                            <Activity size={20} />
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-sm font-black leading-tight">{h.name}</h4>
                            <p className="text-[10px] font-bold opacity-70 truncate max-w-[200px]">{h.address}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-blue-500 group-hover:text-white block">{h.distance}</span>
                            <span className="text-[8px] font-bold opacity-50 block">{h.phone}</span>
                          </div>
                        </motion.button>
                      ))}
                      <button 
                        onClick={findNearestHospital}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline ml-4"
                      >
                        Refresh Search
                      </button>
                    </div>
                  )}
                </div>

                {/* Option 3: Ambulance Network */}
                <motion.a 
                  href="tel:108"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 bg-purple-50 rounded-[1.5rem] border-2 border-purple-100 group transition-all hover:bg-purple-500 hover:text-white"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-500 shadow-sm group-hover:bg-white/20 group-hover:text-white">
                    <Droplet size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-black leading-tight">Ambulance 108</h4>
                    <p className="text-[10px] font-bold opacity-70">GVK EMRI Network</p>
                  </div>
                </motion.a>
              </div>

              <button 
                onClick={() => setShowSOSModal(false)}
                className="w-full mt-4 py-3 text-gray-400 font-black hover:text-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}

        {showVitalModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVitalModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black">{isEditingVital ? 'Edit Vital Sign' : 'Log Vital Sign'}</h3>
                <p className="text-gray-400 text-sm font-bold">Keep your health timeline updated.</p>
              </div>
              <form onSubmit={handleAddVital} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newVital.date}
                    onChange={(e) => setNewVital({...newVital, date: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                  <select 
                    value={newVital.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const unit = type === 'Blood Pressure' ? 'mmHg' : type === 'Weight' ? 'lbs' : 'BPM';
                      setNewVital({...newVital, type, unit});
                    }}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  >
                    <option>Blood Pressure</option>
                    <option>Weight</option>
                    <option>Heart Rate</option>
                    <option>Blood Sugar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Value ({newVital.unit})</label>
                  <input 
                    type="text" 
                    placeholder={newVital.type === 'Blood Pressure' ? '120/80' : '150'}
                    required
                    value={newVital.value}
                    onChange={(e) => setNewVital({...newVital, value: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <button type="submit" className="w-full candy-button-primary py-5 text-lg font-black">
                  {isEditingVital ? 'Update Entry' : 'Save Entry'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowVitalModal(false)}
                  className="w-full py-4 text-gray-400 font-black hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Appointment Modal */}
        {showAppointmentModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAppointmentModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black">Add Reminder</h3>
                <p className="text-gray-400 text-sm font-bold">Schedule your next health checkup.</p>
              </div>
              <form onSubmit={handleAddAppointment} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Annual Checkup"
                    required
                    value={newAppt.title}
                    onChange={(e) => setNewAppt({...newAppt, title: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Doctor / Specialist</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dr. Michael Chen"
                    value={newAppt.doctor}
                    onChange={(e) => setNewAppt({...newAppt, doctor: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newAppt.time}
                    onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none font-bold"
                  />
                </div>
                <button type="submit" className="w-full candy-button-primary py-5 text-lg font-black">
                  Add Reminder
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="w-full py-4 text-gray-400 font-black hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PatientLayout>
  );
}
