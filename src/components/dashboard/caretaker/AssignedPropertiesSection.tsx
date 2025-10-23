import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Wrench, AlertCircle, Users, Calendar } from 'lucide-react';
import { useCaretakerProperties } from '@/hooks/useCaretakerProperties';
import { Skeleton } from '@/components/ui/skeleton';

export const AssignedPropertiesSection = () => {
  const { properties, loading, selectedPropertyId, setSelectedPropertyId } = useCaretakerProperties();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">My Assigned Properties</h2>
        
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Properties Assigned</h3>
            <p className="text-muted-foreground">
              You are not currently assigned to any properties.
              <br />
              Contact your landlord if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div>
        <h2 className="text-2xl font-bold mb-2">My Assigned Properties</h2>
        <p className="text-muted-foreground">
          You are assigned to {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Properties</p>
                <p className="text-2xl font-bold">{properties.length}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">
                  {properties.reduce((sum, p) => sum + p.total_units, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold text-warning">
                  {properties.reduce((sum, p) => sum + p.pending_maintenance, 0)}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgent Tasks</p>
                <p className="text-2xl font-bold text-destructive">
                  {properties.reduce((sum, p) => sum + p.urgent_maintenance, 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card 
            key={property.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPropertyId === property.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPropertyId(property.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-1">
                    <Building className="h-5 w-5" />
                    {property.name}
                  </CardTitle>
                  {selectedPropertyId === property.id && (
                    <Badge className="mb-2">Currently Viewing</Badge>
                  )}
                </div>
              </div>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Units Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Units</span>
                <span className="font-medium">
                  {property.occupied_units}/{property.total_units} occupied
                </span>
              </div>

              {/* Maintenance Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Wrench className="h-3 w-3" />
                    Pending Tasks
                  </span>
                  <Badge variant={property.pending_maintenance > 0 ? 'secondary' : 'outline'}>
                    {property.pending_maintenance}
                  </Badge>
                </div>

                {property.urgent_maintenance > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </span>
                    <Badge variant="destructive">
                      {property.urgent_maintenance}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Assignment Info */}
              <div className="pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Assigned {new Date(property.assigned_at).toLocaleDateString()}
                </div>
                {property.notes && (
                  <p className="mt-1 italic">"{property.notes}"</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};




