import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, Mail, Phone, Trash2, UserCheck, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const coTenantSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  relationship: z.string().min(1, 'Please specify the relationship'),
});

type CoTenantFormData = z.infer<typeof coTenantSchema>;

interface CoTenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship: string;
  status: 'pending' | 'approved' | 'rejected';
  invited_at: string;
  avatar_url?: string;
}

export const CoTenantManagement = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coTenants, setCoTenants] = useState<CoTenant[]>([
    {
      id: '1',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@email.com',
      phone: '+254 712 345 680',
      relationship: 'Spouse',
      status: 'approved',
      invited_at: '2024-01-01',
    },
    {
      id: '2',
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike.johnson@email.com',
      phone: '+254 712 345 681',
      relationship: 'Roommate',
      status: 'pending',
      invited_at: '2024-01-15',
    }
  ]);

  const form = useForm<CoTenantFormData>({
    resolver: zodResolver(coTenantSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      relationship: '',
    }
  });

  const onSubmit = async (data: CoTenantFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call to invite co-tenant
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCoTenant: CoTenant = {
        id: Math.random().toString(),
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        relationship: data.relationship,
        status: 'pending',
        invited_at: new Date().toISOString().split('T')[0],
      };

      setCoTenants(prev => [...prev, newCoTenant]);
      toast.success('Invitation sent successfully');
      form.reset();
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCoTenant = async (id: string) => {
    try {
      setCoTenants(prev => prev.filter(tenant => tenant.id !== id));
      toast.success('Co-tenant removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove co-tenant');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <UserCheck className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Co-Tenants Management
          </span>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Co-Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Co-Tenant</DialogTitle>
                <DialogDescription>
                  Send an invitation to add someone as a co-tenant to your lease.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Jane" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Smith" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="jane.smith@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+254 712 345 678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Spouse, Roommate, Partner" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage co-tenants who share your lease agreement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {coTenants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Co-Tenants</h3>
            <p className="text-muted-foreground mb-4">
              You haven't added any co-tenants to your lease yet.
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Co-Tenant
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {coTenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar>
                  <AvatarImage src={tenant.avatar_url} />
                  <AvatarFallback>
                    {tenant.first_name[0]}{tenant.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">
                      {tenant.first_name} {tenant.last_name}
                    </h4>
                    <Badge className={getStatusColor(tenant.status)} variant="secondary">
                      {getStatusIcon(tenant.status)}
                      <span className="ml-1 capitalize">{tenant.status}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {tenant.email}
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {tenant.phone}
                    </p>
                    <p>Relationship: {tenant.relationship}</p>
                    <p>Invited: {tenant.invited_at}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {tenant.status === 'pending' && (
                    <Button variant="outline" size="sm">
                      Resend Invite
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveCoTenant(tenant.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Co-tenants will need to create their own accounts and 
                accept the invitation. They will have limited access compared to the primary tenant.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};