import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'sos';
  metadata?: {
    lat?: number;
    lng?: number;
    sos_type?: string;
  };
  created_at: string;
}

export const chatService = {
  async sendMessage(receiver_id: string, content: string, type: 'text' | 'sos' = 'text', metadata?: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.from('chat_messages').insert({
      sender_id: user.id,
      receiver_id,
      content,
      type,
      metadata,
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
      console.warn('Error saving message to DB:', error.message);
      // Fallback: Realtime broadcast if table doesn't exist or fail
      const channel = supabase.channel(`chat_${receiver_id}`);
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          sender_id: user.id,
          content,
          type,
          metadata,
          created_at: new Date().toISOString()
        }
      });
      return { success: true, fallback: true };
    }

    return { success: true, data };
  },

  async broadcastSOSToAllFriends(content: string, lat: number, lng: number, sos_type: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get all accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!friendships) return;

      const friendIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);

      // 2. Send individual messages to each friend
      const promises = friendIds.map(friendId => 
        this.sendMessage(friendId, content, 'sos', { lat, lng, sos_type })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error broadcasting SOS to chat:', error);
    }
  },

  async getChatHistory(friendId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data as ChatMessage[];
  },

  subscribeToMessages(currentUserId: string, friendId: string, onMessage: (msg: ChatMessage) => void) {
    // 1. Database subscription (if table exists and has RLS enabled appropriately)
    const channel = supabase
      .channel(`chat_realtime_${currentUserId}_${friendId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages'
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if ((msg.sender_id === currentUserId && msg.receiver_id === friendId) || 
            (msg.sender_id === friendId && msg.receiver_id === currentUserId)) {
          onMessage(msg);
        }
      })
      .on('broadcast', { event: 'new_message' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        if (msg.sender_id === friendId) {
          onMessage(msg);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
