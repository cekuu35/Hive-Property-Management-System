import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  property_id: string;
  property_name?: string;
  item_name: string;
  category: 'tools' | 'cleaning' | 'plumbing' | 'electrical' | 'paint' | 'hardware' | 'safety' | 'other';
  current_stock: number;
  minimum_stock: number;
  unit: string;
  location?: string;
  supplier?: string;
  cost_per_unit?: number;
  last_restocked_at?: string;
  notes?: string;
  stock_status: 'low' | 'medium' | 'good';
}

export const usePropertyInventory = (propertyId?: string | null) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const getStockStatus = (current: number, minimum: number): 'low' | 'medium' | 'good' => {
    if (current <= minimum) return 'low';
    if (current <= minimum * 1.5) return 'medium';
    return 'good';
  };

  const fetchInventory = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('property_inventory')
        .select(`
          *,
          property:properties(name)
        `)
        .order('item_name', { ascending: true });

      // Filter by property if provided
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else if (profile.role === 'caretaker' || profile.role === 'security') {
        // Get assigned properties
        const { data: assignments } = await supabase
          .from('staff_assignments')
          .select('property_id')
          .eq('staff_id', profile.id)
          .eq('role', profile.role)
          .eq('is_active', true);

        if (assignments && assignments.length > 0) {
          const propertyIds = assignments.map(a => a.property_id);
          query = query.in('property_id', propertyIds);
        } else {
          // No assignments, return empty
          setInventory([]);
          return;
        }
      } else if (profile.role === 'landlord') {
        // Get landlord's properties
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', profile.id);

        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          query = query.in('property_id', propertyIds);
        } else {
          setInventory([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        if (error.message.includes('relation "public.property_inventory" does not exist')) {
          toast({
            title: "Feature Not Available",
            description: "Inventory management requires database setup. Contact your administrator.",
            variant: "default"
          });
          setInventory([]);
          return;
        }
        throw error;
      }

      const formattedInventory: InventoryItem[] = (data || []).map((item: any) => ({
        ...item,
        property_name: item.property?.name,
        stock_status: getStockStatus(item.current_stock, item.minimum_stock)
      }));

      setInventory(formattedInventory);

    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (itemId: string, newStock: number) => {
    try {
      // Use admin client with service role key for write operations
      const { error } = await supabaseAdmin
        .from('property_inventory')
        .update({
          current_stock: newStock,
          last_restocked_at: newStock > 0 ? new Date().toISOString() : undefined,
          last_restocked_by: profile?.id
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Stock updated successfully",
      });

      await fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive"
      });
    }
  };

  const updateInventoryItem = async (itemId: string, updates: Partial<Omit<InventoryItem, 'id' | 'stock_status' | 'property_name' | 'property_id'>>) => {
    try {
      // Use admin client with service role key for write operations
      const { error } = await supabaseAdmin
        .from('property_inventory')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item updated successfully",
      });

      await fetchInventory();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'stock_status' | 'property_name'>) => {
    try {
      // Use admin client with service role key for write operations
      const { error } = await supabaseAdmin
        .from('property_inventory')
        .insert([item]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to inventory",
      });

      await fetchInventory();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    try {
      // Use admin client with service role key for write operations
      const { error } = await supabaseAdmin
        .from('property_inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item removed from inventory",
      });

      await fetchInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const getLowStockItems = () => {
    return inventory.filter(item => item.stock_status === 'low');
  };

  const getStats = () => {
    return {
      total_items: inventory.length,
      low_stock_items: inventory.filter(i => i.stock_status === 'low').length,
      total_value: inventory.reduce((sum, i) => sum + (i.current_stock * (i.cost_per_unit || 0)), 0),
      categories: Array.from(new Set(inventory.map(i => i.category))).length
    };
  };

  useEffect(() => {
    fetchInventory();
  }, [profile?.id, propertyId]);

  return {
    inventory,
    loading,
    updateStock,
    updateInventoryItem,
    addInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    getStats,
    refreshInventory: fetchInventory
  };
};

