import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuickChatButtonProps {
  onStartChat: (landlordId: string) => void;
}

export const QuickChatButton = ({ onStartChat }: QuickChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const { getLandlordForTenant, sendMessage } = useMessages();
  const { profile } = useAuth();

  const handleQuickSend = async () => {
    if (!quickMessage.trim()) return;
    
    const landlord = await getLandlordForTenant();
    if (!landlord) {
      toast.error('No landlord found');
      return;
    }

    const success = await sendMessage(landlord.id, quickMessage.trim());
    if (success) {
      setQuickMessage('');
      setIsOpen(false);
      onStartChat(landlord.id);
      toast.success('Message sent!');
    }
  };

  if (profile?.role !== 'tenant') return null;

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Quick Message Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Quick Message to Landlord
            </DialogTitle>
            <DialogDescription>
              Send a quick message to your landlord
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleQuickSend} 
                disabled={!quickMessage.trim()}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
