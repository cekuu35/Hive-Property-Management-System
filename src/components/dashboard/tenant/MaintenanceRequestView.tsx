import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, User, Clock, MessageCircle, Send, Wrench, AlertTriangle, 
  CheckCircle, Star, Camera, Phone, Mail, FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useLandlordInfo } from '@/hooks/useLandlordInfo';
import { useAuth } from '@/hooks/useAuth';

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
  const { landlordInfo } = useLandlordInfo();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      // Simulate loading chat messages with comprehensive responses
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
          message: getMaintenanceResponses(request, request.description),
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'message'
        }
      ];

      if (request.status === 'in_progress') {
        const statusResponses = [
          "I've started working on your request. The issue is being addressed and I'll update you on my progress.",
          "I'm currently working on your request. It's going well and I should have it completed soon.",
          "I'm making good progress on your request. I'll let you know when it's finished.",
          "The work is underway. I'm addressing the issue and will complete it as quickly as possible.",
          "I'm actively working on resolving this issue. I'll provide updates as I make progress."
        ];
        mockMessages.push({
          id: '3',
          sender: 'maintenance',
          message: statusResponses[Math.floor(Math.random() * statusResponses.length)],
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'status_update'
        });
      }

      if (request.estimatedCost) {
        const costResponses = [
          `I've assessed the situation and there will be some costs involved. The estimated cost for parts and labor is KES ${request.estimatedCost.toLocaleString()}. Please confirm if you'd like to proceed.`,
          `This repair will require some parts and materials. I've calculated the costs at KES ${request.estimatedCost.toLocaleString()}. I'll need your approval to continue.`,
          `I need to order some supplies for this repair. The total cost will be KES ${request.estimatedCost.toLocaleString()}. Please let me know if you approve this expense.`,
          `The work will require some materials. I've prepared a cost estimate of KES ${request.estimatedCost.toLocaleString()}. Please confirm if you'd like me to proceed with the work.`,
          `I've calculated the costs for parts and labor at KES ${request.estimatedCost.toLocaleString()}. Please approve this estimate so I can continue with the repair.`
        ];
        mockMessages.push({
          id: '4',
          sender: 'maintenance',
          message: costResponses[Math.floor(Math.random() * costResponses.length)],
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          type: 'cost_estimate'
        });
      }

      setChatMessages(mockMessages);
    }
  }, [request]);

  const getMaintenanceResponses = (request: MaintenanceRequest, userMessage: string) => {
    const responses = {
      // Initial acknowledgment responses
      acknowledgment: [
        "Thank you for reporting this issue. I've been assigned to handle your request and will investigate shortly.",
        "I've received your message and will look into this matter right away.",
        "Thanks for bringing this to our attention. I'm on it and will provide updates as I work on it.",
        "I understand your concern. Let me check the current status and get back to you with an update.",
        "Thank you for the additional information. This helps me better understand the situation.",
        "I appreciate you reaching out. I'll investigate this issue and keep you informed of my progress."
      ],

      // Status update responses
      statusUpdates: {
        pending: [
          "I'm currently reviewing your request and will provide an update within the next few hours.",
          "Your request is in my queue. I'll start working on it shortly and update you on my progress.",
          "I'm assessing the situation and will have a plan of action for you soon.",
          "I'm gathering the necessary information and will begin work on your request today."
        ],
        in_progress: [
          "I'm currently working on your request. The issue is being addressed and I'll update you on my progress.",
          "I've started the repair work. It's going well and I should have it completed soon.",
          "I'm making good progress on your request. I'll let you know when it's finished.",
          "The work is underway. I'm addressing the issue and will complete it as quickly as possible.",
          "I'm actively working on resolving this issue. I'll provide updates as I make progress."
        ],
        completed: [
          "Great news! I've completed the work on your request. Please let me know if you need anything else.",
          "The repair work is finished. Everything should be working properly now.",
          "I've successfully resolved the issue. Please test it out and let me know if everything is working as expected.",
          "The work is complete! I've addressed all the concerns you mentioned.",
          "All done! The issue has been resolved. Please check and confirm everything is working properly."
        ]
      },

      // Category-specific responses
      categorySpecific: {
        plumbing: [
          "I'm checking the plumbing system. This type of issue usually requires specific tools and parts.",
          "I'm assessing the plumbing problem. I may need to shut off water temporarily while I work.",
          "I'm investigating the plumbing issue. I'll check for leaks, blockages, or other problems.",
          "I'm examining the plumbing system. This could be related to pipes, fixtures, or water pressure."
        ],
        electrical: [
          "I'm investigating the electrical issue. Safety is my priority, so I'll take proper precautions.",
          "I'm checking the electrical system. This type of work requires careful attention to safety protocols.",
          "I'm assessing the electrical problem. I'll ensure all work meets safety standards.",
          "I'm examining the electrical components. I'll test and verify everything is working safely."
        ],
        hvac: [
          "I'm checking the HVAC system. Temperature and air quality issues can have various causes.",
          "I'm investigating the heating/cooling problem. I'll check the system components and settings.",
          "I'm assessing the HVAC issue. This could involve filters, thermostats, or system components.",
          "I'm examining the climate control system. I'll ensure proper temperature regulation."
        ],
        general: [
          "I'm investigating the issue you've described. I'll check all relevant components and systems.",
          "I'm assessing the problem and will determine the best approach to resolve it.",
          "I'm examining the situation and will provide a comprehensive solution.",
          "I'm looking into this matter and will address all aspects of the issue."
        ]
      },

      // Cost and approval responses
      costRelated: [
        "I've assessed the situation and there will be some costs involved. Let me provide you with an estimate.",
        "This repair will require some parts and materials. I'll get you a detailed cost breakdown.",
        "I need to order some supplies for this repair. I'll provide you with the cost estimate shortly.",
        "The work will require some materials. I'll give you the pricing details so you can approve the work.",
        "I've calculated the costs for parts and labor. I'll send you the estimate for your approval."
      ],

      // Timeline responses
      timeline: [
        "I expect to complete this work within the next 24 hours.",
        "This should be resolved by tomorrow at the latest.",
        "I'm aiming to finish this within the next few hours.",
        "I'll have this completed today if possible.",
        "I'm working to get this done as quickly as possible.",
        "I should have this resolved within the next day or two."
      ],

      // Follow-up responses
      followUp: [
        "I'll keep you updated on my progress. Feel free to ask any questions.",
        "I'll provide regular updates as I work on this. Don't hesitate to reach out if you have concerns.",
        "I'll stay in touch throughout the process. Let me know if you need anything else.",
        "I'll keep you informed of any developments. Please let me know if you have any questions.",
        "I'll update you regularly. Feel free to contact me if you need clarification on anything."
      ],

      // Problem-solving responses
      problemSolving: [
        "I'm working through this step by step. I'll find the best solution for your situation.",
        "I'm analyzing the problem and will implement the most effective fix.",
        "I'm taking a systematic approach to resolve this issue completely.",
        "I'm working to ensure this problem doesn't recur. I'll implement a lasting solution.",
        "I'm addressing the root cause to provide a permanent fix."
      ],

      // Emergency responses
      emergency: [
        "This is a priority issue. I'm addressing it immediately and will work until it's resolved.",
        "I understand this is urgent. I'm prioritizing this request and will work as quickly as possible.",
        "This is an emergency situation. I'm taking immediate action to resolve it.",
        "I recognize the urgency. I'm working on this right now and will not stop until it's fixed.",
        "This requires immediate attention. I'm handling it as a top priority."
      ],

      // Completion and satisfaction responses
      completion: [
        "I've completed the work. Please test everything and let me know if you're satisfied with the results.",
        "The repair is finished. I want to make sure you're completely happy with the work.",
        "Everything is done! Please check that everything meets your expectations.",
        "I've finished the work. Please verify that everything is working as it should.",
        "The job is complete. I'd appreciate your feedback on the quality of the work."
      ],

      // General helpful responses
      helpful: [
        "I'm here to help. Don't hesitate to ask if you have any questions or concerns.",
        "I want to make sure you're completely satisfied. Let me know if you need anything else.",
        "I'm committed to resolving this issue to your satisfaction. Please keep me informed.",
        "I'm here to ensure your living space is comfortable and safe. Let me know how I can help further.",
        "I want to make sure this is resolved properly. Please don't hesitate to reach out if needed."
      ]
    };

    // Determine response category based on context
    const messageLower = userMessage.toLowerCase();
    const requestStatus = request.status;
    const requestCategory = request.category.toLowerCase();

    // Check for emergency keywords
    if (messageLower.includes('urgent') || messageLower.includes('emergency') || 
        messageLower.includes('asap') || messageLower.includes('immediately')) {
      return responses.emergency[Math.floor(Math.random() * responses.emergency.length)];
    }

    // Check for cost-related keywords
    if (messageLower.includes('cost') || messageLower.includes('price') || 
        messageLower.includes('expensive') || messageLower.includes('budget')) {
      return responses.costRelated[Math.floor(Math.random() * responses.costRelated.length)];
    }

    // Check for timeline keywords
    if (messageLower.includes('when') || messageLower.includes('time') || 
        messageLower.includes('how long') || messageLower.includes('schedule')) {
      return responses.timeline[Math.floor(Math.random() * responses.timeline.length)];
    }

    // Check for completion keywords
    if (messageLower.includes('done') || messageLower.includes('finished') || 
        messageLower.includes('complete') || messageLower.includes('resolved')) {
      return responses.completion[Math.floor(Math.random() * responses.completion.length)];
    }

    // Status-based responses
    if (requestStatus === 'pending') {
      return responses.statusUpdates.pending[Math.floor(Math.random() * responses.statusUpdates.pending.length)];
    } else if (requestStatus === 'in_progress') {
      return responses.statusUpdates.in_progress[Math.floor(Math.random() * responses.statusUpdates.in_progress.length)];
    } else if (requestStatus === 'completed') {
      return responses.statusUpdates.completed[Math.floor(Math.random() * responses.statusUpdates.completed.length)];
    }

    // Category-specific responses
    if (requestCategory.includes('plumbing')) {
      return responses.categorySpecific.plumbing[Math.floor(Math.random() * responses.categorySpecific.plumbing.length)];
    } else if (requestCategory.includes('electrical')) {
      return responses.categorySpecific.electrical[Math.floor(Math.random() * responses.categorySpecific.electrical.length)];
    } else if (requestCategory.includes('hvac') || requestCategory.includes('heating') || requestCategory.includes('cooling')) {
      return responses.categorySpecific.hvac[Math.floor(Math.random() * responses.categorySpecific.hvac.length)];
    }

    // Default to general acknowledgment
    return responses.acknowledgment[Math.floor(Math.random() * responses.acknowledgment.length)];
  };

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
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'maintenance',
        message: getMaintenanceResponses(request, newMessage),
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
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-0 overflow-hidden">
        {/* Desktop Layout: Two-panel side-by-side */}
        <div className="hidden md:flex h-[80vh]">
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

                {/* Landlord Information */}
                {landlordInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Your Landlord
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={landlordInfo.avatar_url || undefined} />
                          <AvatarFallback>
                            {landlordInfo.first_name?.[0]}{landlordInfo.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {landlordInfo.first_name} {landlordInfo.last_name}
                          </h4>
                          {landlordInfo.company_name && (
                            <p className="text-sm text-muted-foreground">
                              {landlordInfo.company_name}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                        Photos ({request.images.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PhotoGallery
                        photos={request.images}
                        maxColumns={3}
                        showActions={false}
                        allowFullscreen={true}
                        className="mt-2"
                      />
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

        {/* Mobile Layout: Tabs for better UX */}
        <div className="md:hidden flex flex-col" style={{ height: '85vh', maxHeight: '85vh' }}>
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {request.title}
            </DialogTitle>
            <div className="flex gap-2 mt-2">
              <Badge className={getStatusColor(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityColor(request.priority)}>
                {request.priority}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b flex-shrink-0">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 m-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  </div>

                  {/* Request Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Request Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Submitted: {new Date(request.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>Category: {request.category}</span>
                      </div>
                      {request.assignedTo && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Assigned to: {request.assignedTo}</span>
                        </div>
                      )}
                      {request.scheduledDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Landlord Information */}
                  {landlordInfo && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Your Landlord
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={landlordInfo.avatar_url || undefined} />
                            <AvatarFallback>
                              {landlordInfo.first_name?.[0]}{landlordInfo.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {landlordInfo.first_name} {landlordInfo.last_name}
                            </h4>
                            {landlordInfo.company_name && (
                              <p className="text-xs text-muted-foreground">
                                {landlordInfo.company_name}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cost Information */}
                  {(request.estimatedCost || request.actualCost) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Cost Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {request.estimatedCost && (
                          <div className="flex justify-between">
                            <span>Estimated Cost:</span>
                            <span className="font-medium">KES {request.estimatedCost.toLocaleString()}</span>
                          </div>
                        )}
                        {request.actualCost && (
                          <div className="flex justify-between">
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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Photos ({request.images.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PhotoGallery
                          photos={request.images}
                          maxColumns={2}
                          showActions={false}
                          allowFullscreen={true}
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Rating for completed requests */}
                  {request.status === 'completed' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Rate this Service</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-3 justify-center">
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
                                  "h-6 w-6",
                                  star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                )}
                              />
                            </Button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <Button size="sm" onClick={handleRatingSubmit} className="w-full">
                            Submit Rating
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 m-0 flex flex-col overflow-hidden min-h-0">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                <div className="space-y-3">
                  {chatMessages.map((message) => {
                    const senderInfo = getSenderInfo(message.sender);
                    const isUser = message.sender === 'tenant';
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2",
                          isUser ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn("text-xs text-white", senderInfo.color)}>
                            {senderInfo.avatar}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={cn("flex-1 max-w-[75%]", isUser && "text-right")}>
                          <div className={cn("flex items-center gap-1 mb-1", isUser && "justify-end")}>
                            <span className="text-xs font-medium">{senderInfo.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleDateString()} {' '}
                              {new Date(message.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <div
                            className={cn(
                              "p-2.5 rounded-lg text-sm break-words",
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
                    <div className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-orange-500 text-white text-xs">
                          M
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted p-2.5 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t bg-background flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={loading}
                    className="text-sm"
                  />
                  <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()} size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="text-xs flex-1">
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs flex-1">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};