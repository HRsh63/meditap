import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Check, 
  X, 
  Phone, 
  ShieldCheck,
  UserCheck,
  Clock,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { friendService, FriendProfile, Friendship } from '../services/friendService';
import { User } from '../types';
import PatientLayout from '../components/PatientLayout';

interface FriendsProps {
  user: User;
}

export default function Friends({ user }: FriendsProps) {
  const [activeTab, setActiveTab] = useState<'my-friends' | 'search' | 'requests'>('my-friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch friends list on load
  const fetchFriends = async () => {
    setLoading(true);
    const data = await friendService.getFriends();
    setFriendships(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  // Handle User Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 3) {
        setLoading(true);
        const data = await friendService.searchUsers(searchQuery);
        setSearchResults(data);
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSendRequest = async (friendId: string) => {
    const result = await friendService.sendFriendRequest(friendId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Friend request sent!' });
      fetchFriends();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send request' });
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const result = await friendService.acceptFriendRequest(friendshipId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Friend request accepted!' });
      fetchFriends();
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      const result = await friendService.removeFriend(friendshipId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Friend removed' });
        fetchFriends();
      }
    }
  };

  const myFriends = friendships.filter(f => f.status === 'accepted');
  const pendingRequests = friendships.filter(f => f.status === 'pending' && f.friend_id === user.id);
  const sentRequests = friendships.filter(f => f.status === 'pending' && f.user_id === user.id);

  return (
    <PatientLayout user={user}>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-10">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-brand-pink" size={32} />
            Safety Network
          </h1>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
              <span className="font-bold text-sm">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/40">
          {[
            { id: 'my-friends', label: 'My Friends', count: myFriends.length },
            { id: 'search', label: 'Search Users', count: null },
            { id: 'requests', label: 'Requests', count: pendingRequests.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-sm border border-white/50' 
                  : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="bg-brand-pink text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'my-friends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myFriends.length > 0 ? (
                myFriends.map((friendship) => (
                  <motion.div 
                    layout
                    key={friendship.id}
                    className="p-5 glass-card flex items-center gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-2xl shrink-0">
                      {friendship.friend?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 truncate">{friendship.friend?.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-1">
                        <Phone size={12} />
                        {friendship.friend?.phone || 'No phone'}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveFriend(friendship.id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all"
                      title="Remove Friend"
                    >
                      <UserMinus size={20} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-400 space-y-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <UserCheck size={40} />
                  </div>
                  <p className="font-bold">No friends yet. Go explore!</p>
                  <button 
                    onClick={() => setActiveTab('search')}
                    className="text-brand-pink font-black text-sm underline underline-offset-4"
                  >
                    Find people you know
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-pink transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-white/40 backdrop-blur-md border border-white/50 focus:border-brand-pink/40 focus:bg-white/60 rounded-[2rem] font-bold text-gray-900 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Bulk Action for Demo */}
              <div className="flex justify-end">
                <button 
                  onClick={async () => {
                    if (window.confirm('This will connect all registered users as friends. Continue?')) {
                      setLoading(true);
                      const res = await friendService.autoConnectAllUsers();
                      if (res.success) {
                        setMessage({ type: 'success', text: `Success! Connected all ${res.total || ''} user pairs.` });
                        fetchFriends();
                      } else {
                        setMessage({ type: 'error', text: res.error || 'Failed to auto-connect' });
                      }
                      setLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 text-xs font-black text-brand-pink bg-brand-pink/5 px-4 py-2 rounded-full hover:bg-brand-pink/10 transition-colors"
                >
                  <Users size={14} />
                  Auto-Connect All Users (Demo Mode)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.length > 0 ? (
                  searchResults.map((userProfile) => {
                    const existingFriendship = friendships.find(f => f.friend_id === userProfile.id || f.user_id === userProfile.id);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={userProfile.id}
                        className="p-5 glass-card flex items-center gap-4"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-2xl shrink-0">
                          {userProfile.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 truncate">{userProfile.name}</h4>
                          <p className="text-xs font-bold text-gray-400 mt-1">{userProfile.phone}</p>
                        </div>
                        
                        {existingFriendship ? (
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            existingFriendship.status === 'accepted' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {existingFriendship.status === 'accepted' ? 'Friend' : 'Pending'}
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleSendRequest(userProfile.id)}
                            className="p-3 bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 rounded-2xl transition-all"
                            title="Add Friend"
                          >
                            <UserPlus size={20} />
                          </button>
                        )}
                      </motion.div>
                    );
                  })
                ) : searchQuery.length >= 3 && !loading ? (
                  <div className="col-span-full py-12 text-center text-gray-400 font-bold">
                    No users found matching "{searchQuery}"
                  </div>
                ) : null}
                
                {loading && (
                  <div className="col-span-full py-12 flex justify-center">
                    <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-8">
              {/* Incoming Requests */}
              <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <ShieldCheck className="text-brand-pink" size={18} />
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Incoming Requests</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((req) => (
                      <motion.div 
                        layout
                        key={req.id}
                        className="p-5 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-brand-pink/20 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-2xl shrink-0">
                            {req.friend?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-gray-900 truncate">{req.friend?.name}</h4>
                            <p className="text-xs font-bold text-gray-400 mt-1">Wants to be friends</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAcceptRequest(req.id)}
                              className="p-3 bg-green-500 text-white hover:bg-green-600 rounded-2xl transition-all shadow-lg shadow-green-200"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => handleRemoveFriend(req.id)}
                              className="p-3 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-gray-400 text-sm font-bold bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                      No incoming requests
                    </div>
                  )}
                </div>
              </section>

              {/* Sent Requests */}
              <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Clock className="text-gray-400" size={18} />
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Sent Requests</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentRequests.length > 0 ? (
                    sentRequests.map((req) => (
                      <div 
                        key={req.id}
                        className="p-5 bg-gray-50 border-2 border-transparent rounded-[2rem]"
                      >
                        <div className="flex items-center gap-4 opacity-60">
                          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand-pink font-black text-2xl shrink-0">
                            {req.friend?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0 text-gray-900">
                            <h4 className="font-black truncate">{req.friend?.name}</h4>
                            <p className="text-xs font-bold mt-1">Pending approval</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveFriend(req.id)}
                            className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                            title="Cancel Request"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-gray-400 text-sm font-bold">
                      No sent requests pending
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </PatientLayout>
  );
}
