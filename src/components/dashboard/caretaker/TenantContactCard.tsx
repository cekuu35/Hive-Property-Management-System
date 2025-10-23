import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, User, MessageSquare } from 'lucide-react';

interface TenantContactCardProps {
  tenant: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  unit?: {
    unit_number: string;
    property?: {
      name: string;
    };
  };
  compact?: boolean;
}

export const TenantContactCard = ({ tenant, unit, compact = false }: TenantContactCardProps) => {
  const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown Tenant';

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const sendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const sendSMS = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{fullName}</span>
        </div>
        {unit && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{unit.property?.name} - Unit {unit.unit_number}</span>
          </div>
        )}
        <div className="flex gap-2">
          {tenant.phone && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => makeCall(tenant.phone!)}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          )}
          {tenant.email && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => sendEmail(tenant.email!)}
            >
              <Mail className="h-3 w-3 mr-1" />
              Email
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tenant Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Name</label>
          <p className="font-medium">{fullName}</p>
        </div>

        {unit && (
          <div>
            <label className="text-sm text-muted-foreground">Unit</label>
            <p className="font-medium">
              {unit.property?.name} - Unit {unit.unit_number}
            </p>
          </div>
        )}

        {tenant.phone && (
          <div>
            <label className="text-sm text-muted-foreground">Phone</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-medium">{tenant.phone}</p>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => makeCall(tenant.phone!)}
                  title="Call"
                >
                  <Phone className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendSMS(tenant.phone!)}
                  title="SMS"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {tenant.email && (
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-medium text-sm">{tenant.email}</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => sendEmail(tenant.email!)}
                title="Email"
              >
                <Mail className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {!tenant.phone && !tenant.email && (
          <div className="text-sm text-muted-foreground italic">
            No contact information available
          </div>
        )}
      </CardContent>
    </Card>
  );
};




