import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, User, Search, Plus } from 'lucide-react';
import { useMessages, type Message, type Conversation } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StartChatWithLandlord } from './StartChatWithLandlord';
import { QuickChatButton } from './QuickChatButton';

export const MessageCenter = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newMessageReceiver, setNewMessageReceiver] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [showStartChat, setShowStartChat] = useState(false);

  const { conversations, loading, sendMessage, markAsRead, getConversationMessages, getLandlordForTenant, getTenantsForLandlord } = useMessages();
  const { profile } = useAuth();

  useEffect(() => {
    const loadContacts = async () => {
      if (profile?.role === 'tenant') {
        const landlord = await getLandlordForTenant();
        if (landlord) {
          setAvailableContacts([landlord]);
          // Check if there are existing conversations
          if (conversations.length === 0) {
            setShowStartChat(true);
          } else {
            // Automatically select the landlord conversation for tenants
            if (!selectedConversation) {
              setSelectedConversation(landlord.id);
            }
          }
        } else {
          setShowStartChat(true);
        }
      } else if (profile?.role === 'landlord') {
        const tenants = await getTenantsForLandlord();
        setAvailableContacts(tenants);
      }
    };

    loadContacts();
  }, [profile, selectedConversation, conversations.length]);

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMessages = selectedConversation 
    ? getConversationMessages(selectedConversation)
    : [];

  const handleStartChat = (landlordId: string) => {
    setSelectedConversation(landlordId);
    setShowStartChat(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const success = await sendMessage(selectedConversation, newMessage.trim());
    if (success) {
      setNewMessage('');
      // Create notification for receiver
      await createMessageNotification(selectedConversation, newMessage.trim());
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageText.trim() || !newMessageReceiver) return;
    
    const success = await sendMessage(newMessageReceiver, newMessageText.trim());
    if (success) {
      setNewMessageText('');
      setNewMessageReceiver('');
      setIsNewMessageOpen(false);
      // Select the new conversation
      setSelectedConversation(newMessageReceiver);
      // Create notification for receiver
      await createMessageNotification(newMessageReceiver, newMessageText.trim());
    }
  };

  const handleSelectConversation = async (participantId: string) => {
    setSelectedConversation(participantId);
    
    // Mark messages as read
    const unreadMessages = selectedMessages
      .filter(msg => msg.receiver_id === profile?.id && !msg.read)
      .map(msg => msg.id);
    
    if (unreadMessages.length > 0) {
      await markAsRead(unreadMessages);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const createMessageNotification = async (receiverId: string, messageText: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: 'New Message',
          message: `You have a new message: "${messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText}"`,
          type: 'message',
          action_url: `/dashboard?tab=messages`
        });

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show Start Chat interface for tenants when no conversations exist
  if (profile?.role === 'tenant' && showStartChat) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-muted-foreground">Communicate with your landlord</p>
          </div>
        </div>
        
        {/* Start Chat Interface */}
        <StartChatWithLandlord onStartChat={handleStartChat} />
        
        {/* Quick Chat Button */}
        <QuickChatButton onStartChat={handleStartChat} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            {profile?.role === 'tenant' 
              ? 'Communicate with your landlord' 
              : 'Communicate with your tenants'
            }
          </p>
        </div>
        {profile?.role === 'landlord' && (
        <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>Compose and send a new message.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">To</label>
                <Select value={newMessageReceiver} onValueChange={setNewMessageReceiver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.property_name && ` (${contact.property_name}${contact.unit_number ? ` - Unit ${contact.unit_number}` : ''})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendNewMessage} disabled={!newMessageText.trim() || !newMessageReceiver}>
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {profile?.role === 'tenant' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowStartChat(true)}
                className="mt-2 w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[450px]">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {profile?.role === 'tenant' 
                      ? 'No landlord assigned yet' 
                      : 'No conversations yet'
                    }
                  </p>
                  <p className="text-sm">
                    {profile?.role === 'tenant' 
                      ? 'Contact support if you need assistance' 
                      : 'Start a new message to begin'
                    }
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.participant_id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation === conversation.participant_id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation.participant_id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.participant_avatar} />
                        <AvatarFallback>{getInitials(conversation.participant_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{conversation.participant_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {conversation.participant_role}
                          </Badge>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.property_name && (
                          <p className="text-xs text-muted-foreground">
                            {conversation.property_name}{conversation.unit_number ? ` - Unit ${conversation.unit_number}` : ''}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.last_message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(conversation.last_message_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={filteredConversations.find(c => c.participant_id === selectedConversation)?.participant_avatar} />
                    <AvatarFallback>
                      {getInitials(filteredConversations.find(c => c.participant_id === selectedConversation)?.participant_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {filteredConversations.find(c => c.participant_id === selectedConversation)?.participant_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {filteredConversations.find(c => c.participant_id === selectedConversation)?.participant_role}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <ScrollArea className="h-[350px] p-4">
                  <div className="space-y-4">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender_id === profile?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === profile?.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {profile?.role === 'tenant' 
                    ? 'No landlord conversation available' 
                    : 'Select a conversation'
                  }
                </h3>
                <p>
                  {profile?.role === 'tenant' 
                    ? 'Your landlord will appear here once you have an active lease' 
                    : 'Choose a conversation from the left to start messaging'
                  }
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      
      {/* Quick Chat Button for Tenants */}
      <QuickChatButton onStartChat={handleStartChat} />
    </div>
  );
};