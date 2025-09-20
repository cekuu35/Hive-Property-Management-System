import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, Search, Filter, Home, DollarSign, Ruler, 
  Calendar, Star, ChevronRight, Building2, Bed
} from 'lucide-react';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { UnitApplicationModal } from './UnitApplicationModal';

interface UnitBrowsingProps {
  onBack?: () => void;
}

export const UnitBrowsing = ({ onBack }: UnitBrowsingProps) => {
  const { 
    properties, 
    vacantUnits, 
    loading, 
    getUnitsForProperty,
    hasAppliedToUnit 
  } = useUnitApplications();
  
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyToUnit = (unit: any) => {
    setSelectedUnit(unit);
    setShowApplicationModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading available units...</p>
        </div>
      </div>
    );
  }

  if (selectedProperty) {
    const propertyUnits = getUnitsForProperty(selectedProperty.id);

    return (
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSelectedProperty(null)}>
            ← Back to Properties
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>{selectedProperty.name}</span>
          </div>
        </div>

        {/* Property Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{selectedProperty.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  {selectedProperty.address}
                </CardDescription>
              </div>
              <Badge variant="secondary">{propertyUnits.length} units available</Badge>
            </div>
            {selectedProperty.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedProperty.description}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Available Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {propertyUnits.map((unit) => {
            const hasApplied = hasAppliedToUnit(unit.id);
            
            return (
              <Card key={unit.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      <Bed className="h-4 w-4" />
                      Unit {unit.unit_number}
                    </CardTitle>
                    <Badge variant={hasApplied ? "secondary" : "outline"}>
                      {hasApplied ? "Applied" : "Available"}
                    </Badge>
                  </div>
                  <CardDescription>{unit.type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Unit Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Rent
                      </span>
                      <span className="font-medium">KES {unit.rent_amount.toLocaleString()}/month</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Deposit
                      </span>
                      <span className="font-medium">KES {unit.deposit_amount.toLocaleString()}</span>
                    </div>
                    {unit.square_feet && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Area
                        </span>
                        <span className="font-medium">{unit.square_feet} sq ft</span>
                      </div>
                    )}
                  </div>

                  {/* Amenities */}
                  {unit.amenities && unit.amenities.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-1">
                        {unit.amenities.slice(0, 3).map((amenity: string, idx: number) => (
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
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    className="w-full"
                    disabled={hasApplied}
                    onClick={() => handleApplyToUnit(unit)}
                  >
                    {hasApplied ? "Application Submitted" : "Apply for Unit"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {propertyUnits.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Units Available</h3>
              <p className="text-muted-foreground">
                This property currently has no vacant units. Check back later or browse other properties.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unit Application Modal */}
        <UnitApplicationModal
          unit={selectedUnit}
          property={selectedProperty}
          open={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedUnit(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Browse Available Units</h2>
        <p className="text-muted-foreground">
          Find and apply for available rental units in our properties
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => {
          const availableUnits = getUnitsForProperty(property.id);
          
          return (
            <Card key={property.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {property.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {availableUnits.length} units
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {property.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {property.description}
                  </p>
                )}

                {/* Price Range */}
                {availableUnits.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rent from:</span>
                    <span className="font-medium">
                      KES {Math.min(...availableUnits.map(u => u.rent_amount)).toLocaleString()}/month
                    </span>
                  </div>
                )}

                {/* Amenities Preview */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {property.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{property.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <Button 
                  className="w-full"
                  onClick={() => setSelectedProperty(property)}
                  disabled={availableUnits.length === 0}
                >
                  {availableUnits.length > 0 ? (
                    <>
                      View Units
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    "No Units Available"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Properties Found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "No properties match your search criteria. Try different keywords."
                : "No properties are currently available for rent."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};