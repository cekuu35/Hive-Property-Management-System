import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SearchResult {
  id: string;
  type: 'property' | 'tenant' | 'request' | 'unit';
  title: string;
  subtitle: string;
  description?: string;
  url?: string;
  metadata?: any;
}

export const useSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const debouncedQuery = useMemo(() => {
    const handler = setTimeout(() => query, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!user || !profile || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search properties (for landlords)
      if (profile.role === 'landlord') {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name, address, description')
          .eq('landlord_id', profile.id)
          .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

        properties?.forEach(property => {
          searchResults.push({
            id: property.id,
            type: 'property',
            title: property.name,
            subtitle: property.address,
            description: property.description,
            url: '/dashboard?section=properties',
            metadata: property
          });
        });

        // Search units
        const { data: units } = await supabase
          .from('units')
          .select(`
            id, unit_number, type, rent_amount,
            properties!inner(id, name, landlord_id)
          `)
          .eq('properties.landlord_id', profile.id)
          .or(`unit_number.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%`);

        units?.forEach(unit => {
          searchResults.push({
            id: unit.id,
            type: 'unit',
            title: `Unit ${unit.unit_number}`,
            subtitle: `${unit.type} - $${unit.rent_amount}`,
            description: (unit.properties as any)?.name,
            url: '/dashboard?section=properties',
            metadata: unit
          });
        });

        // Search tenant info
        const { data: tenants } = await supabase
          .from('tenant_info')
          .select('id, first_name, last_name, email, phone')
          .eq('landlord_id', profile.id)
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

        tenants?.forEach(tenant => {
          searchResults.push({
            id: tenant.id,
            type: 'tenant',
            title: `${tenant.first_name} ${tenant.last_name}`,
            subtitle: tenant.email,
            description: tenant.phone,
            url: '/dashboard?section=tenants',
            metadata: tenant
          });
        });
      }

      // Search maintenance requests (for all roles)
      let maintenanceQuery = supabase
        .from('maintenance_requests')
        .select(`
          id, title, description, category, status, priority,
          units!inner(
            id, unit_number,
            properties!inner(id, name, landlord_id)
          )
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);

      if (profile.role === 'landlord') {
        maintenanceQuery = maintenanceQuery.eq('units.properties.landlord_id', profile.id);
      } else if (profile.role === 'tenant') {
        maintenanceQuery = maintenanceQuery.eq('tenant_id', profile.id);
      }

      const { data: requests } = await maintenanceQuery;

      requests?.forEach(request => {
        const unit = request.units as any;
        searchResults.push({
          id: request.id,
          type: 'request',
          title: request.title,
          subtitle: `${request.category} - ${request.status}`,
          description: `Unit ${unit?.unit_number} - ${request.description?.substring(0, 50)}...`,
          url: '/dashboard?section=maintenance',
          metadata: request
        });
      });

      setResults(searchResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query.trim());
    } else {
      setResults([]);
    }
  }, [query, user, profile]);

  return {
    results,
    loading,
    hasResults: results.length > 0,
  };
};