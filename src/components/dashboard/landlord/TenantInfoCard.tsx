import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Home, MessageCircle, User } from 'lucide-react';
import { useTenantInfoForLandlord } from '@/hooks/useTenantInfoForLandlord';
import { Loader2 } from 'lucide-react';

interface TenantInfoCardProps {
  tenantId?: string;
  showAll?: boolean;
}

export const TenantInfoCard = ({ tenantId, showAll = false }: TenantInfoCardProps) => {
  const { tenants, loading, error } = useTenantInfoForLandlord();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading tenant information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tenants.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p>{error || 'No tenant information available'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTenants = tenantId 
    ? tenants.filter(t => t.id === tenantId)
    : showAll ? tenants : tenants.slice(0, 3);

  if (displayTenants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p>No tenants found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {showAll ? 'All Tenants' : 'Your Tenants'}
        </CardTitle>
        <CardDescription>
          {showAll ? 'Complete list of your tenants' : 'Recent tenant information'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayTenants.map((tenant) => (
          <div key={tenant.id} className="flex items-center gap-4 p-3 border rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.avatar_url || undefined} />
              <AvatarFallback>
                {tenant.first_name?.[0]}{tenant.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">
                {tenant.first_name} {tenant.last_name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-3 w-3" />
                <span className="truncate">
                  {tenant.property_name} - Unit {tenant.unit_number}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                {tenant.email && (
                  <div className="flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-32">{tenant.email}</span>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center gap-1 text-xs">
                    <Phone className="h-3 w-3" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {!showAll && tenants.length > 3 && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm">
              View All Tenants ({tenants.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
