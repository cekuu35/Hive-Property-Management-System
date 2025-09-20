import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, User, Clock, MessageCircle, Send, Wrench, AlertTriangle, 
  CheckCircle, Star, Camera, Phone, Mail 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  date: string;
  assignedTo?: string;
  images?: string[];
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  tenantRating?: number;
  notes?: string;
}

interface MaintenanceRequestViewProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
}

interface ChatMessage {
  id: string;
  sender: 'tenant' | 'maintenance' | 'landlord';
  message: string;
  timestamp: string;
  type: 'message' | 'status_update' | 'cost_estimate';
}

export const MaintenanceRequestView = ({ isOpen, onClose, request }: MaintenanceRequestViewProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      // Simulate loading chat messages
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          sender: 'tenant',
          message: request.description,
          timestamp: request.date,
          type: 'message'
        },
        {
          id: '2',
          sender: 'maintenance',
          message: `Thank you for reporting this issue. I've been assigned to handle your ${request.category.toLowerCase()} request. I'll inspect the issue and provide an update soon.`,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'message'
        }
      ];

      if (request.status === 'in_progress') {
        mockMessages.push({
          id: '3',
          sender: 'maintenance',
          message: 'I\'ve started working on your request. The issue is more complex than initially thought, but I should have it resolved within the next 24 hours.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'status_update'
        });
      }

      if (request.estimatedCost) {
        mockMessages.push({
          id: '4',
          sender: 'maintenance',
          message: `Estimated cost for parts and labor: KES ${request.estimatedCost.toLocaleString()}. Please confirm if you'd like to proceed.`,
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          type: 'cost_estimate'
        });
      }

      setChatMessages(mockMessages);
    }
  }, [request]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !request) return;

    setLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'tenant',
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'message'
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate response after 2 seconds
    setTimeout(() => {
      const responses = [
        "Thank you for the additional information. I'll take this into account.",
        "I understand your concern. Let me check on the status and get back to you.",
        "I appreciate your patience. I'll prioritize this and update you soon.",
        "Thanks for clarifying. This helps me better understand the issue."
      ];
      
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'maintenance',
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        type: 'message'
      };
      
      setChatMessages(prev => [...prev, response]);
      setLoading(false);
    }, 2000);
  };

  const handleRatingSubmit = () => {
    toast({
      title: "Rating Submitted",
      description: `Thank you for rating this service ${rating} stars!`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'emergency': return 'bg-destructive text-destructive-foreground animate-pulse';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSenderInfo = (sender: string) => {
    switch (sender) {
      case 'tenant':
        return { name: 'You', avatar: 'T', color: 'bg-primary' };
      case 'maintenance':
        return { name: 'Maintenance Team', avatar: 'M', color: 'bg-orange-500' };
      case 'landlord':
        return { name: 'Property Manager', avatar: 'P', color: 'bg-blue-500' };
      default:
        return { name: 'System', avatar: 'S', color: 'bg-gray-500' };
    }
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-[80vh]">
          {/* Left Panel - Request Details */}
          <div className="w-1/2 border-r">
            <DialogHeader className="p-6 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Request Details
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="h-full p-6">
              <div className="space-y-6">
                {/* Status and Priority */}
                <div className="flex gap-2">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority} priority
                  </Badge>
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">{request.title}</h3>
                  <p className="text-muted-foreground">{request.description}</p>
                </div>

                {/* Request Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Request Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Submitted: {new Date(request.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span>Category: {request.category}</span>
                    </div>
                    {request.assignedTo && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Assigned to: {request.assignedTo}</span>
                      </div>
                    )}
                    {request.scheduledDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Information */}
                {(request.estimatedCost || request.actualCost) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Cost Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {request.estimatedCost && (
                        <div className="flex justify-between text-sm">
                          <span>Estimated Cost:</span>
                          <span className="font-medium">KES {request.estimatedCost.toLocaleString()}</span>
                        </div>
                      )}
                      {request.actualCost && (
                        <div className="flex justify-between text-sm">
                          <span>Actual Cost:</span>
                          <span className="font-medium">KES {request.actualCost.toLocaleString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Images */}
                {request.images && request.images.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Photos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {request.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Request image ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Rating for completed requests */}
                {request.status === 'completed' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Rate this Service</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Button
                            key={star}
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => setRating(star)}
                          >
                            <Star
                              className={cn(
                                "h-5 w-5",
                                star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              )}
                            />
                          </Button>
                        ))}
                      </div>
                      {rating > 0 && (
                        <Button size="sm" onClick={handleRatingSubmit}>
                          Submit Rating
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Chat */}
          <div className="w-1/2 flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Communication
              </h3>
              <p className="text-sm text-muted-foreground">Chat with maintenance team</p>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => {
                  const senderInfo = getSenderInfo(message.sender);
                  const isUser = message.sender === 'tenant';
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        isUser ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn("text-xs text-white", senderInfo.color)}>
                          {senderInfo.avatar}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{senderInfo.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleDateString()} at{' '}
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        <div
                          className={cn(
                            "p-3 rounded-lg text-sm",
                            isUser 
                              ? "bg-primary text-primary-foreground ml-auto" 
                              : "bg-muted",
                            message.type === 'status_update' && "border-l-4 border-primary",
                            message.type === 'cost_estimate' && "border-l-4 border-warning"
                          )}
                        >
                          {message.type === 'status_update' && (
                            <div className="flex items-center gap-1 mb-1 text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Status Update
                            </div>
                          )}
                          {message.type === 'cost_estimate' && (
                            <div className="flex items-center gap-1 mb-1 text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Cost Estimate
                            </div>
                          )}
                          {message.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {loading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-orange-500 text-white text-xs">
                        M
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                />
                <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};