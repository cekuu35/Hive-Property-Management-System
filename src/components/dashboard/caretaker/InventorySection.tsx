import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Minus, AlertTriangle, Search, Edit, Trash2 } from 'lucide-react';
import { usePropertyInventory } from '@/hooks/usePropertyInventory';
import { useCaretakerProperties } from '@/hooks/useCaretakerProperties';

interface InventoryItem {
  id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  category: string;
  location?: string | null;
  supplier?: string | null;
  cost_per_unit?: number | null;
  last_restocked_at: string | null;
  last_restocked_by?: string | null;
  notes?: string | null;
  property_id?: string;
  stock_status?: string;
  property_name?: string;
}

export const InventorySection = () => {
  const { selectedPropertyId } = useCaretakerProperties();
  const { 
    inventory, 
    loading, 
    updateStock,
    updateInventoryItem,
    addInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    getStats
  } = usePropertyInventory(selectedPropertyId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    item_name: '',
    current_stock: 0,
    minimum_stock: 0,
    unit: 'pieces',
    category: 'other'
  });

  const filteredInventory = inventory.filter(item => {
    if (!item || !item.item_name) return false;
    const search = searchTerm.toLowerCase();
    return item.item_name.toLowerCase().includes(search) ||
      (item.category && item.category.toLowerCase().includes(search));
  });

  const getStockStatus = (current: number, minimum: number): 'low' | 'medium' | 'good' => {
    if (current <= minimum) return 'low';
    if (current <= minimum * 1.5) return 'medium';
    return 'good';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'low': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-primary text-primary-foreground';
      case 'good': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  const lowStockItems = getLowStockItems();

  const handleStockAdjustment = async (type: 'add' | 'remove') => {
    if (!selectedItem || adjustmentAmount <= 0) return;

    try {
      const newStock = type === 'add' 
        ? selectedItem.current_stock + adjustmentAmount 
        : selectedItem.current_stock - adjustmentAmount;
      
      if (newStock < 0) {
        alert('Stock cannot be negative!');
        return;
      }
      
      await updateStock(selectedItem.id, newStock);
      setIsAdjustDialogOpen(false);
      setAdjustmentAmount(0);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedPropertyId) {
      alert('No property selected!');
      return;
    }
    
    try {
      // Add property_id to the form data
      await addInventoryItem({
        ...formData,
        property_id: selectedPropertyId
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    
    try {
      await updateInventoryItem(selectedItem.id, formData);
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete ${item.item_name}?`)) {
      try {
        await deleteInventoryItem(item.id);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const openAdjustmentDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustDialogOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      unit: item.unit,
      category: item.category
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      current_stock: 0,
      minimum_stock: 0,
      unit: 'pieces',
      category: 'other'
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage maintenance supplies</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Alerts for Low Stock */}
      {lowStockItems.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <p key={item.id} className="text-sm">
                  • {item.item_name}: {item.current_stock} {item.unit} remaining (min: {item.minimum_stock})
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value || '')}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => {
          const status = getStockStatus(item.current_stock, item.minimum_stock);
          return (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.item_name}</CardTitle>
                    <CardDescription>{item.category || 'other'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStockColor(status)}>
                      {status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Stock:</span>
                    <span className="font-bold text-lg">{item.current_stock} {item.unit || 'items'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Minimum Stock:</span>
                    <span className="text-sm">{item.minimum_stock} {item.unit || 'items'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Restocked:</span>
                    <span className="text-sm">
                      {item.last_restocked_at ? new Date(item.last_restocked_at).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <Button 
                    onClick={() => openAdjustmentDialog(item)}
                    className="w-full"
                    variant="outline"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Adjust Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.item_name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedItem?.current_stock} {selectedItem?.unit || 'items'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjustment">Adjustment Amount</Label>
              <Input
                id="adjustment"
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                placeholder="Enter amount"
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleStockAdjustment('add')}
                className="flex-1"
                disabled={adjustmentAmount <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
              <Button 
                onClick={() => handleStockAdjustment('remove')}
                variant="outline"
                className="flex-1"
                disabled={adjustmentAmount <= 0}
              >
                <Minus className="h-4 w-4 mr-2" />
                Remove Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Add a new item to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="paint">Paint</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., pieces, gallons"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_stock">Current Stock</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="minimum_stock">Minimum Stock</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: Number(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddItem}
                className="flex-1"
                disabled={!formData.item_name || !formData.category || !formData.unit}
              >
                Add Item
              </Button>
              <Button 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update item details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_item_name">Item Name</Label>
              <Input
                id="edit_item_name"
                value={formData.item_name}
                onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="paint">Paint</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_unit">Unit</Label>
                <Input
                  id="edit_unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., pieces, gallons"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_current_stock">Current Stock</Label>
                <Input
                  id="edit_current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="edit_minimum_stock">Minimum Stock</Label>
                <Input
                  id="edit_minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: Number(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleEditItem}
                className="flex-1"
                disabled={!formData.item_name || !formData.category || !formData.unit}
              >
                Update Item
              </Button>
              <Button 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                  setSelectedItem(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};