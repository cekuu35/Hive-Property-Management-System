import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Home, Users, DollarSign, Square, Eye, Wrench, FileText } from 'lucide-react';
import { UnitForm } from './UnitForm';
import { UnitDetailsModal } from './UnitDetailsModal';
import { useCanAddResource } from '@/components/subscription/SubscriptionGuard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Unit {
  id: string;
  unit_number: string;
  type: string;
  rent_amount: number;
  deposit_amount: number;
  square_feet?: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  images: string[];
  amenities: string[];
}

interface UnitManagementProps {
  property: any;
  units: Unit[];
  onCreateUnit: (unitData: any) => Promise<any>;
  onUpdateUnit: (id: string, updates: any) => Promise<any>;
  onDeleteUnit: (id: string) => Promise<void>;
}

export const UnitManagement = ({ 
  property, 
  units, 
  onCreateUnit, 
  onUpdateUnit, 
  onDeleteUnit 
}: UnitManagementProps) => {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);

  const canAddUnit = useCanAddResource('max_units');
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'default';
      case 'vacant': return 'secondary';
      case 'maintenance': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Occupied';
      case 'vacant': return 'Vacant';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowUnitForm(true);
  };

  const handleViewUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowUnitDetails(true);
  };

  const handleDeleteUnit = (unitId: string) => {
    setUnitToDelete(unitId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (unitToDelete) {
      await onDeleteUnit(unitToDelete);
      setUnitToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleFormSubmit = async (unitData: any) => {
    if (selectedUnit) {
      // Editing existing unit - no limit check needed
      await onUpdateUnit(selectedUnit.id, unitData);
    } else {
      // Creating new unit - check subscription limit
      const check = canAddUnit();
      if (!check.allowed) {
        toast.error(
          check.reason === 'no_subscription' ? "Subscription Required" : "Unit Limit Reached",
          {
            description: check.message
          }
        );
        navigate('/landlord/plans-billing');
        return;
      }
      await onCreateUnit(unitData);
    }
  };

  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
  const totalRevenue = units
    .filter(u => u.status === 'occupied')
    .reduce((sum, u) => sum + u.rent_amount, 0);

  return (
    <div className="space-y-6">
      {/* Unit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{units.length}</div>
                <div className="text-sm text-muted-foreground">Total Units</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">{occupiedUnits}</div>
                <div className="text-sm text-muted-foreground">Occupied</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-warning" />
              <div>
                <div className="text-2xl font-bold text-warning">{vacantUnits}</div>
                <div className="text-sm text-muted-foreground">Vacant</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <div className="text-lg font-bold">KES {totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Monthly Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Unit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Units in {property.name}</h3>
          <p className="text-sm text-muted-foreground">Manage individual units</p>
        </div>
        <Button 
          onClick={() => {
            // Check subscription before opening form
            const check = canAddUnit();
            if (!check.allowed) {
              toast.error(
                check.reason === 'no_subscription' ? "Subscription Required" : "Unit Limit Reached",
                {
                  description: check.message
                }
              );
              navigate('/landlord/plans-billing');
              return;
            }
            setSelectedUnit(null);
            setShowUnitForm(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit) => (
          <Card key={unit.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Unit {unit.unit_number}</CardTitle>
                  <CardDescription>{unit.type}</CardDescription>
                </div>
                <Badge variant={getStatusColor(unit.status)}>
                  {getStatusLabel(unit.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Unit Image */}
                {unit.images.length > 0 && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={unit.images[0]} 
                      alt={`Unit ${unit.unit_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Financial Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Rent:</span>
                    <div className="font-semibold">KES {(unit.rent_amount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit:</span>
                    <div className="font-semibold">KES {(unit.deposit_amount || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Square Feet */}
                {unit.square_feet && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Size: </span>
                    <span className="font-medium">{unit.square_feet} sq ft</span>
                  </div>
                )}

                {/* Amenities */}
                {unit.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unit.amenities.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {unit.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{unit.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewUnit(unit)}
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUnit(unit)}
                    className="gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {units.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Units Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding units to this property
              </p>
              <Button 
                onClick={() => {
                  // Check subscription before opening form
                  const check = canAddUnit();
                  if (!check.allowed) {
                    toast.error(
                      check.reason === 'no_subscription' ? "Subscription Required" : "Unit Limit Reached",
                      {
                        description: check.message
                      }
                    );
                    navigate('/landlord/plans-billing');
                    return;
                  }
                  setSelectedUnit(null);
                  setShowUnitForm(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Unit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Unit Form Dialog */}
      <UnitForm
        unit={selectedUnit}
        propertyId={property.id}
        open={showUnitForm}
        onOpenChange={(open) => {
          setShowUnitForm(open);
          if (!open) setSelectedUnit(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Unit Details Modal */}
      <UnitDetailsModal
        unit={selectedUnit}
        open={showUnitDetails}
        onOpenChange={(open) => {
          setShowUnitDetails(open);
          if (!open) setSelectedUnit(null);
        }}
        onEdit={() => {
          setShowUnitDetails(false);
          setShowUnitForm(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this unit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};