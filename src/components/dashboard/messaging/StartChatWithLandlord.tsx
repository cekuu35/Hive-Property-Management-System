import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Building, User, Phone, Mail, Star } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StartChatWithLandlordProps {
  onStartChat: (landlordId: string) => void;
}

export const StartChatWithLandlord = ({ onStartChat }: StartChatWithLandlordProps) => {
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { getLandlordForTenant } = useMessages();
  const { profile } = useAuth();
  const [landlord, setLandlord] = useState<any>(null);

  const loadLandlord = async () => {
    if (profile?.role === 'tenant') {
      const landlordData = await getLandlordForTenant();
      setLandlord(landlordData);
    }
  };

  useEffect(() => {
    loadLandlord();
  }, []);

  const handleStartChat = async () => {
    if (!landlord) return;
    
    setIsStartingChat(true);
    try {
      // Start the chat by selecting the landlord conversation
      onStartChat(landlord.id);
      toast.success('Chat started with your landlord!');
    } catch (error) {
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setIsStartingChat(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!landlord) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Landlord Assigned</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            You don't have an assigned landlord yet. Contact support if you need assistance with your property.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Start a Conversation</h2>
        <p className="text-muted-foreground">
          Connect with your landlord for any questions or concerns
        </p>
      </div>

      {/* Landlord Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={landlord.avatar_url} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(`${landlord.first_name} ${landlord.last_name}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-foreground">
                  {landlord.first_name} {landlord.last_name}
                </h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Building className="h-3 w-3 mr-1" />
                  Landlord
                </Badge>
              </div>
              {landlord.property_name && (
                <p className="text-sm text-muted-foreground">
                  <Building className="h-4 w-4 inline mr-1" />
                  {landlord.property_name}
                  {landlord.unit_number && ` - Unit ${landlord.unit_number}`}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Direct Messaging</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Priority Support</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border">
              <Building className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Property Related</span>
            </div>
          </div>

          {/* Start Chat Button */}
          <div className="pt-4">
            <Button 
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isStartingChat ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting Chat...
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Start Chat with Landlord
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              💡 You can discuss maintenance requests, lease questions, or any property-related concerns
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Message Templates</CardTitle>
          <CardDescription>
            Start with a pre-written message or create your own
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 text-left justify-start"
              onClick={() => onStartChat(landlord.id)}
            >
              <div>
                <div className="font-medium mb-1">Maintenance Request</div>
                <div className="text-xs text-muted-foreground">
                  "Hi, I need to report a maintenance issue..."
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 text-left justify-start"
              onClick={() => onStartChat(landlord.id)}
            >
              <div>
                <div className="font-medium mb-1">Lease Question</div>
                <div className="text-xs text-muted-foreground">
                  "I have a question about my lease..."
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 text-left justify-start"
              onClick={() => onStartChat(landlord.id)}
            >
              <div>
                <div className="font-medium mb-1">General Inquiry</div>
                <div className="text-xs text-muted-foreground">
                  "Hi, I wanted to ask about..."
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 text-left justify-start"
              onClick={() => onStartChat(landlord.id)}
            >
              <div>
                <div className="font-medium mb-1">Payment Question</div>
                <div className="text-xs text-muted-foreground">
                  "I have a question about my rent payment..."
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
