import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function MobilePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | 'tablet'>('desktop');

  useEffect(() => {
    // Detect device type
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'mobile';
      } else if (/ipad|android(?!.*mobile)|tablet/i.test(userAgent)) {
        return 'tablet';
      }
      return 'desktop';
    };

    setDeviceType(detectDevice());

    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay for better UX
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA install accepted');
      } else {
        console.log('PWA install dismissed');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const getInstallInstructions = () => {
    switch (deviceType) {
      case 'mobile':
        return {
          title: 'Install Hive App',
          description: 'Add to your home screen for quick access',
          steps: [
            'Tap the menu button (⋮) in your browser',
            'Select "Add to Home screen" or "Install app"',
            'Tap "Add" to install the app'
          ],
          icon: <Smartphone className="h-8 w-8" />
        };
      case 'tablet':
        return {
          title: 'Install Hive App',
          description: 'Add to your home screen for quick access',
          steps: [
            'Tap the menu button (⋮) in your browser',
            'Select "Add to Home screen" or "Install app"',
            'Tap "Add" to install the app'
          ],
          icon: <Tablet className="h-8 w-8" />
        };
      default:
        return {
          title: 'Install Hive App',
          description: 'Install as a desktop app for better experience',
          steps: [
            'Click the install button in your browser address bar',
            'Or use the menu to find "Install Hive"',
            'Follow the installation prompts'
          ],
          icon: <Monitor className="h-8 w-8" />
        };
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {instructions.icon}
              <div>
                <CardTitle className="text-lg">{instructions.title}</CardTitle>
                <CardDescription>{instructions.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Installation Steps:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-2">
            {deferredPrompt && (
              <Button onClick={handleInstall} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </Button>
            )}
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
