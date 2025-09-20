import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  last_restocked: string | null;
  property_id: string | null;
  caretaker_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateInventoryItem {
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  property_id?: string;
}

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchInventory = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('caretaker_id', profile.id)
        .order('name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async (itemData: CreateInventoryItem) => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert({
          ...itemData,
          caretaker_id: profile.id,
          last_restocked: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      setInventory(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Inventory item added successfully"
      });
      return data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<CreateInventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setInventory(prev => prev.map(item => item.id === id ? data : item));
      toast({
        title: "Success",
        description: "Inventory item updated successfully"
      });
      return data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const adjustStock = async (id: string, adjustment: number, type: 'add' | 'remove') => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newStock = type === 'add' 
      ? item.current_stock + adjustment
      : Math.max(0, item.current_stock - adjustment);

    const updates: any = { current_stock: newStock };
    if (type === 'add') {
      updates.last_restocked = new Date().toISOString().split('T')[0];
    }

    return updateInventoryItem(id, updates);
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Inventory item deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum * 0.5) return 'critical';
    if (current <= minimum) return 'low';
    if (current <= minimum * 1.5) return 'medium';
    return 'good';
  };

  const getLowStockItems = () => {
    return inventory.filter(item => 
      getStockStatus(item.current_stock, item.minimum_stock) === 'low' ||
      getStockStatus(item.current_stock, item.minimum_stock) === 'critical'
    );
  };

  useEffect(() => {
    if (profile?.id && profile.role === 'caretaker') {
      fetchInventory();
    }
  }, [profile?.id, profile?.role]);

  return {
    inventory,
    loading,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    deleteInventoryItem,
    getStockStatus,
    getLowStockItems,
    refetch: fetchInventory
  };
};