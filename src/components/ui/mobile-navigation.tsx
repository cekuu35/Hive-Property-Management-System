import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Home, 
  CreditCard, 
  Wrench, 
  FileText, 
  MessageCircle, 
  Settings, 
  Bell,
  User,
  Building2,
  Receipt,
  Calendar,
  Shield,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingRequests?: number;
  unreadMessages?: number;
  notifications?: number;
  userRole?: string;
  onLogout?: () => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home, description: 'Dashboard overview' },
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Rent & utility payments' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Request repairs' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Lease & receipts' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, description: 'Chat with landlord' },
  { id: 'notices', label: 'Notices', icon: Bell, description: 'Important updates' },
  { id: 'profile', label: 'Profile', icon: User, description: 'Account settings' },
];

const landlordNavigationItems = [
  { id: 'overview', label: 'Overview', icon: Home, description: 'Dashboard overview' },
  { id: 'properties', label: 'Properties', icon: Building2, description: 'Manage properties' },
  { id: 'tenants', label: 'Tenants', icon: User, description: 'Tenant management' },
  { id: 'payments', label: 'Payments', icon: Receipt, description: 'Payment tracking' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Repair requests' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, description: 'Tenant communication' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'Analytics & reports' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Account settings' },
];

export function MobileNavigation({ 
  activeTab, 
  onTabChange, 
  pendingRequests = 0,
  unreadMessages = 0,
  notifications = 0,
  userRole = 'tenant',
  onLogout
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const items = userRole === 'landlord' ? landlordNavigationItems : navigationItems;

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const getBadgeCount = (tabId: string) => {
    switch (tabId) {
      case 'maintenance':
        return pendingRequests;
      case 'messages':
        return unreadMessages;
      case 'notices':
        return notifications;
      default:
        return 0;
    }
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed top-4 left-4 z-[60] bg-background/90 backdrop-blur-sm border shadow-lg hover:bg-background"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 z-[70] bg-background">
          <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="p-6 border-b bg-background">
              <h2 className="text-lg font-semibold text-foreground">LovlyProp</h2>
              <p className="text-sm text-muted-foreground">
                {userRole === 'landlord' ? 'Property Management' : 'Tenant Portal'}
              </p>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto bg-background">
              {items.map((item) => {
                const Icon = item.icon;
                const badgeCount = getBadgeCount(item.id);
                const isActive = activeTab === item.id;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-14 px-4 text-left",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isActive && "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => handleTabChange(item.id)}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-xs opacity-70 truncate">{item.description}</div>
                    </div>
                    {badgeCount > 0 && (
                      <Badge 
                        variant={isActive ? "secondary" : "destructive"}
                        className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs flex-shrink-0"
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t bg-background">
              {onLogout && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
