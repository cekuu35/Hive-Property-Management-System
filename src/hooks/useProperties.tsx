import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  total_units: number;
  images: string[];
  amenities: string[];
  policies_documents: any[];
  landlord_id: string;
  created_at: string;
  updated_at: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  type: string;
  rent_amount: number;
  deposit_amount: number;
  square_feet?: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  images: string[];
  amenities: string[];
  created_at: string;
  updated_at: string;
}

// Helper function to convert database records to typed objects
const mapProperty = (dbProperty: any): Property => ({
  ...dbProperty,
  images: Array.isArray(dbProperty.images) ? dbProperty.images : [],
  amenities: Array.isArray(dbProperty.amenities) ? dbProperty.amenities : [],
  policies_documents: Array.isArray(dbProperty.policies_documents) ? dbProperty.policies_documents : []
});

const mapUnit = (dbUnit: any): Unit => ({
  ...dbUnit,
  images: Array.isArray(dbUnit.images) ? dbUnit.images : [],
  amenities: Array.isArray(dbUnit.amenities) ? dbUnit.amenities : [],
  status: dbUnit.status as 'vacant' | 'occupied' | 'maintenance'
});

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchProperties();
      fetchUnits();
    }
  }, [profile?.id]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties((data || []).map(mapProperty));
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits((data || []).map(mapUnit));
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'landlord_id'> & { number_of_units?: number }) => {
    try {
      const numberOfUnits = propertyData.number_of_units || 1;
      const { number_of_units, ...propertyDataWithoutUnits } = propertyData;
      
      const { data, error } = await supabase
        .from('properties')
        .insert({
          ...propertyDataWithoutUnits,
          total_units: numberOfUnits,
          landlord_id: profile?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Create the specified number of units
      const unitPromises = Array.from({ length: numberOfUnits }, (_, index) => 
        supabase.from('units').insert({
          property_id: data.id,
          unit_number: (index + 1).toString(),
          type: 'apartment',
          rent_amount: 0,
          deposit_amount: 0,
          status: 'vacant',
          images: [],
          amenities: []
        })
      );
      
      await Promise.all(unitPromises);
      
      setProperties(prev => [mapProperty(data), ...prev]);
      
      // Refresh units to show the new ones
      fetchUnits();
      
      toast.success(`Property created successfully with ${numberOfUnits} units`);
      return data;
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
      throw error;
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    try {
      // Remove number_of_units from updates if it exists
      const { number_of_units, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('properties')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProperties(prev => prev.map(p => p.id === id ? mapProperty(data) : p));
      toast.success('Property updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Failed to update property');
      throw error;
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProperties(prev => prev.filter(p => p.id !== id));
      toast.success('Property deleted successfully');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
      throw error;
    }
  };

  const createUnit = async (unitData: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .insert(unitData)
        .select()
        .single();

      if (error) throw error;
      setUnits(prev => [mapUnit(data), ...prev]);
      
      // Update property total_units
      const propertyUnits = units.filter(u => u.property_id === unitData.property_id).length + 1;
      await updateProperty(unitData.property_id, { total_units: propertyUnits });
      
      toast.success('Unit created successfully');
      return data;
    } catch (error) {
      console.error('Error creating unit:', error);
      toast.error('Failed to create unit');
      throw error;
    }
  };

  const updateUnit = async (id: string, updates: Partial<Unit>) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setUnits(prev => prev.map(u => u.id === id ? mapUnit(data) : u));
      toast.success('Unit updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating unit:', error);
      toast.error('Failed to update unit');
      throw error;
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      const unit = units.find(u => u.id === id);
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setUnits(prev => prev.filter(u => u.id !== id));
      
      // Update property total_units
      if (unit) {
        const propertyUnits = units.filter(u => u.property_id === unit.property_id && u.id !== id).length;
        await updateProperty(unit.property_id, { total_units: propertyUnits });
      }
      
      toast.success('Unit deleted successfully');
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Failed to delete unit');
      throw error;
    }
  };

  const getPropertyUnits = (propertyId: string) => {
    const propertyUnits = units.filter(unit => unit.property_id === propertyId);
    
    // Sort units by unit number (natural sort for proper numerical ordering)
    return propertyUnits.sort((a, b) => {
      const aNum = a.unit_number;
      const bNum = b.unit_number;
      
      // Handle pure numeric unit numbers
      const aIsNumeric = /^\d+$/.test(aNum);
      const bIsNumeric = /^\d+$/.test(bNum);
      
      if (aIsNumeric && bIsNumeric) {
        return parseInt(aNum, 10) - parseInt(bNum, 10);
      }
      
      // Handle alphanumeric unit numbers (e.g., A1, B2, etc.)
      const aMatch = aNum.match(/^([A-Za-z]*)(\d+)(.*)$/);
      const bMatch = bNum.match(/^([A-Za-z]*)(\d+)(.*)$/);
      
      if (aMatch && bMatch) {
        const [, aPrefix, aNumber, aSuffix] = aMatch;
        const [, bPrefix, bNumber, bSuffix] = bMatch;
        
        // First compare prefix (A, B, C, etc.)
        if (aPrefix !== bPrefix) {
          return aPrefix.localeCompare(bPrefix);
        }
        
        // Then compare numbers
        const numDiff = parseInt(aNumber, 10) - parseInt(bNumber, 10);
        if (numDiff !== 0) {
          return numDiff;
        }
        
        // Finally compare suffix
        return aSuffix.localeCompare(bSuffix);
      }
      
      // Fallback to string comparison
      return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const getOccupancyRate = (propertyId: string) => {
    const propertyUnits = getPropertyUnits(propertyId);
    const occupiedUnits = propertyUnits.filter(unit => unit.status === 'occupied').length;
    return propertyUnits.length > 0 ? (occupiedUnits / propertyUnits.length) * 100 : 0;
  };

  return {
    properties,
    units,
    loading,
    createProperty,
    updateProperty,
    deleteProperty,
    createUnit,
    updateUnit,
    deleteUnit,
    getPropertyUnits,
    getOccupancyRate,
    refetch: () => {
      fetchProperties();
      fetchUnits();
    }
  };
};