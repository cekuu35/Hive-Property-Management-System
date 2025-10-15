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
    <div className={cn("sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm", className)}>
      <div className="flex items-center justify-between p-4 safe-area-top">
        {/* Left side - Title */}
        <div className="flex-1 min-w-0 ml-12">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Notifications */}
          {onNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNotifications}
              className="h-8 w-8 p-0 relative"
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
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
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {/* User Avatar */}
          {userAvatar && userName && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="text-xs">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
