// Simple test to verify property filtering is working
console.log('🧪 Testing Property Filtering for Security Personnel');
console.log('=' .repeat(50));

// Test data simulation
const mockProperties = [
  { id: 'prop1', name: 'Sunset Apartments', address: '123 Main St' },
  { id: 'prop2', name: 'Garden Complex', address: '456 Oak Ave' },
  { id: 'prop3', name: 'City Towers', address: '789 Pine St' }
];

const mockStaffAssignments = [
  { staff_id: 'security1', property_id: 'prop1', role: 'security', is_active: true },
  { staff_id: 'security1', property_id: 'prop2', role: 'security', is_active: true }
];

const mockUnits = [
  { id: 'unit1', unit_number: '101', property_id: 'prop1' },
  { id: 'unit2', unit_number: '102', property_id: 'prop1' },
  { id: 'unit3', unit_number: '201', property_id: 'prop2' },
  { id: 'unit4', unit_number: '301', property_id: 'prop3' }
];

// Simulate the filtering logic
function testPropertyFiltering() {
  console.log('📋 Mock Data:');
  console.log('- Properties:', mockProperties.length);
  console.log('- Staff Assignments:', mockStaffAssignments.length);
  console.log('- Units:', mockUnits.length);
  
  // Test 1: Get assigned properties for security1
  const security1Assignments = mockStaffAssignments.filter(
    a => a.staff_id === 'security1' && a.role === 'security' && a.is_active
  );
  const assignedPropertyIds = security1Assignments.map(a => a.property_id);
  
  console.log('\n🔍 Security1 Assigned Properties:');
  console.log('- Property IDs:', assignedPropertyIds);
  
  const assignedProperties = mockProperties.filter(p => assignedPropertyIds.includes(p.id));
  console.log('- Properties:', assignedProperties.map(p => p.name));
  
  // Test 2: Get units from assigned properties
  const assignedUnits = mockUnits.filter(u => assignedPropertyIds.includes(u.property_id));
  console.log('\n🏠 Units from Assigned Properties:');
  console.log('- Units:', assignedUnits.map(u => `${u.unit_number} (${u.property_id})`));
  
  // Test 3: Simulate visitor requests filtering
  const mockVisitorRequests = [
    { id: 'req1', unit_id: 'unit1', visitor_name: 'John Doe', status: 'pending' },
    { id: 'req2', unit_id: 'unit3', visitor_name: 'Jane Smith', status: 'approved' },
    { id: 'req3', unit_id: 'unit4', visitor_name: 'Bob Johnson', status: 'pending' }
  ];
  
  const assignedUnitIds = assignedUnits.map(u => u.id);
  const filteredRequests = mockVisitorRequests.filter(req => assignedUnitIds.includes(req.unit_id));
  
  console.log('\n👥 Visitor Requests for Security1:');
  console.log('- All requests:', mockVisitorRequests.length);
  console.log('- Filtered requests:', filteredRequests.length);
  console.log('- Requests:', filteredRequests.map(r => `${r.visitor_name} (${r.status})`));
  
  // Test 4: Soft landing fallback
  console.log('\n🛬 Soft Landing Test:');
  console.log('- If no assignments, show all properties:', mockProperties.length);
  console.log('- If no assignments, show all units:', mockUnits.length);
  
  console.log('\n✅ Property filtering test completed!');
  console.log('💡 Security personnel should only see data from assigned properties');
}

testPropertyFiltering();







