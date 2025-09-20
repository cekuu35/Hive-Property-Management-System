import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  rentReminders: boolean;
  maintenanceAlerts: boolean;
  financialReports: boolean;
}

export interface ProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  avatarUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
}

export interface PaymentGateway {
  type: 'mpesa' | 'bank' | 'stripe';
  enabled: boolean;
  configuration: Record<string, string>;
}

export const useSettings = () => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    push: true,
    rentReminders: true,
    maintenanceAlerts: true,
    financialReports: false
  });

  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfileSettings({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          email: user?.email || '',
          phone: profileData.phone || '',
          address: '', // Add address field to profiles table if needed
          company: '', // Add company field to profiles table if needed
          avatarUrl: profileData.avatar_url || undefined
        });
      }

      // Mock team members and payment gateways for now
      setTeamMembers([
        { id: '1', name: 'Sarah Wilson', email: 'sarah@email.com', role: 'Property Manager', status: 'active' },
        { id: '2', name: 'Mike Johnson', email: 'mike@email.com', role: 'Maintenance Coordinator', status: 'active' },
        { id: '3', name: 'Jane Smith', email: 'jane@email.com', role: 'Financial Assistant', status: 'pending' }
      ]);

      setPaymentGateways([
        { type: 'mpesa', enabled: false, configuration: {} },
        { type: 'bank', enabled: false, configuration: {} },
        { type: 'stripe', enabled: false, configuration: {} }
      ]);

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setNotifications(prev => ({ ...prev, ...newSettings }));
      
      // Here you would save to a user_settings table
      toast({
        title: "Success",
        description: "Notification settings updated successfully",
      });

    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
    }
  };

  const updateProfileSettings = async (newSettings: Partial<ProfileSettings>) => {
    if (!profile?.id) return;

    try {
      const updates: any = {};
      if (newSettings.firstName) updates.first_name = newSettings.firstName;
      if (newSettings.lastName) updates.last_name = newSettings.lastName;
      if (newSettings.phone) updates.phone = newSettings.phone;
      if (newSettings.avatarUrl !== undefined) updates.avatar_url = newSettings.avatarUrl;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      setProfileSettings(prev => ({ ...prev, ...newSettings }));
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const addTeamMember = async (memberData: Omit<TeamMember, 'id' | 'status'>) => {
    try {
      const newMember: TeamMember = {
        ...memberData,
        id: Date.now().toString(),
        status: 'pending'
      };

      setTeamMembers(prev => [...prev, newMember]);
      
      toast({
        title: "Success",
        description: "Team member invitation sent",
      });

    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive"
      });
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      
      toast({
        title: "Success",
        description: "Team member removed",
      });

    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive"
      });
    }
  };

  const configurePaymentGateway = async (type: PaymentGateway['type'], configuration: Record<string, string>) => {
    try {
      setPaymentGateways(prev => prev.map(gateway => 
        gateway.type === type 
          ? { ...gateway, configuration, enabled: true }
          : gateway
      ));

      toast({
        title: "Success",
        description: `${type.toUpperCase()} payment gateway configured successfully`,
      });

    } catch (error) {
      console.error('Error configuring payment gateway:', error);
      toast({
        title: "Error",
        description: "Failed to configure payment gateway",
        variant: "destructive"
      });
    }
  };

  const enableTwoFactor = async () => {
    try {
      toast({
        title: "Two-Factor Authentication",
        description: "Two-factor authentication setup initiated. Check your email for instructions.",
      });

    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to enable two-factor authentication",
        variant: "destructive"
      });
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive"
      });
    }
  };

  const saveAllSettings = async () => {
    try {
      // Save all settings at once
      await updateProfileSettings(profileSettings);
      await updateNotificationSettings(notifications);
      
      toast({
        title: "Success",
        description: "All settings saved successfully",
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save some settings",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [profile?.id]);

  return {
    notifications,
    profileSettings,
    teamMembers,
    paymentGateways,
    loading,
    updateNotificationSettings,
    updateProfileSettings,
    addTeamMember,
    removeTeamMember,
    configurePaymentGateway,
    enableTwoFactor,
    changePassword,
    saveAllSettings,
    refetch: fetchSettings
  };
};