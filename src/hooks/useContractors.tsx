import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Contractor {
  id: string;
  landlord_id: string;
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  address?: string;
  rating: number;
  rating_count: number;
  hourly_rate?: number;
  description?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContractorData {
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  address?: string;
  hourly_rate?: number;
  description?: string;
}

export interface UpdateContractorData {
  name?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
  hourly_rate?: number;
  description?: string;
  is_active?: boolean;
}

export const useContractors = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchContractors = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContractors(data || []);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contractors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createContractor = async (contractorData: CreateContractorData): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const { data, error } = await supabase
        .from('contractors')
        .insert({
          landlord_id: profile.id,
          ...contractorData
        })
        .select()
        .single();

      if (error) throw error;

      setContractors(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Contractor created successfully"
      });

      return true;
    } catch (error) {
      console.error('Error creating contractor:', error);
      toast({
        title: "Error",
        description: "Failed to create contractor",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateContractor = async (id: string, updates: UpdateContractorData): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContractors(prev => 
        prev.map(contractor => 
          contractor.id === id ? data : contractor
        )
      );

      toast({
        title: "Success",
        description: "Contractor updated successfully"
      });

      return true;
    } catch (error) {
      console.error('Error updating contractor:', error);
      toast({
        title: "Error",
        description: "Failed to update contractor",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteContractor = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContractors(prev => prev.filter(contractor => contractor.id !== id));

      toast({
        title: "Success",
        description: "Contractor deleted successfully"
      });

      return true;
    } catch (error) {
      console.error('Error deleting contractor:', error);
      toast({
        title: "Error",
        description: "Failed to delete contractor",
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleContractorStatus = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateContractor(id, { is_active: isActive });
  };

  const updateRating = async (id: string, newRating: number): Promise<boolean> => {
    const contractor = contractors.find(c => c.id === id);
    if (!contractor) return false;

    const newRatingCount = contractor.rating_count + 1;
    const newAverageRating = ((contractor.rating * contractor.rating_count) + newRating) / newRatingCount;

    return updateContractor(id, {
      rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal place
      rating_count: newRatingCount
    });
  };

  const getActiveContractors = () => {
    return contractors.filter(contractor => contractor.is_active);
  };

  const getContractorsBySpecialty = (specialty: string) => {
    return contractors.filter(contractor => 
      contractor.specialty.toLowerCase().includes(specialty.toLowerCase()) && 
      contractor.is_active
    );
  };

  useEffect(() => {
    fetchContractors();
  }, [profile?.id]);

  return {
    contractors,
    loading,
    createContractor,
    updateContractor,
    deleteContractor,
    toggleContractorStatus,
    updateRating,
    getActiveContractors,
    getContractorsBySpecialty,
    refetch: fetchContractors
  };
};
