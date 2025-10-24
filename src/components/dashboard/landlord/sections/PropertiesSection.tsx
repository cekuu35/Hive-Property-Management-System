import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Building, Plus, MapPin, Users, Search, Edit, Trash2, Home, Settings, Bell, Calculator } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { PropertyForm } from '../PropertyForm';
import { UnitManagement } from '../UnitManagement';
import { NoticesModal } from '../NoticesModal';
import { BulkLateFeeModal } from '../BulkLateFeeModal';

export const PropertiesSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [showUnitManagement, setShowUnitManagement] = useState<any>(null);
  const [showNoticesModal, setShowNoticesModal] = useState<string | null>(null);
  const [showBulkLateFee, setShowBulkLateFee] = useState<any>(null);

  const {
    properties,
    units,
    loading,
    createProperty,
    updateProperty,
    deleteProperty,
    createUnit,
    updateUnit,
    deleteUnit,
    getPropertyUnits,
    getOccupancyRate
  } = useProperties();

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditProperty = (property: any) => {
    setSelectedProperty(property);
    setShowPropertyForm(true);
  };

  const handleDeleteProperty = (propertyId: string) => {
    setPropertyToDelete(propertyId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (propertyToDelete) {
      await deleteProperty(propertyToDelete);
      setPropertyToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleFormSubmit = async (propertyData: any) => {
    if (selectedProperty) {
      await updateProperty(selectedProperty.id, propertyData);
    } else {
      await createProperty(propertyData);
    }
  };

  const handleManageUnits = (property: any) => {
    setShowUnitManagement(property);
  };

  if (showUnitManagement) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowUnitManagement(null)}
          className="gap-2"
        >
          ← Back to Properties
        </Button>
        <UnitManagement
          property={showUnitManagement}
          units={getPropertyUnits(showUnitManagement.id)}
          onCreateUnit={createUnit}
          onUpdateUnit={updateUnit}
          onDeleteUnit={deleteUnit}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  const totalUnits = properties.reduce((sum, p) => sum + p.total_units, 0);
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const totalRevenue = units
    .filter(u => u.status === 'occupied')
    .reduce((sum, u) => sum + u.rent_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Properties</h1>
          <p className="text-muted-foreground">Manage your rental properties and units</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedProperty(null);
            setShowPropertyForm(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">{filteredProperties.length} Properties</Badge>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => {
          const propertyUnits = getPropertyUnits(property.id);
          const occupiedCount = propertyUnits.filter(u => u.status === 'occupied').length;
          const vacantCount = propertyUnits.filter(u => u.status === 'vacant').length;
          const monthlyRevenue = propertyUnits
            .filter(u => u.status === 'occupied')
            .reduce((sum, u) => sum + u.rent_amount, 0);

          return (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.address}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Property Image */}
                  {property.images.length > 0 && (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <img 
                        src={property.images[0]} 
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{property.total_units}</div>
                      <div className="text-xs text-muted-foreground">Total Units</div>
                    </div>
                    <div className="text-center p-2 bg-success/10 rounded-lg">
                      <div className="text-lg font-bold text-success">{occupiedCount}</div>
                      <div className="text-xs text-muted-foreground">Occupied</div>
                    </div>
                  </div>

                  {vacantCount > 0 && (
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <div className="text-sm font-medium text-warning">
                        {vacantCount} vacant unit{vacantCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                    <span className="font-bold text-success">KES {monthlyRevenue.toLocaleString()}</span>
                  </div>

                  {/* Amenities */}
                  {property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.slice(0, 2).map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{property.amenities.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => handleManageUnits(property)}
                  >
                    <Settings className="h-4 w-4" />
                    Manage Units ({propertyUnits.length})
                  </Button>

                  {/* Bulk Late Fee Configuration */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowBulkLateFee(property)}
                  >
                    <Calculator className="h-4 w-4" />
                    Late Fee Policy
                  </Button>

                  {/* Notices Button */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowNoticesModal(property.id)}
                  >
                    <Bell className="h-4 w-4" />
                    Property Notices
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {filteredProperties.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first property'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => {
                    setSelectedProperty(null);
                    setShowPropertyForm(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Property
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalUnits}</div>
            <div className="text-sm text-muted-foreground">Total Units</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{occupiedUnits}</div>
            <div className="text-sm text-muted-foreground">Occupied Units</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{vacantUnits}</div>
            <div className="text-sm text-muted-foreground">Vacant Units</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Property Form Dialog */}
      <PropertyForm
        property={selectedProperty}
        open={showPropertyForm}
        onOpenChange={(open) => {
          setShowPropertyForm(open);
          if (!open) setSelectedProperty(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Notices Modal */}
      {showNoticesModal && (
        <NoticesModal
          isOpen={true}
          onClose={() => setShowNoticesModal(null)}
          propertyId={showNoticesModal}
          propertyName={properties.find(p => p.id === showNoticesModal)?.name || ''}
          units={getPropertyUnits(showNoticesModal)}
        />
      )}

      {/* Bulk Late Fee Configuration Modal */}
      {showBulkLateFee && (
        <BulkLateFeeModal
          open={!!showBulkLateFee}
          onOpenChange={(open) => !open && setShowBulkLateFee(null)}
          propertyId={showBulkLateFee.id}
          propertyName={showBulkLateFee.name}
          unitCount={getPropertyUnits(showBulkLateFee.id).length}
          onComplete={() => {
            // Optionally refresh data here if needed
            setShowBulkLateFee(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? This will also delete all associated units. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};