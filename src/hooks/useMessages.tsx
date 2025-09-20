import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  unit_id?: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: string;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: string;
  };
  property?: {
    name: string;
  };
  unit?: {
    unit_number: string;
  };
}

export interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_role: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  property_name?: string;
  unit_number?: string;
}

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchMessages = async () => {
    if (!profile?.id) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set([
        ...(messagesData || []).map(m => m.sender_id),
        ...(messagesData || []).map(m => m.receiver_id),
      ])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const enrichedMessages = (messagesData || []).map(message => ({
        ...message,
        sender: profilesMap.get(message.sender_id),
        receiver: profilesMap.get(message.receiver_id),
      }));

      setMessages(enrichedMessages as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const fetchConversations = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set([
        ...(messagesData || []).map(m => m.sender_id),
        ...(messagesData || []).map(m => m.receiver_id),
      ])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();
      
      (messagesData || []).forEach((message: any) => {
        const isFromCurrentUser = message.sender_id === profile.id;
        const participantId = isFromCurrentUser ? message.receiver_id : message.sender_id;
        const participant = profilesMap.get(participantId);
        
        if (!participant) return;
        
        const existing = conversationMap.get(participantId);
        
        if (!existing || new Date(message.created_at) > new Date(existing.last_message_time)) {
          conversationMap.set(participantId, {
            participant_id: participantId,
            participant_name: `${participant.first_name} ${participant.last_name}`,
            participant_role: participant.role,
            participant_avatar: participant.avatar_url,
            last_message: message.message,
            last_message_time: message.created_at,
            unread_count: 0,
          });
        }
      });

      // Calculate unread counts
      for (const [participantId, conversation] of conversationMap) {
        const unreadCount = (messagesData || []).filter(
          (msg: any) => 
            msg.sender_id === participantId && 
            msg.receiver_id === profile.id && 
            !msg.read
        ).length;
        
        conversation.unread_count = unreadCount;
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (receiverId: string, message: string, propertyId?: string, unitId?: string) => {
    if (!profile?.id) return false;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          receiver_id: receiverId,
          message,
          property_id: propertyId,
          unit_id: unitId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Message sent successfully!');
      await fetchMessages();
      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);

      if (error) throw error;
      
      await fetchMessages();
      await fetchConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getConversationMessages = (participantId: string) => {
    return messages.filter(
      msg => 
        (msg.sender_id === profile?.id && msg.receiver_id === participantId) ||
        (msg.sender_id === participantId && msg.receiver_id === profile?.id)
    );
  };

  const getLandlordForTenant = async () => {
    if (!profile?.id || profile.role !== 'tenant') return null;

    try {
      // Attempt 1: Lease references profile.id directly
      const { data: leaseData1, error: leaseError1 } = await supabase
        .from('leases')
        .select(`
          units (
            properties (
              landlord_id,
              profiles!properties_landlord_id_fkey (
                id,
                first_name,
                last_name,
                avatar_url,
                role
              )
            )
          )
        `)
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .limit(1);

      if (leaseError1) throw leaseError1;

      let landlordProfile = leaseData1?.[0]?.units?.properties?.profiles;

      // Attempt 2: Resolve via tenant_info.profile_id → leases.tenant_info_id
      if (!landlordProfile) {
        const { data: tinfo, error: tinfoError } = await supabase
          .from('tenant_info')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();
        if (tinfoError) throw tinfoError;

        if (tinfo?.id) {
          const { data: leaseData2, error: leaseError2 } = await supabase
            .from('leases')
            .select(`
              units (
                properties (
                  landlord_id,
                  profiles!properties_landlord_id_fkey (
                    id,
                    first_name,
                    last_name,
                    avatar_url,
                    role
                  )
                )
              )
            `)
            .eq('tenant_info_id', tinfo.id)
            .eq('status', 'active')
            .limit(1);
          if (leaseError2) throw leaseError2;
          landlordProfile = leaseData2?.[0]?.units?.properties?.profiles;
        }
      }

      return landlordProfile || null;
    } catch (error) {
      console.error('Error finding landlord:', error);
      return null;
    }
  };

  const getTenantsForLandlord = async () => {
    if (!profile?.id || profile.role !== 'landlord') return [];

    try {
      // Get tenant IDs from leases
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('tenant_id')
        .eq('status', 'active');

      if (leaseError) throw leaseError;

      const tenantIds = (leaseData || []).map(lease => lease.tenant_id);

      if (tenantIds.length === 0) return [];

      // Get tenant profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', tenantIds);

      if (profileError) throw profileError;

      return profileData || [];
    } catch (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchMessages();
      fetchConversations();

      // Set up real-time subscription
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(sender_id.eq.${profile.id},receiver_id.eq.${profile.id})`,
          },
          () => {
            fetchMessages();
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    markAsRead,
    getConversationMessages,
    getLandlordForTenant,
    getTenantsForLandlord,
    refetch: () => {
      fetchMessages();
      fetchConversations();
    },
  };
};