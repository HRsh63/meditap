import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Download, Database, MapPin, Shield, Check, AlertCircle, 
  ArrowLeft, Loader2, Globe, Navigation
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, PatientData } from '../types';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { downloadHospitalDatabase } from '../services/hospitalService';

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
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-pink shadow-sm transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Settings</h1>
            <p className="text-gray-500 font-medium">Manage your data and offline preferences.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Offline Database Section */}
          <section className="candy-card p-8 bg-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                <Database size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black">Offline Hospital Database</h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Safety & Reliability</p>
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
