import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  CreditCard, 
  Wrench, 
  MessageCircle, 
  User,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingRequests?: number;
  unreadMessages?: number;
  userRole?: string;
}

const bottomNavItems = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'payments', label: 'Pay', icon: CreditCard },
  { id: 'utility-bills', label: 'Bills', icon: Receipt },
  { id: 'maintenance', label: 'Repairs', icon: Wrench },
  { id: 'messages', label: 'Chat', icon: MessageCircle },
];

export function MobileBottomNav({ 
  activeTab, 
  onTabChange, 
  pendingRequests = 0,
  unreadMessages = 0,
  userRole = 'tenant'
}: MobileBottomNavProps) {
  const getBadgeCount = (tabId: string) => {
    switch (tabId) {
      case 'maintenance':
        return pendingRequests;
      case 'messages':
        return unreadMessages;
      case 'utility-bills':
        return 0; // Could add unpaid bills count
      default:
        return 0;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-background/98 backdrop-blur-md border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] safe-area-bottom overflow-hidden">
      <div className="flex items-center justify-around px-1 py-1.5 max-w-full">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item.id);
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-[64px] min-w-[56px] flex-1 max-w-[80px] px-1 relative rounded-2xl touch-manipulation transition-all duration-200",
                isActive && "text-primary bg-primary/10",
                !isActive && "text-muted-foreground hover:text-foreground active:bg-accent/50"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <div className="relative">
                <Icon className={cn(
                  "transition-all duration-200",
                  isActive ? "h-6 w-6" : "h-5 w-5"
                )} />
                {badgeCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[11px] font-medium truncate max-w-full transition-all duration-200",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
