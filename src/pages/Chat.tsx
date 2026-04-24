import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  MapPin, 
  Phone, 
  Zap, 
  ChevronLeft,
  Search,
  MoreVertical,
  AlertCircle,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { friendService, Friendship } from '../services/friendService';
import { chatService, ChatMessage } from '../services/chatService';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';

interface ChatProps {
  user: User;
}

export default function Chat({ user }: ChatProps) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    const data = await friendService.getFriends();
    const mutual = data.filter(f => f.status === 'accepted');
    setFriendships(mutual);
    if (mutual.length > 0 && !selectedFriend) {
      setSelectedFriend(mutual[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedFriend) return;

    // Load History
    chatService.getChatHistory(selectedFriend.friend_id === user.id ? selectedFriend.user_id : selectedFriend.friend_id)
      .then(setMessages);

    // Subscribe
    const friendId = selectedFriend.friend_id === user.id ? selectedFriend.user_id : selectedFriend.friend_id;
    const unsub = chatService.subscribeToMessages(user.id, friendId, (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return unsub;
  }, [selectedFriend?.id, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const broadcastGlobalSOS = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsSending(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          
          // Trigger broad SOS broadcast for loud alert to ALL friends
          const channel = supabase.channel(`sos_alerts`);
          await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'sos_alert',
                payload: {
                  senderId: user.id,
                  senderName: user.name,
                  type: 'manual_sos',
                  lat: latitude,
                  lng: longitude,
                  timestamp: Date.now(),
                  mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`
                  }
                });
                // Cleanup channel
                setTimeout(() => supabase.removeChannel(channel), 2000);
              }
            });
            
            // Also notify friends via chat broadcast
            await chatService.broadcastSOSToAllFriends(
              `GLOBAL EMERGENCY: I need immediate help! My live location is attached.`,
              latitude,
              longitude,
              'manual'
            );
            
            alert("Global Emergency SOS broadcasted to all safety network members!");
          } catch (error) {
            console.error('Error sending Global SOS:', error);
            alert("Failed to broadcast SOS. Please try again.");
          } finally {
            setIsSending(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert("Could not get your location. Please enable GPS and try again.");
          setIsSending(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedFriend || isSending) return;

    setIsSending(true);
    const friendId = selectedFriend.friend_id === user.id ? selectedFriend.user_id : selectedFriend.friend_id;
    const res = await chatService.sendMessage(friendId, newMessage);
    
    if (res.success) {
      if (res.fallback) {
        // Optimistic update if broadcast fallback
         const mockMsg: any = {
          id: Date.now().toString(),
          sender_id: user.id,
          receiver_id: friendId,
          content: newMessage,
          type: 'text',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, mockMsg]);
      }
      setNewMessage('');
    }
    setIsSending(false);
  };

  const sendManualSOS = async () => {
    if (!selectedFriend) return;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsSending(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const friendId = selectedFriend.friend_id === user.id ? selectedFriend.user_id : selectedFriend.friend_id;
          
          const res = await chatService.sendMessage(
            friendId, 
            `EMERGENCY SOS: I need help! My live location is attached.`, 
            'sos', 
            { lat: latitude, lng: longitude, sos_type: 'manual' }
          );

          // Trigger broad SOS broadcast as well for loud alert
          const channel = supabase.channel(`sos_alerts`);
          await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'sos_alert',
                payload: {
                  senderId: user.id,
                  senderName: user.name,
                  type: 'manual_sos',
                  lat: latitude,
                  lng: longitude,
                  timestamp: Date.now(),
                  mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`
                }
              });
              // Cleanup channel
              setTimeout(() => supabase.removeChannel(channel), 2000);
            }
          });
          
          if (res.success) {
            alert("Emergency SOS sent successfully to your friend!");
          }
        } catch (error) {
          console.error('Error sending SOS:', error);
          alert("Failed to send SOS. Please try again.");
        } finally {
          setIsSending(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert("Could not get your location. Please enable GPS and try again.");
        setIsSending(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getFriendLabel = (f: Friendship) => {
    return f.friend?.name;
  };

  const getFriendImage = (f: Friendship) => {
    const friend = f.friend || { name: '?' };
    return (
      <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-lg shrink-0">
        {friend.name.charAt(0)}
      </div>
    );
  };

  const getFriendHeaderImage = (f: Friendship) => {
    const friend = f.friend || { name: '?' };
    return (
      <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-pink font-black shrink-0">
        {friend.name.charAt(0)}
      </div>
    );
  };

  return (
    <PatientLayout user={user} noScroll>
      <div className="flex h-full glass-card overflow-hidden mx-4">
        {/* Sidebar - Friends List */}
        <div className={`w-full md:w-80 lg:w-96 bg-white/20 backdrop-blur-xl border-r border-white/30 flex flex-col h-full ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <MessageSquare className="text-brand-pink" />
              Chats
            </h1>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-pink transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search friends..." 
              className="w-full pl-12 pr-4 py-3 bg-white/40 backdrop-blur-md border border-white/30 focus:border-brand-pink/40 focus:bg-white/60 rounded-2xl font-bold text-sm outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {loading ? (
             <div className="flex justify-center p-8">
               <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : friendships.length > 0 ? (
            friendships.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFriend(f)}
                className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all ${
                  selectedFriend?.id === f.id ? 'bg-brand-pink/5 border-2 border-brand-pink/10' : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                {getFriendImage(f)}
                <div className="text-left min-w-0 flex-1">
                  <h4 className="font-black text-gray-900 truncate">{getFriendLabel(f)}</h4>
                  <p className="text-[10px] font-bold text-gray-400 truncate mt-0.5">Click to view messages</p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 italic text-sm font-bold">
              No friends to chat with.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 bg-white/10 backdrop-blur-md flex flex-col h-full relative ${!selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between bg-white/40 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedFriend(null)}
                  className="md:hidden p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                {getFriendHeaderImage(selectedFriend)}
                <div className="min-w-0">
                  <h3 className="font-black text-gray-900 truncate">{getFriendLabel(selectedFriend)}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Online
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: ['0 0 0 rgba(239, 68, 68, 0)', '0 0 20px rgba(239, 68, 68, 0.4)', '0 0 0 rgba(239, 68, 68, 0)']
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  onClick={sendManualSOS}
                  disabled={isSending}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-200"
                >
                  <Zap size={16} fill="currentColor" className="animate-pulse" />
                  ALERT SOS
                </motion.button>
                <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageSquare size={32} />
                  </div>
                  <p className="font-bold text-sm">Send a message to start chatting</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  const isSOS = msg.type === 'sos';
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {isSOS ? (
                          <div className="bg-red-600 text-white p-5 rounded-[2rem] shadow-xl shadow-red-200 border-2 border-red-500/50 space-y-4">
                            <div className="flex items-center gap-3 font-black text-sm uppercase tracking-tighter">
                              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
                                <AlertCircle size={18} />
                              </div>
                              EMERGENCY ALERT
                            </div>
                            <p className="font-bold text-sm leading-relaxed">{msg.content}</p>
                            {msg.metadata?.lat && (
                              <a 
                                href={`https://www.google.com/maps?q=${msg.metadata.lat},${msg.metadata.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-white text-red-600 py-3 px-4 rounded-2xl font-black text-xs hover:bg-red-50 transition-all"
                              >
                                <MapPin size={16} />
                                View Live Location
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-sm ${
                            isMe ? 'bg-brand-pink text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                          }`}>
                            {msg.content}
                          </div>
                        )}
                        <span className="text-[9px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 bg-white/20 backdrop-blur-xl border-t border-white/20">
              <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md p-2 rounded-[2rem] border border-white/50 focus-within:border-brand-pink/40 transition-all">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent px-4 py-2 font-bold text-sm outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="w-10 h-10 bg-brand-pink text-white rounded-full flex items-center justify-center hover:bg-brand-pink/90 transition-all disabled:opacity-50 disabled:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-white/5 p-12 text-center">
            <div className="w-24 h-24 bg-brand-pink/5 rounded-full flex items-center justify-center mb-6 text-brand-pink opacity-20">
              <MessageSquare size={48} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">My Chats</h3>
            <p className="max-w-xs font-bold text-sm text-gray-400 mb-10">Select a friend to start a conversation or view emergency updates.</p>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={broadcastGlobalSOS}
              disabled={isSending}
              className="bg-red-600 text-white px-10 py-6 rounded-[2.5rem] flex items-center gap-4 shadow-2xl shadow-red-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:animate-ping shrink-0">
                <Zap size={28} fill="currentColor" />
              </div>
              <div className="text-left relative z-10">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Network-Wide</span>
                <span className="text-2xl font-black uppercase tracking-tighter">Emergency SOS</span>
              </div>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  </PatientLayout>
);
}
