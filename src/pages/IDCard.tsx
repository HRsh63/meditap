import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Download, Share2, ArrowLeft, Smartphone, QrCode, Camera, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { generateMedicalImage } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { PatientData, User } from '../types';
import PatientLayout from '../components/PatientLayout';
import QRScanner from '../components/QRScanner';

interface IDCardProps {
  user: User;
}

export default function IDCard({ user }: IDCardProps) {
  const navigate = useNavigate();
  const [medicalData, setMedicalData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [isNfcActive, setIsNfcActive] = useState(false);

  useEffect(() => {
    fetchCardData();
    // Check if NFC was previously active (mocking persistence for now)
    const savedNfc = localStorage.getItem('meditap_nfc_active');
    if (savedNfc === 'true') setIsNfcActive(true);
  }, []);

  const toggleNFC = () => {
    const newState = !isNfcActive;
    setIsNfcActive(newState);
    localStorage.setItem('meditap_nfc_active', String(newState));
    
    // Real Web NFC API attempt (if supported)
    if (newState && 'NDEFReader' in window) {
      try {
        // @ts-ignore
        const reader = new NDEFReader();
        reader.scan().then(() => {
          console.log("NFC Scan started successfully.");
        }).catch((error: any) => {
          console.error(`Error starting NFC scan: ${error}.`);
        });
      } catch (error) {
        console.error("NFC not supported or permission denied.");
      }
    }
  };

  const fetchCardData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from('patient_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pData) setMedicalData(pData as PatientData);

    } catch (err) {
      console.error('Error fetching card data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    // Mock PDF download
    alert('Generating your Medical ID PDF... Download starting shortly.');
    const link = document.createElement('a');
    link.href = '#';
    link.download = `MediTap_ID_${user.name.replace(/\s+/g, '_')}.pdf`;
    link.click();
  };

  const handleWhatsAppShare = () => {
    const text = `Check out my MediTap Medical ID! In case of emergency, scan my QR code or tap my NFC tag. ID: ${user.id.toUpperCase()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-pink animate-spin" />
      </div>
    );
  }

  return (
    <PatientLayout user={user}>
      {/* Header */}
      <header className="glass-nav px-6 py-4 sticky top-0 z-20 !border-t-0 !border-b border-white/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-600 hover:text-brand-pink transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Your Digital Pass</h1>
          <div className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-600">
            <Shield size={20} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* ID Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="relative w-full max-w-md mx-auto aspect-[1.58/1] candy-gradient rounded-[2.5rem] p-8 text-white shadow-2xl shadow-pink-200 overflow-hidden mb-12 group"
        >
          {/* Decorative patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white text-brand-pink rounded-lg flex items-center justify-center font-bold">M</div>
                <span className="text-xl font-bold tracking-tight">MediTap</span>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest">Premium ID</div>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-black text-4xl">
                  {user.name.charAt(0)}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{user.name}</h3>
                <p className="text-white/80 font-medium">{user.id.slice(0, 8).toUpperCase()}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/60">Blood</p>
                    <p className="text-sm font-bold">{medicalData?.blood_group || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/60">Allergies</p>
                    <p className="text-sm font-bold truncate max-w-[100px]">{medicalData?.allergies?.[0] || 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFullQR(true)}
                  className="w-10 h-10 bg-white p-1 rounded-lg hover:scale-110 transition-transform shadow-lg"
                >
                  <QrCode size={32} className="text-brand-pink" />
                </button>
                <button 
                  onClick={() => setShowScanner(true)}
                  className="text-left group/scan"
                >
                  <p className="text-[10px] font-bold leading-tight group-hover/scan:text-white/100 text-white/80 transition-colors">Scan for<br />Emergency Access</p>
                </button>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-white/60">Valid Thru</p>
                <p className="text-sm font-bold">12 / 2028</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <button 
            onClick={() => setShowNFCModal(true)}
            className="glass-card p-6 flex flex-col items-center gap-3 hover:border-brand-pink/50 group relative"
          >
            <div className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isNfcActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
              {isNfcActive ? 'ON' : 'OFF'}
            </div>
            <div className={`w-12 h-12 ${isNfcActive ? 'bg-green-500/20 text-green-500' : 'bg-pink-500/20 text-brand-pink'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Smartphone size={24} />
            </div>
            <span className="font-bold text-gray-700">Activate NFC</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="glass-card p-6 flex flex-col items-center gap-3 hover:border-brand-pink/50 group"
          >
            <div className="w-12 h-12 bg-purple-500/20 text-brand-purple rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <span className="font-bold text-gray-700">Download PDF</span>
          </button>
          <button 
            onClick={handleWhatsAppShare}
            className="glass-card p-6 flex flex-col items-center gap-3 hover:border-brand-pink/50 group"
          >
            <div className="w-12 h-12 bg-blue-500/20 text-brand-blue rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 size={24} />
            </div>
            <span className="font-bold text-gray-700">WhatsApp Share</span>
          </button>
        </div>

        {/* Security Info */}
        <div className="glass-card p-8 bg-brand-pink/5 border-brand-pink/20 flex items-start gap-6">
          <div className="w-12 h-12 bg-white text-brand-pink rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-brand-pink mb-2">Secure Digital Identity</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Your MediTap ID uses end-to-end encryption. Only authorized medical personnel can access your full records during an emergency or with your explicit permission.</p>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showScanner && (
          <QRScanner 
            onClose={() => setShowScanner(false)} 
            onScan={(text) => {
              console.log("Scanned:", text);
              // Handle scanned medical ID
              if (text.length > 5) {
                navigate(`/emergency/${text}`);
              }
            }}
            title="Emergency Scan"
          />
        )}

        {showFullQR && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFullQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center shadow-2xl"
            >
              <button 
                onClick={() => setShowFullQR(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={20} />
              </button>
              
              <div className="w-20 h-20 bg-brand-light text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
                <QrCode size={48} />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Emergency QR</h3>
              <p className="text-gray-500 mb-8">Show this to medical personnel for instant access to your records.</p>
              
              <div className="bg-gray-50 p-8 rounded-3xl mb-8 flex items-center justify-center border-2 border-dashed border-gray-200">
                {/* In a real app, we'd use a QR generator library here */}
                <div className="relative group">
                  <QrCode size={200} className="text-brand-pink opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-xl">
                    <p className="text-[10px] font-black text-brand-pink uppercase tracking-tighter">Permanent Key</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">MediTap ID: {medicalData?.qr_code || user.id.toUpperCase()}</p>
            </motion.div>
          </div>
        )}

        {showNFCModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowNFCModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowNFCModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-brand-light text-brand-pink rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                  <Smartphone size={48} className={isNfcActive ? 'animate-pulse' : ''} />
                  {isNfcActive && (
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 border-4 border-brand-pink rounded-3xl"
                    />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">NFC Medical Identity</h3>
                <p className="text-gray-500">Tap your phone to any MediTap-enabled reader for instant, contactless access to your medical pass.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-3xl">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Shield size={18} className="text-brand-pink" />
                    How it works
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    When active, your phone acts as a secure medical key. Medical personnel can simply tap their device to yours to receive your emergency profile instantly.
                  </p>
                </div>

                <div className="flex items-center justify-between p-6 bg-brand-light rounded-3xl border-2 border-brand-pink/10">
                  <div>
                    <p className="font-bold text-brand-pink">NFC Broadcast</p>
                    <p className="text-xs text-gray-500">{isNfcActive ? 'Your ID is currently broadcasting' : 'Broadcasting is disabled'}</p>
                  </div>
                  <button 
                    onClick={toggleNFC}
                    className={`w-14 h-8 rounded-full relative transition-colors ${isNfcActive ? 'bg-brand-pink' : 'bg-gray-300'}`}
                  >
                    <motion.div 
                      animate={{ x: isNfcActive ? 24 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowNFCModal(false)}
                className="w-full mt-8 candy-button-primary py-4"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PatientLayout>
  );
}
