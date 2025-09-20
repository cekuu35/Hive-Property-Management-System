import { SecurityVisitorManagement } from './SecurityVisitorManagement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserCheck, Plus, Clock, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { format } from 'date-fns';

interface Visitor {
  id: string;
  name: string;
  visiting: string;
  timeIn: string;
  timeOut?: string;
  status: 'active' | 'completed';
  phone?: string;
  purpose?: string;
}

export const VisitorsSection = () => {
  return <SecurityVisitorManagement />;
};