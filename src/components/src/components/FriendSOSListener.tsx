import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Phone, MapPin, X, ExternalLink, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface FriendAlert {
  senderId: string;
  senderName: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: number;
  mapsLink: string;
}

export default function FriendSOSListener({ user }: { user: User }) {
  const [activeAlert, setActiveAlert] = useState<FriendAlert | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1. Initialize Audio for Ringing
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/emergency_siren.ogg');
    audioRef.current.loop = true;

    // 2. Subscribe to SOS channel
    const channel = supabase.channel('sos_alerts');
    
    channel.on('broadcast', { event: 'sos_alert' }, (payload: any) => {
      const alert = payload.payload as FriendAlert;
      
      // Don't alert for yourself
      if (alert.senderId === user.id) return;

      // Verify if sender is a mutual friend
      verifyFriendship(alert.senderId).then(isFriend => {
        if (isFriend) {
          setActiveAlert(alert);
          if (audioRef.current) {
            audioRef.current.volume = 1.0;
            audioRef.current.play().catch(e => console.warn('Audio play blocked:', e));
          }
          // Trigger vibration if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
        }
      });
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [user.id]);

  const verifyFriendship = async (friendId: string) => {
    const { count } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
    
    return (count || 0) > 0;
  };

  const getAlertTitle = (type: string) => {
    if (type === 'emergency') return 'NATIONAL EMERGENCY (112)';
    if (type === 'ambulance') return 'AMBULANCE REQUEST (108)';
    if (type === 'hospital_search') return 'HOSPITAL SEARCHED';
    if (type.startsWith('hospital_')) return `CALLING ${type.replace('hospital_', '').toUpperCase()}`;
    if (type === 'fall') return 'FALL DETECTED';
    if (type === 'crash') return 'CRASH DETECTED';
    return 'SOS ALERT';
  };

  const stopAlert = () => {
    setActiveAlert(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  return (
    <AnimatePresence>
      {activeAlert && (
        <motion.div 
          key="sos-alert-full-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-red-600 flex flex-col items-center justify-center p-6 text-white text-center overflow-hidden"
        >
          {/* Animated Background Pulse */}
          <motion.div 
            animate={{ 
              backgroundColor: ['#dc2626', '#ef4444', '#dc2626'],
              scale: [1, 1.1, 1]
            }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="absolute inset-0 opacity-80"
          ></motion.div>

          <div className="relative z-10 w-full max-w-md space-y-8">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-32 h-32 bg-white text-red-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,255,255,0.5)]"
            >
              <Zap size={64} fill="currentColor" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-5xl font-black uppercase tracking-tighter drop-shadow-lg animate-pulse">RINGING...</h1>
              <div className="inline-block px-6 py-2 bg-black/30 rounded-full">
                <p className="text-xl font-black">{activeAlert.senderName} Needs Help</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[3rem] p-8 border-2 border-white/30 space-y-6 shadow-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-2xl font-black text-yellow-300">
                  <AlertCircle size={32} />
                  <span>ACTION DETECTED</span>
                </div>
                <p className="text-xl font-black tracking-tight">{getAlertTitle(activeAlert.type)}</p>
              </div>

              <div className="h-0.5 w-full bg-white/20 rounded-full"></div>

              <p className="text-sm font-bold opacity-90 leading-relaxed">
                {activeAlert.senderName} is in a critical situation. Their exact GPS location is available below.
              </p>

              <div className="flex flex-col gap-4">
                <a 
                  href={activeAlert.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-white text-red-600 py-6 rounded-3xl font-black text-lg hover:bg-red-50 transition-all hover:scale-105 shadow-xl"
                >
                  <MapPin size={28} />
                  Open Live Maps Location
                </a>

                <div className="grid grid-cols-2 gap-4">
                  <a 
                    href={`tel:112`}
                    className="flex flex-col items-center justify-center gap-1 bg-white/10 text-white border-2 border-white/20 py-4 rounded-3xl font-black hover:bg-white/20 transition-all"
                  >
                    <Zap size={20} />
                    <span className="text-[10px] uppercase tracking-widest">Help 112</span>
                  </a>
                  <button 
                    onClick={stopAlert}
                    className="flex flex-col items-center justify-center gap-1 bg-black text-white py-4 rounded-3xl font-black hover:bg-black/80 transition-all"
                  >
                    <X size={20} />
                    <span className="text-[10px] uppercase tracking-widest">Silence Siren</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
