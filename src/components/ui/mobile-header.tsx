import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Settings, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  notifications?: number;
  onRefresh?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  userAvatar?: string;
  userName?: string;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  notifications = 0,
  onRefresh,
  onNotifications,
  onSettings,
  userAvatar,
  userName,
  className
}: MobileHeaderProps) {
  return (
    <div className={cn("sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm w-full overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 safe-area-top max-w-full">
        {/* Left side - Title */}
        <div className="flex-1 min-w-0 ml-12 pr-2">
          <h1 className="text-lg md:text-xl font-bold truncate leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate leading-snug">{subtitle}</p>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-10 w-10 p-0 rounded-full touch-manipulation"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}

          {/* Notifications */}
          {onNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNotifications}
              className="h-10 w-10 p-0 rounded-full relative touch-manipulation"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>
          )}

          {/* Settings */}
          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              className="h-10 w-10 p-0 rounded-full touch-manipulation"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}

          {/* User Avatar */}
          {userAvatar && userName && (
            <Avatar className="h-9 w-9 ml-1">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="text-xs font-semibold">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
