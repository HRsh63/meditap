import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, FileText, Shield, Edit3, Bell, Search, Plus, 
  ArrowRight, Activity, Calendar, LogOut, Zap, Heart, Droplet, 
  ChevronRight, AlertCircle, Clock, X, Check, Save, Trash2, Loader2,
  Users, MapPin, Truck, Phone, MessageSquare
} from 'lucide-react';
import { User } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useCrashDetection } from '../hooks/useCrashDetection';
import { supabase } from '../lib/supabase';
import { getNearestHospital, getTop3Hospitals, searchLocalHospitals, Hospital } from '../services/hospitalService';
import { chatService } from '../services/chatService';
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
  const { countdown, cancelEmergency } = useCrashDetection();
  const [accessLogs, setAccessLogs] = useState<any[]>([]);

  const broadcastSOSToFriends = async (type: string) => {
    try {
      addLog(`Initiating ${type} SOS broadcast...`);
      
      // Start channel subscription immediately
      const channel = supabase.channel('sos_alerts');
      
      const sendBroadcast = async (lat: number, lng: number) => {
        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'sos_alert',
              payload: {
                senderId: user.id,
                senderName: user.name,
                type,
                lat,
                lng,
                timestamp: Date.now(),
                mapsLink: `https://www.google.com/maps?q=${lat},${lng}`
              }
            });
            addLog(`Broadcast sent with coordinates: ${lat}, ${lng}`);
            // Also notify via Chat
            chatService.broadcastSOSToAllFriends(`EMERGENCY: ${type.toUpperCase()} triggered. Need immediate assistance. My live location is attached.`, lat, lng, type);
            // Cleanup channel after sending
            setTimeout(() => supabase.removeChannel(channel), 5000);
          }
        });
      };

      // Get location in parallel
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          sendBroadcast(latitude, longitude);
        },
        (error) => {
          addLog(`Location failed: ${error.message}. Sending emergency broadcast without precise coordinates.`);
          // Send with fallback (optional, or just fail)
          sendBroadcast(0, 0); 
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );

    } catch (error: any) {
      addLog(`SOS system error: ${error.message}`);
      console.error('Error broadcasting SOS:', error);
    }
  };
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFindingHospital, setIsFindingHospital] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const checkSystemStatus = async () => {
    addLog('Checking systems...');
    
    // Check Supabase
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      addLog(`Supabase Profiles: ${error ? 'FAIL (' + error.message + ')' : 'OK'}`);
      
      const { error: fError } = await supabase.from('friendships').select('id').limit(1);
      addLog(`Supabase Friendships: ${fError ? 'FAIL (' + fError.message + ')' : 'OK'}`);
    } catch (e) {
      addLog(`Supabase Connection: ERROR`);
    }

    // Check Sensors
    if (typeof DeviceMotionEvent !== 'undefined') {
      addLog('DeviceMotionEvent: Supported');
    } else {
      addLog('DeviceMotionEvent: NOT SUPPORTED');
    }

    // Check Geolocation
    navigator.geolocation.getCurrentPosition(
      () => addLog('Geolocation: OK'),
      (err) => addLog(`Geolocation: FAIL (${err.message})`)
    );
  };
  const [topHospitals, setTopHospitals] = useState<Hospital[]>([]);
  const [nearestHospital, setNearestHospital] = useState<{name: string, phone: string} | null>(null);
  
  // Form States
  const [newVital, setNewVital] = useState({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
  const [isEditingVital, setIsEditingVital] = useState(false);
  const [newAppt, setNewAppt] = useState({ title: '', doctor: '', location: '', time: '' });
  const [newAccess, setNewAccess] = useState({ hospital: '', type: 'Emergency', action: 'Checkup', date: new Date().toISOString().split('T')[0] });

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
        const fields = [
          'dob', 'gender', 'address', 'blood_group', 
          'weight', 'height', 'emergency_contact_name', 'emergency_contact_phone'
        ];
        const missing = [];
        if (!patientData.dob) missing.push('Date of Birth');
        if (!patientData.gender) missing.push('Gender');
        if (!patientData.address) missing.push('Address');
        if (!patientData.blood_group) missing.push('Blood Group');
        if (!patientData.weight) missing.push('Weight');
        if (!patientData.height) missing.push('Height');
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
    broadcastSOSToFriends('hospital_search');
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
        // Shorter timeout for location and use cache
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 4000, 
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 mins cache
        });
      });

      // Race the entire search process against the timeout
      await Promise.race([
        (async () => {
          const position = await getPosition();
          const { latitude, longitude } = position.coords;

          // Start local search immediately
          const localResults = searchLocalHospitals(latitude, longitude);
          
          if (localResults.length > 0) {
            setTopHospitals(localResults);
            resultsFound = true;
            // IMPORTANT: Hide loader immediately if we have local results
            setIsFindingHospital(false);
            setIsRefining(true);
          }

          // Fetch AI results in background
          const onlineResults = await getTop3Hospitals(latitude, longitude).catch(() => []);
          setIsRefining(false);
          
          if (onlineResults.length > 0) {
            // Merge and update
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

  const handleAddAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('access_logs').insert({
        patient_id: user.id,
        accessed_by_name: newAccess.hospital,
        access_type: newAccess.type,
        action: newAccess.action,
        created_at: new Date(newAccess.date).toISOString()
      });
      if (error) throw error;
      setShowAccessModal(false);
      setNewAccess({ hospital: '', type: 'Emergency', action: 'Checkup', date: new Date().toISOString().split('T')[0] });
      fetchDashboardData();
    } catch (err) {
      console.error('Error adding access log:', err);
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
                className="bg-red-500 text-white px-10 py-6 rounded-[2.5rem] flex items-center gap-4 shadow-2xl shadow-red-100 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:animate-pulse relative z-10 backdrop-blur-md">
                  <Zap size={28} />
                </div>
                <div className="text-left relative z-10">
                  <span className="block text-xs font-black uppercase tracking-widest opacity-80">Emergency</span>
                  <span className="text-2xl font-black uppercase tracking-tighter">SOS</span>
                </div>
              </motion.button>

              {/* Profile Completion */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 flex-1 min-w-[300px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">Profile Completion</h3>
                  <span className="text-brand-pink font-black text-xl">{profileCompletion}%</span>
                </div>
                <div className="w-full h-3 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden mb-4 border border-white/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full candy-gradient"
                  ></motion.div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
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
            { label: 'My ID', icon: <UserIcon size={32} />, color: 'bg-brand-pink/80', path: '/id-card' },
            { label: 'Records', icon: <FileText size={32} />, color: 'bg-brand-purple/80', path: '/records' },
            { label: 'Insurance', icon: <Shield size={32} />, color: 'bg-brand-blue/80', path: '/vault' },
            { label: 'Community', icon: <Users size={32} />, color: 'bg-white/40', backdrop: 'backdrop-blur-md', textColor: 'text-gray-800', iconColor: 'text-brand-pink', border: 'border border-white/50', path: '/friends' },
          ].map((card, i) => (
            <motion.button
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(card.path)}
              className={`relative h-48 rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden shadow-xl transition-all hover:shadow-2xl ${card.color} ${card.backdrop || ''} ${card.textColor || 'text-white'} ${card.border || ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconColor || 'text-white'} bg-white/20 backdrop-blur-md border border-white/30`}>
                {card.icon}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black tracking-tight">{card.label}</span>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-2 transition-transform backdrop-blur-md">
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
          <section className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-500/10 text-brand-pink rounded-2xl flex items-center justify-center border border-pink-200/50 backdrop-blur-md">
                  <Heart size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Blood Pressure</h2>
                  <div className="h-1 w-8 bg-brand-purple rounded-full mt-1 opacity-20"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-white/40 backdrop-blur-md text-gray-400 rounded-full flex items-center justify-center hover:text-brand-pink transition-colors border border-white/50"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-white/40 backdrop-blur-md text-gray-400 rounded-full flex items-center justify-center hover:text-brand-pink transition-colors border border-white/50"
                >
                  <Calendar size={20} />
                </button>
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Blood Pressure', value: '', unit: 'mmHg', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-brand-pink text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-pink-200"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                  <h4 className="text-3xl font-black text-brand-purple">
                    {vitals.findLast(v => v.type === 'Blood Pressure')?.value || '118/76'} 
                    <span className="text-sm font-bold text-gray-400 ml-2 uppercase tracking-widest">mmHg</span>
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
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '1.5rem', 
                        border: '1px solid rgba(255, 255, 255, 0.5)', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                        padding: '12px'
                      }}
                      labelStyle={{ fontWeight: 'black', color: '#1f2937' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recent History</p>
              {vitals.filter(v => v.type === 'Blood Pressure').slice(-3).reverse().map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-md rounded-2xl group border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-purple shadow-sm">
                      <Heart size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-700">{v.value} {v.unit}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteVital(v.id)}
                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Weight Timeline */}
          <section className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 text-brand-blue rounded-2xl flex items-center justify-center border border-blue-200/50 backdrop-blur-md">
                  <Activity size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Weight</h2>
                  <div className="h-1 w-8 bg-brand-blue rounded-full mt-1 opacity-20"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Weight', value: '', unit: 'lbs', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-white/40 backdrop-blur-md text-gray-400 rounded-full flex items-center justify-center hover:text-brand-blue transition-colors border border-white/50"
                >
                  <Calendar size={20} />
                </button>
                <button 
                  onClick={() => {
                    setIsEditingVital(false);
                    setNewVital({ id: '', type: 'Weight', value: '', unit: 'lbs', date: new Date().toISOString().split('T')[0] });
                    setShowVitalModal(true);
                  }}
                  className="w-10 h-10 bg-brand-blue text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-200"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Weight</p>
                  <h4 className="text-3xl font-black text-brand-blue">
                    {vitals.findLast(v => v.type === 'Weight')?.value || 'N/A'} 
                    <span className="text-sm font-bold text-gray-400 ml-2 uppercase tracking-widest">lbs</span>
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
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '1.5rem', 
                        border: '1px solid rgba(255, 255, 255, 0.5)', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                        padding: '12px'
                      }}
                      labelStyle={{ fontWeight: 'black', color: '#1f2937' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recent History</p>
              {vitals.filter(v => v.type === 'Weight').slice(-3).reverse().map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-md rounded-2xl group border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-blue shadow-sm">
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-700">{v.value} {v.unit}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteVital(v.id)}
                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Access */}
          <section className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white ring-1 ring-brand-pink/20 text-brand-pink rounded-2xl flex items-center justify-center shadow-sm">
                  <Clock size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Recent Access</h2>
                  <div className="h-1 w-8 bg-brand-pink rounded-full mt-1 opacity-20"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAccessModal(true)}
                  className="w-10 h-10 bg-white/40 backdrop-blur-md text-gray-400 rounded-full flex items-center justify-center hover:text-brand-pink transition-colors border border-white/50"
                >
                  <Plus size={20} />
                </button>
                <button className="text-[10px] font-black text-brand-pink uppercase tracking-widest hover:underline">View All</button>
              </div>
            </div>

              <div className="space-y-4">
                {accessLogs.length > 0 ? (
                  accessLogs.map((log) => (
                    <div key={log.id} className="p-6 bg-white/40 backdrop-blur-md border border-white/50 rounded-[2.5rem] flex items-center justify-between group hover:border-brand-pink/30 hover:bg-white/60 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center text-brand-pink shadow-inner border border-brand-pink/5">
                          <span className="text-[9px] font-black uppercase opacity-60">{new Date(log.created_at).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-2xl font-black leading-none">{new Date(log.created_at).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="text-base font-black text-gray-800">{log.accessed_by_name || 'St. Jude Medical Center'}</h4>
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{log.access_type} • {log.action || 'Emergency Room'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Time</p>
                        <p className="font-black text-gray-600 text-sm">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-300 font-bold border-2 border-dashed border-white/20 rounded-[2.5rem]">
                    No recent access logs.
                  </div>
                )}
              </div>
            </section>

            {/* Upcoming Appointments / Reminders */}
            <section className="glass-card p-8 h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white ring-1 ring-brand-purple/20 text-brand-purple rounded-2xl flex items-center justify-center shadow-sm">
                    <Calendar size={24} />
                  </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Reminders</h2>
                  <div className="h-1 w-8 bg-brand-purple rounded-full mt-1 opacity-20"></div>
                </div>
              </div>
              <button 
                  onClick={() => setShowAppointmentModal(true)}
                  className="w-10 h-10 bg-brand-purple text-white shadow-lg shadow-purple-100 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {appointments.length > 0 ? (
                  appointments.map((appt) => (
                    <div key={appt.id} className="p-6 bg-white/40 backdrop-blur-md border border-white/50 rounded-[2.5rem] relative group hover:bg-white/60 transition-all">
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
                          <h4 className="font-black text-gray-800 text-sm leading-tight mb-0.5">{appt.title}</h4>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{appt.doctor}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="px-3 py-1 bg-white ring-1 ring-brand-purple/20 rounded-full text-[9px] font-black text-brand-purple uppercase tracking-widest">
                          {new Date(appt.appointment_time).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-black text-gray-400">
                          {new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-12 text-center text-gray-300 font-bold border-2 border-dashed border-white/20 rounded-[2.5rem]">
                    No upcoming reminders.
                  </div>
                )}
              </div>
            </section>

            {/* Messages Quick Access */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-pink/10 rounded-xl flex items-center justify-center text-brand-pink">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Recent Chats</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Connect with your safety network</p>
                  </div>
                </div>
                <Link to="/chats" className="candy-button-outline text-xs px-6 py-2">
                  Open Messenger
                </Link>
              </div>
              <div 
                onClick={() => navigate('/chats')}
                className="bg-white border-2 border-gray-100 p-8 rounded-[3rem] cursor-pointer hover:border-brand-pink/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-pink/5 rounded-[1.5rem] flex items-center justify-center text-brand-pink group-hover:scale-110 transition-transform">
                      <MessageSquare size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-1">Check your messages</h3>
                      <p className="text-gray-500 font-medium text-sm">Stay in touch with your friends and family during emergencies.</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-gray-300 group-hover:text-brand-pink transition-colors" />
                </div>
              </div>
            </section>
          </div>
      </main>

      {/* Floating QR FAB Removed as per request */}

      {/* Vitals Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <div 
            key="sos-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setShowSOSModal(false)}
          >
            <motion.div 
              key="sos-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/40 backdrop-blur-3xl w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/50"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse border border-red-200/30 backdrop-blur-md">
                  <Zap size={32} />
                </div>
                <h3 className="text-2xl font-black mb-1">Emergency SOS</h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Immediate assistance is one tap away</p>
              </div>

              <div className="space-y-4">
                {/* Option 1: National Emergency */}
                <motion.button 
                  onClick={() => {
                    broadcastSOSToFriends('emergency');
                    window.location.href = 'tel:112';
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-4 p-5 bg-red-500 text-white rounded-[2rem] shadow-xl shadow-red-100/50 group transition-all relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md relative z-10">
                    <Zap size={28} />
                  </div>
                  <div className="text-left relative z-10">
                    <h4 className="text-xl font-black leading-tight">Emergency 112</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">National Helpline (India)</p>
                  </div>
                </motion.button>

                {/* Option 2: Nearest Hospital */}
                <div className="space-y-3">
                  {!isFindingHospital && topHospitals.length === 0 && (
                    <motion.button 
                      onClick={findNearestHospital}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 p-4 bg-white/40 backdrop-blur-md border border-white/50 rounded-[1.5rem] group transition-all hover:bg-white hover:text-blue-600"
                    >
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <MapPin size={24} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-lg font-black leading-tight">Find Nearest Hospitals</h4>
                        <p className="text-[10px] font-bold opacity-70">Real-time Proximity Search</p>
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
                      <div className="flex items-center justify-between ml-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Top 3 Nearest Hospitals</p>
                        {isRefining && (
                          <div className="flex items-center gap-2">
                             <Loader2 size={10} className="animate-spin text-blue-500" />
                             <span className="text-[8px] font-black text-blue-500 uppercase">Refining with AI...</span>
                          </div>
                        )}
                      </div>
                      {topHospitals.map((h, i) => (
                        <motion.button 
                          key={`${h.name}-${i}`}
                          onClick={() => {
                            broadcastSOSToFriends(`hospital_${h.name}`);
                            window.location.href = `tel:${h.phone}`;
                          }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-[1.5rem] border-2 border-blue-100 hover:bg-blue-500 hover:text-white transition-all group"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-white/20 group-hover:text-white">
                            <Activity size={20} />
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-sm font-black leading-tight mb-1">{h.name}</h4>
                            <p className="text-[10px] font-bold opacity-70 leading-relaxed">{h.address}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-black text-blue-500 group-hover:text-white block mb-1">{h.distance}</span>
                            <div className="flex items-center gap-1 justify-end text-brand-blue group-hover:text-white">
                              <Phone size={10} />
                              <span className="text-[10px] font-black">{h.phone}</span>
                            </div>
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
                <motion.button 
                  onClick={() => {
                    broadcastSOSToFriends('ambulance');
                    window.location.href = 'tel:108';
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 bg-purple-50 rounded-[1.5rem] border-2 border-purple-100 group transition-all hover:bg-purple-500 hover:text-white"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-500 shadow-sm group-hover:bg-white/20 group-hover:text-white">
                    <Truck size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-black leading-tight">Ambulance 108</h4>
                    <p className="text-[10px] font-bold opacity-70">GVK EMRI Network</p>
                  </div>
                </motion.button>
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
            key="vital-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVitalModal(false)}
          >
            <motion.div 
              key="vital-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/40 backdrop-blur-3xl w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-white/50 relative overflow-hidden"
            >
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black tracking-tight">{isEditingVital ? 'Edit Vital' : 'Log Vital'}</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Keep your health timeline updated</p>
              </div>
              <form onSubmit={handleAddVital} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Measurement Date</label>
                    <input 
                      type="date" 
                      required
                      value={newVital.date}
                      onChange={(e) => setNewVital({...newVital, date: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Vital Category</label>
                    <select 
                      value={newVital.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        const unit = type === 'Blood Pressure' ? 'mmHg' : type === 'Weight' ? 'lbs' : 'BPM';
                        setNewVital({...newVital, type, unit});
                      }}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    >
                      <option>Blood Pressure</option>
                      <option>Weight</option>
                      <option>Heart Rate</option>
                      <option>Blood Sugar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Value ({newVital.unit})</label>
                    <input 
                      type="text" 
                      placeholder={newVital.type === 'Blood Pressure' ? '120/80' : '150'}
                      required
                      value={newVital.value}
                      onChange={(e) => setNewVital({...newVital, value: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <button type="submit" className="w-full py-5 bg-brand-pink text-white rounded-2xl font-black text-lg shadow-xl shadow-pink-100 hover:scale-[1.02] transition-transform">
                    {isEditingVital ? 'Update Entry' : 'Save Entry'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowVitalModal(false)}
                    className="w-full py-4 text-gray-400 font-black hover:text-brand-pink transition-all text-xs uppercase tracking-widest"
                  >
                    Not now, cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAccessModal && (
          <div 
            key="access-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAccessModal(false)}
          >
            <motion.div 
              key="access-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/40 backdrop-blur-3xl w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-white/50 relative overflow-hidden"
            >
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black tracking-tight">Access Log</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Record a recent hospital visit</p>
              </div>
              <form onSubmit={handleAddAccess} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Hospital Facility</label>
                    <input 
                      type="text" 
                      placeholder="e.g. St. Jude Medical Center"
                      required
                      value={newAccess.hospital}
                      onChange={(e) => setNewAccess({...newAccess, hospital: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Access Type</label>
                      <select 
                        value={newAccess.type}
                        onChange={(e) => setNewAccess({...newAccess, type: e.target.value})}
                        className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all text-xs"
                      >
                        <option>Emergency</option>
                        <option>Routine</option>
                        <option>Specialist</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Action Taken</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Checkup"
                        value={newAccess.action}
                        onChange={(e) => setNewAccess({...newAccess, action: e.target.value})}
                        className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Visit Date</label>
                    <input 
                      type="date" 
                      required
                      value={newAccess.date}
                      onChange={(e) => setNewAccess({...newAccess, date: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <button type="submit" className="w-full py-5 bg-brand-pink text-white rounded-2xl font-black text-lg shadow-xl shadow-pink-100 hover:scale-[1.02] transition-transform">
                    Add Access Log
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAccessModal(false)}
                    className="w-full py-4 text-gray-400 font-black hover:text-brand-pink transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Appointment Modal */}
        {showAppointmentModal && (
          <div 
            key="appointment-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAppointmentModal(false)}
          >
            <motion.div 
              key="appointment-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/40 backdrop-blur-3xl w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-white/50 relative overflow-hidden"
            >
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black tracking-tight">Add Reminder</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Schedule your next health checkup</p>
              </div>
              <form onSubmit={handleAddAppointment} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Reminder Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Annual Checkup"
                      required
                      value={newAppt.title}
                      onChange={(e) => setNewAppt({...newAppt, title: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Doctor / Specialist</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dr. Michael Chen"
                      value={newAppt.doctor}
                      onChange={(e) => setNewAppt({...newAppt, doctor: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newAppt.time}
                      onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                      className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl focus:border-brand-pink outline-none font-bold text-gray-700 shadow-sm transition-all"
                    />
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <button type="submit" className="w-full py-5 bg-brand-pink text-white rounded-2xl font-black text-lg shadow-xl shadow-pink-100 hover:scale-[1.02] transition-transform">
                    Add Reminder
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAppointmentModal(false)}
                    className="w-full py-4 text-gray-400 font-black hover:text-brand-pink transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Emergency Countdown Overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div 
              key="countdown-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-red-600/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white text-center"
            >
              <div className="absolute inset-0 bg-red-600 animate-pulse opacity-40"></div>
              
              <div className="relative z-10 w-full max-w-md space-y-12">
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Zap size={48} className="animate-bounce" />
                  </div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter">Impact Detected!</h1>
                  <p className="text-xl font-bold opacity-80">Are you okay?</p>
                </div>

                <div className="text-8xl font-black tabular-nums scale-[2]">
                  {countdown}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium opacity-70 px-8">
                    An emergency alert will be sent to your friends and 112 will be dialed automatically in {countdown} seconds.
                  </p>
                  
                  <button 
                    onClick={cancelEmergency}
                    className="w-full bg-white text-red-600 py-6 rounded-[2rem] text-xl font-black shadow-2xl hover:bg-red-50 transition-all active:scale-95"
                  >
                    I AM OKAY (CANCEL)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => { setShowDiagnosticModal(true); checkSystemStatus(); }}
          className="fixed bottom-4 left-4 z-50 p-3 bg-gray-900/50 text-white/50 backdrop-blur-md rounded-full hover:bg-gray-900 transition-all hover:text-white"
          title="System Diagnostics"
        >
          <Zap size={16} />
        </button>

        {/* Diagnostic Modal */}
        <AnimatePresence>
          {showDiagnosticModal && (
            <div 
              key="diagnostic-modal-overlay"
              className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            >
              <motion.div 
                key="diagnostic-modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">System Diagnostics</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Real-time Debug Logs</p>
                  </div>
                  <button 
                    onClick={() => setShowDiagnosticModal(false)}
                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-black rounded-2xl p-4 font-mono text-[10px] space-y-1 custom-scrollbar">
                  {logs.length === 0 && <p className="text-gray-700 italic">No logs yet...</p>}
                  {logs.map((log, i) => (
                    <div key={`${i}-${log.substring(0, 10)}`} className={`${log.includes('FAIL') || log.includes('ERROR') ? 'text-red-400' : log.includes('OK') ? 'text-green-400' : 'text-blue-300'}`}>
                      {log}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={checkSystemStatus}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                  >
                    Refresh Tests
                  </button>
                  <button 
                    onClick={() => setLogs([])}
                    className="px-6 border border-white/10 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/5 transition-all"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </AnimatePresence>
    </PatientLayout>
  );
}
