import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Building, MessageCircle } from 'lucide-react';
import { useLandlordInfo } from '@/hooks/useLandlordInfo';
import { Loader2 } from 'lucide-react';

interface LandlordInfoCardProps {
  onSendMessage?: () => void;
}

export const LandlordInfoCard = ({ onSendMessage }: LandlordInfoCardProps = {}) => {
  const { landlordInfo, loading, error } = useLandlordInfo();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading landlord information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !landlordInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Building className="h-8 w-8 mx-auto mb-2" />
            <p>{error || 'No landlord information available'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Your Landlord
        </CardTitle>
        <CardDescription>
          Contact information for your property manager
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={landlordInfo.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {landlordInfo.first_name?.[0]}{landlordInfo.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {landlordInfo.first_name} {landlordInfo.last_name}
            </h3>
            {landlordInfo.company_name && (
              <Badge variant="secondary" className="mt-1">
                {landlordInfo.company_name}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {landlordInfo.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{landlordInfo.email}</span>
            </div>
          )}
          {landlordInfo.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{landlordInfo.phone}</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => {
              console.log('🔍 [LandlordInfoCard] Send Message button clicked');
              if (onSendMessage) {
                onSendMessage();
                console.log('✅ [LandlordInfoCard] Opening messages tab');
              } else {
                console.error('❌ [LandlordInfoCard] onSendMessage callback not provided');
              }
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
