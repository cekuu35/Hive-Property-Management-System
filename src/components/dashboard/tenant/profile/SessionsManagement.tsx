import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Smartphone, Tablet, MapPin, Clock, Shield, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

export const SessionsManagement = () => {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      device: 'MacBook Pro',
      deviceType: 'desktop',
      browser: 'Chrome 120.0',
      location: 'Nairobi, Kenya',
      ipAddress: '102.68.xxx.xxx',
      lastActive: '2024-01-20T10:30:00Z',
      isCurrent: true,
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      device: 'iPhone 15',
      deviceType: 'mobile',
      browser: 'Safari Mobile',
      location: 'Nairobi, Kenya',
      ipAddress: '102.68.xxx.yyy',
      lastActive: '2024-01-20T09:15:00Z',
      isCurrent: false,
      createdAt: '2024-01-18T12:30:00Z',
    },
    {
      id: '3',
      device: 'Windows PC',
      deviceType: 'desktop',
      browser: 'Firefox 121.0',
      location: 'Mombasa, Kenya',
      ipAddress: '197.254.xxx.zzz',
      lastActive: '2024-01-19T16:45:00Z',
      isCurrent: false,
      createdAt: '2024-01-19T16:00:00Z',
    },
  ]);

  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <Monitor className="h-5 w-5" />;
      case 'mobile': return <Smartphone className="h-5 w-5" />;
      case 'tablet': return <Tablet className="h-5 w-5" />;
      default: return <Monitor className="h-5 w-5" />;
    }
  };

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Active now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleTerminateSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Session terminated successfully');
      setShowTerminateDialog(false);
      setSelectedSession(null);
    } catch (error) {
      toast.error('Failed to terminate session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSessions(prev => prev.filter(session => session.isCurrent));
      toast.success('All other sessions terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const otherSessions = sessions.filter(session => !session.isCurrent);
  const currentSession = sessions.find(session => session.isCurrent);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Sessions
            </span>
            {otherSessions.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTerminateAllOtherSessions}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Terminate All Others
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Manage your account sessions across all devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Session */}
            {currentSession && (
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-primary">
                      {getDeviceIcon(currentSession.deviceType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{currentSession.device}</h4>
                        <Badge variant="secondary" className="text-xs">
                          Current Session
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {currentSession.browser}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {currentSession.location} • {currentSession.ipAddress}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastActive(currentSession.lastActive)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Sessions */}
            {otherSessions.map((session) => (
              <div key={session.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-muted-foreground">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">{session.device}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {session.browser}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location} • {session.ipAddress}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active: {formatLastActive(session.lastActive)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowTerminateDialog(true);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Terminate
                  </Button>
                </div>
              </div>
            ))}

            {otherSessions.length === 0 && (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Only One Active Session</h3>
                <p className="text-muted-foreground">
                  You're only signed in on this device. That's good for security!
                </p>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 border border-warning/20 rounded-lg bg-warning/5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-warning mb-1">Security Notice</h4>
                <p className="text-sm text-muted-foreground">
                  If you see any sessions you don't recognize, terminate them immediately 
                  and change your password. Always log out from public or shared computers.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminate Session Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate this session? The user will be 
              logged out from that device.
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {getDeviceIcon(selectedSession.deviceType)}
                </div>
                <div>
                  <p className="font-medium">{selectedSession.device}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.location} • Last active: {formatLastActive(selectedSession.lastActive)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTerminateDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedSession && handleTerminateSession(selectedSession.id)}
              disabled={isLoading}
            >
              {isLoading ? 'Terminating...' : 'Terminate Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
