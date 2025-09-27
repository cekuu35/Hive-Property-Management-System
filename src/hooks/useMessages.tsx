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

      // For tenants, ensure their landlord appears in conversations even without messages
      if (profile.role === 'tenant') {
        const landlord = await getLandlordForTenant();
        if (landlord && !conversationMap.has(landlord.id)) {
          conversationMap.set(landlord.id, {
            participant_id: landlord.id,
            participant_name: `${landlord.first_name} ${landlord.last_name}`,
            participant_role: landlord.role,
            participant_avatar: landlord.avatar_url,
            last_message: 'No messages yet',
            last_message_time: new Date().toISOString(),
            unread_count: 0,
            property_name: landlord.property_name,
            unit_number: landlord.unit_number,
          });
        }
      }

      // For landlords, ensure approved tenants appear in conversations even without messages
      if (profile.role === 'landlord') {
        const tenants = await getTenantsForLandlord();
        tenants.forEach(tenant => {
          if (!conversationMap.has(tenant.id)) {
            conversationMap.set(tenant.id, {
              participant_id: tenant.id,
              participant_name: `${tenant.first_name} ${tenant.last_name}`,
              participant_role: tenant.role,
              participant_avatar: tenant.avatar_url,
              last_message: 'No messages yet',
              last_message_time: new Date().toISOString(),
              unread_count: 0,
              property_name: tenant.property_name,
              unit_number: tenant.unit_number,
            });
          }
        });
      }

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
      // For tenants messaging landlords, try to get property and unit info
      if (profile.role === 'tenant' && !propertyId) {
        const landlord = await getLandlordForTenant();
        if (landlord?.property_name) {
          // Get property and unit IDs from the landlord's info
          const { data: propertyData } = await supabase
            .from('properties')
            .select('id')
            .eq('landlord_id', receiverId)
            .eq('name', landlord.property_name)
            .single();
          
          if (propertyData) {
            propertyId = propertyData.id;
            
            if (landlord.unit_number) {
              const { data: unitData } = await supabase
                .from('units')
                .select('id')
                .eq('property_id', propertyId)
                .eq('unit_number', landlord.unit_number)
                .single();
              
              if (unitData) {
                unitId = unitData.id;
              }
            }
          }
        }
      }

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
      // Method 1: Find landlord through approved unit application
      const { data: applicationData, error: applicationError } = await supabase
        .from('unit_applications')
        .select(`
          id,
          status,
          reviewed_by,
          property_id,
          unit_id,
          units!inner(
            unit_number,
            properties!inner(
              name,
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
        .eq('status', 'approved')
        .limit(1);

      if (applicationError) throw applicationError;

      if (applicationData && applicationData.length > 0) {
        const application = applicationData[0];
        const landlordProfile = application.units.properties.profiles;
        const property = application.units.properties;
        const unit = application.units;

        return {
          ...landlordProfile,
          property_name: property?.name,
          unit_number: unit?.unit_number
        };
      }

      // Method 2: Find landlord through active lease
      const { data: leaseData, error: leaseError } = await supabase
            .from('leases')
            .select(`
          units!inner(
            unit_number,
            properties!inner(
              name,
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
        .or(`tenant_id.eq.${profile.id},tenant_info_id.in.(
          SELECT id FROM tenant_info WHERE profile_id = '${profile.id}'
        )`)
            .eq('status', 'active')
            .limit(1);

      if (leaseError) throw leaseError;

      if (leaseData && leaseData.length > 0) {
        const landlordProfile = leaseData[0].units.properties.profiles;
        const property = leaseData[0].units.properties;
        const unit = leaseData[0].units;

        return {
          ...landlordProfile,
          property_name: property?.name,
          unit_number: unit?.unit_number
        };
      }

      // Method 3: Find landlord through property ownership (fallback)
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          landlord_id,
          profiles!properties_landlord_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .limit(1);

      if (propertyError) throw propertyError;

      if (propertyData && propertyData.length > 0) {
        const landlordProfile = propertyData[0].profiles;
        return {
          ...landlordProfile,
          property_name: propertyData[0].name
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding landlord:', error);
      return null;
    }
  };

  const getTenantsForLandlord = async () => {
    if (!profile?.id || profile.role !== 'landlord') return [];

    try {
      // Method 1: Get tenants from approved applications
      const { data: applicationData, error: applicationError } = await supabase
        .from('unit_applications')
        .select(`
          tenant_id,
          status,
          units!inner(
            unit_number,
            properties!inner(
              name,
              landlord_id
            )
          ),
          profiles!unit_applications_tenant_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'approved')
        .eq('units.properties.landlord_id', profile.id);

      if (applicationError) throw applicationError;

      const applicationTenants = (applicationData || []).map(app => {
        const tenant = app.profiles;
        const unit = app.units;
        const property = unit.properties;
        
        return {
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          avatar_url: tenant.avatar_url,
          role: tenant.role,
          property_name: property?.name,
          unit_number: unit?.unit_number
        };
      });

      // Method 2: Get tenants from active leases
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          tenant_id,
          units!inner(
            properties!inner(
              landlord_id
            )
          )
        `)
        .eq('status', 'active')
        .eq('units.properties.landlord_id', profile.id);

      if (leaseError) throw leaseError;

      const leaseTenantIds = (leaseData || []).map(lease => lease.tenant_id);

      // Get tenant profiles with property and unit info from leases
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          avatar_url, 
          role,
          leases!inner(
            units!inner(
              unit_number,
              properties!inner(
                name,
                landlord_id
              )
            )
          )
        `)
        .in('id', leaseTenantIds)
        .eq('leases.status', 'active')
        .eq('leases.units.properties.landlord_id', profile.id);

      if (profileError) throw profileError;

      const leaseTenants = (profileData || []).map(tenant => {
        const lease = tenant.leases?.[0];
        const unit = lease?.units;
        const property = unit?.properties;
        
        return {
          id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          avatar_url: tenant.avatar_url,
          role: tenant.role,
          property_name: property?.name,
          unit_number: unit?.unit_number
        };
      });

      // Combine and deduplicate tenants
      const allTenants = [...applicationTenants, ...leaseTenants];
      const uniqueTenants = allTenants.filter((tenant, index, self) => 
        index === self.findIndex(t => t.id === tenant.id)
      );

      return uniqueTenants;
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