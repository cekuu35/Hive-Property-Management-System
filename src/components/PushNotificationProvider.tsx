import { ReactNode } from 'react';
import { usePushNotificationProcessor } from '@/hooks/usePushNotificationProcessor';

interface PushNotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider component that processes push notification queue in the background
 * Add this inside AuthProvider to ensure user is authenticated
 */
export const PushNotificationProvider = ({ children }: PushNotificationProviderProps) => {
  // This hook runs the background queue processor
  usePushNotificationProcessor();

  return <>{children}</>;
};

