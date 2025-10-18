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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
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
                "flex flex-col items-center gap-1 h-16 px-2 relative",
                isActive && "text-primary",
                !isActive && "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium truncate max-w-[60px]">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
