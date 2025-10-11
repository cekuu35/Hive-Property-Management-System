import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function AdminPortalLink() {
  return (
    <Link to="/admin">
      <Button variant="outline" size="sm" className="text-xs">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Button>
    </Link>
  );
}
