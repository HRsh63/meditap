import { supabase } from '../lib/supabase';

export interface FriendProfile {
  id: string;
  name: string;
  phone: string;
  profile_image?: string;
  username?: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  friend?: FriendProfile; // Populated Profile
}

class FriendService {
  /**
   * Search for users by name or phone number
   */
  async searchUsers(query: string): Promise<FriendProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, profile_image')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .neq('id', user.id) // Don't find yourself
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(friendId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get all friends (accepted or pending)
   */
  async getFriends(): Promise<Friendship[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // We need to fetch where user is either sender or receiver
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        sender:profiles!user_id(id, name, phone, profile_image),
        receiver:profiles!friend_id(id, name, phone, profile_image)
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }

    // Map the results to determine the "friend" in the relationship
    return (data || []).map(item => {
      const isSender = item.user_id === user.id;
      return {
        ...item,
        friend: isSender ? item.receiver : item.sender
      };
    });
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Remove a friend or decline a request
   */
  async removeFriend(friendshipId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Auto-connect all users (Testing/Demo Utility)
   */
  async autoConnectAllUsers(): Promise<{ success: boolean; total?: number; error?: string }> {
    try {
      const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('id');
      
      if (fetchError) throw fetchError;
      if (!users || users.length < 2) return { success: true, total: 0 };

      const friendshipsToCreate = [];
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          friendshipsToCreate.push({
            user_id: users[i].id,
            friend_id: users[j].id,
            status: 'accepted'
          });
        }
      }

      // Upsert to handle existing friendships
      const { error: insertError } = await supabase
        .from('friendships')
        .upsert(friendshipsToCreate, { onConflict: 'user_id,friend_id' });

      if (insertError) throw insertError;

      return { success: true, total: friendshipsToCreate.length };
    } catch (error: any) {
      console.error('Error auto-connecting users:', error);
      return { success: false, error: error.message };
    }
  }
}

export const friendService = new FriendService();
