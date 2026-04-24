import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Download, Database, MapPin, Shield, Check, AlertCircle, 
  ArrowLeft, Loader2, Globe, Navigation, Activity, Smartphone,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, PatientData } from '../types';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { downloadHospitalDatabase } from '../services/hospitalService';
import { useCrashDetection } from '../hooks/useCrashDetection';

interface SettingsProps {
  user: User;
}

export default function Settings({ user }: SettingsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [range, setRange] = useState(50);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const { isMonitoring, startMonitoring, stopMonitoring, error: crashError, liveAcc } = useCrashDetection();
  const isInIframe = window.self !== window.top;

  useEffect(() => {
    fetchSettings();
    const info = localStorage.getItem('local_hospital_db_info');
    if (info) setDbInfo(JSON.parse(info));
  }, [user.id]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('patient_data')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setPatientData(data);
        if (data.hospital_db_range) setRange(data.hospital_db_range);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (isFullIndia: boolean) => {
    setDownloading(true);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const downloadRange = isFullIndia ? 0 : range;
      await downloadHospitalDatabase(position.coords.latitude, position.coords.longitude, downloadRange);
      
      // Update DB info
      const info = localStorage.getItem('local_hospital_db_info');
      if (info) setDbInfo(JSON.parse(info));

      // Update patient data in Supabase
      await supabase
        .from('patient_data')
        .update({ 
          hospital_db_downloaded: true,
          hospital_db_range: downloadRange
        })
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download database. Please check your connection and location permissions.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PatientLayout user={user}>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-pink shadow-sm transition-all hover:scale-110 active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Settings</h1>
            <p className="text-gray-500 font-medium tracking-tight">Manage your data and offline preferences.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Crash Detection Section */}
          <section className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isMonitoring ? 'bg-red-500/20 text-red-500' : 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-400'}`}>
                  <Activity size={32} className={isMonitoring ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Crash Detection</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Real-time Safety</p>
                </div>
              </div>
              <button 
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`px-6 py-3 rounded-2xl font-black transition-all ${
                  isMonitoring 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                    : 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-400 hover:bg-white/60 hover:text-gray-600'
                }`}
              >
                {isMonitoring ? 'Monitoring Active' : 'Enable Detection'}
              </button>
            </div>

            <div className={`rounded-[2rem] p-8 mb-4 border-2 transition-all ${isMonitoring ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMonitoring ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'}`}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className={`font-black mb-1 ${isMonitoring ? 'text-red-900' : 'text-gray-900'}`}>
                    How it works
                  </h3>
                  <p className={`text-sm font-medium leading-relaxed ${isMonitoring ? 'text-red-700/70' : 'text-gray-500'}`}>
                    Using real-time sensor data processed through <strong>AI Studio</strong>, MediTap can detect human falls and vehicle crashes. If an emergency is detected, it automatically initiates a call to 112 and shares your location with emergency contacts.
                    <br /><br />
                    <span className="text-[10px] font-black uppercase opacity-60">Note: Detects impact followed by 3 seconds of immobility.</span>
                  </p>
                </div>
              </div>
              
              {isMonitoring && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl border-2 border-green-100 italic text-xs">
                    <Shield size={16} />
                    <span>AI Pipeline Active: Analyzing sensor patterns at 20Hz</span>
                  </div>
                  
                  <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Sensor Activity</span>
                      <span className={`text-xs font-black ${liveAcc > 20 ? 'text-red-500' : 'text-blue-500'}`}>
                        {liveAcc.toFixed(2)} m/s²
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full transition-colors duration-200 ${liveAcc > 25 ? 'bg-red-500' : 'bg-blue-500'}`}
                        animate={{ width: `${Math.min((liveAcc / 40) * 100, 100)}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                      />
                    </div>
                    <div className="mt-4 flex justify-between text-[8px] font-bold text-gray-300 uppercase tracking-tighter">
                      <span>Rest (9.8)</span>
                      <span>Impact Thr (9.81)</span>
                    </div>
                  </div>
                </div>
              )}
              
              {crashError && (
                <div className="mt-6 flex flex-col gap-4">
                  <div className="p-4 bg-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold">
                    <AlertCircle size={18} />
                    {crashError}
                  </div>
                  {isInIframe && (
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                      <ExternalLink size={20} />
                      Open in New Tab to Enable
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {!isMonitoring && (
              <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">
                Requires motion sensor & location permissions
              </p>
            )}
          </section>

          {/* Offline Database Section */}
          <section className="glass-card p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
                <Database size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Offline Hospital Database</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Safety & Reliability</p>
              </div>
            </div>

            <div className="bg-blue-50/50 border-2 border-blue-100 rounded-[2rem] p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-black text-blue-900 mb-1">Why download?</h3>
                  <p className="text-sm text-blue-700/70 font-medium leading-relaxed">
                    In critical emergencies, internet connectivity can be unreliable. Downloading a local database ensures you can find the nearest hospital even when offline.
                  </p>
                </div>
              </div>

              {dbInfo ? (
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-500 rounded-lg flex items-center justify-center">
                      <Check size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-800">Database Ready</p>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {dbInfo.range === 0 ? 'Full India' : `${dbInfo.range}km range`} • Updated {new Date(dbInfo.downloadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('local_hospital_db');
                      localStorage.removeItem('local_hospital_db_info');
                      setDbInfo(null);
                    }}
                    className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-100">
                  <AlertCircle size={18} className="text-yellow-500" />
                  <p className="text-xs font-bold text-yellow-700">No local database found. Download recommended.</p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Option 1: Range-based */}
              <div className="p-6 border-2 border-gray-100 rounded-[2rem] hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <Navigation size={20} className="text-blue-500" />
                  <h3 className="font-black">Local Range</h3>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-6">Download hospitals within a specific radius of your current location.</p>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Range</span>
                    <span className="text-xs font-black text-blue-500">{range} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="1000" 
                    value={range}
                    onChange={(e) => setRange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px] font-bold text-gray-300">1 km</span>
                    <span className="text-[8px] font-bold text-gray-300">1000 km</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDownload(false)}
                  disabled={downloading}
                  className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50 transition-all"
                >
                  {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                  Download Local
                </button>
              </div>

              {/* Option 2: Full India */}
              <div className="p-6 border-2 border-gray-100 rounded-[2rem] hover:border-purple-200 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={20} className="text-purple-500" />
                  <h3 className="font-black">Full India</h3>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-6">Download a comprehensive database of major hospitals across all of India.</p>
                
                <div className="h-[72px] flex items-center justify-center mb-6 bg-purple-50 rounded-2xl border-2 border-purple-100">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Recommended for Travelers</span>
                </div>

                <button 
                  onClick={() => handleDownload(true)}
                  disabled={downloading}
                  className="w-full py-4 bg-purple-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-purple-600 disabled:opacity-50 transition-all"
                >
                  {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                  Download India DB
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </PatientLayout>
  );
}
