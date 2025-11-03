import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  UserCheck, Plus, Clock, User, Phone, Calendar, MapPin, 
  CheckCircle, XCircle, AlertCircle, Eye, Edit, Trash2, Bell,
  Search, Check, ChevronsUpDown, Building, Users, QrCode, Camera, FileText
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { useSecurityUnits } from '@/hooks/useSecurityUnits';
import { VisitorRegistrationModal } from './VisitorRegistrationModal';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const SecurityVisitorManagement = () => {
  const [isCreateRequestDialogOpen, setIsCreateRequestDialogOpen] = useState(false);
  const [isVisitorRegistrationOpen, setIsVisitorRegistrationOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [selectedVisitorDetails, setSelectedVisitorDetails] = useState<any>(null);
  const [isVisitorDetailsOpen, setIsVisitorDetailsOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    expected_arrival: '',
    expected_duration: '',
    special_instructions: ''
  });
  
  // Photo capture states for Request Visitor Access form
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Check-in modal states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedRequestForCheckIn, setSelectedRequestForCheckIn] = useState<any>(null);
  const [checkInIdPhotoFile, setCheckInIdPhotoFile] = useState<File | null>(null);
  const [checkInIdPhotoPreview, setCheckInIdPhotoPreview] = useState<string | null>(null);
  const [showCheckInCamera, setShowCheckInCamera] = useState(false);
  const [checkInStream, setCheckInStream] = useState<MediaStream | null>(null);
  const checkInVideoRef = useRef<HTMLVideoElement>(null);
  const checkInCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { profile } = useAuth();

  const { 
    requests, 
    loading: requestsLoading, 
    createSecurityVisitorRequest, 
    updateVisitorRequestStatus 
  } = useVisitorRequests();
  
  const { 
    visitors, 
    loading: visitorsLoading, 
    registerVisitorFromApprovedRequest, 
    checkOutVisitor, 
    getStats 
  } = useVisitors();

  const { 
    occupiedUnits, 
    loading: unitsLoading, 
    getGroupedUnits, 
    searchUnits 
  } = useSecurityUnits();
  
  const { toast } = useToast();

  // Get filtered units based on search term
  const filteredUnits = unitSearchTerm ? searchUnits(unitSearchTerm) : occupiedUnits;
  const groupedUnits = getGroupedUnits();

  // Get selected unit details
  const selectedUnitDetails = occupiedUnits.find(unit => 
    `${unit.tenant_id}-${unit.unit_id}` === selectedUnit
  );

  const stats = getStats();

  // Set up real-time subscriptions for automatic updates
  useEffect(() => {
    const requestsChannel = supabase
      .channel('visitor_requests_security')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_requests'
        },
        () => {
          // Trigger refetch in the useVisitorRequests hook
        }
      )
      .subscribe();

    const visitorsChannel = supabase
      .channel('visitors_security')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitors'
        },
        () => {
          // Trigger refetch in the useVisitors hook
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(visitorsChannel);
    };
  }, []);

  // Camera functions for Request Visitor Access form
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use file upload instead.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'id-photo.jpg', { type: 'image/jpeg' });
            setIdPhotoFile(file);
            setIdPhotoPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Camera functions for Check-In modal
  const startCheckInCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setCheckInStream(mediaStream);
      setShowCheckInCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use file upload instead.",
        variant: "destructive"
      });
    }
  };

  const stopCheckInCamera = () => {
    if (checkInStream) {
      checkInStream.getTracks().forEach(track => track.stop());
      setCheckInStream(null);
    }
    setShowCheckInCamera(false);
  };

  const captureCheckInPhoto = () => {
    if (checkInVideoRef.current && checkInCanvasRef.current) {
      const video = checkInVideoRef.current;
      const canvas = checkInCanvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'checkin-id-photo.jpg', { type: 'image/jpeg' });
            setCheckInIdPhotoFile(file);
            setCheckInIdPhotoPreview(URL.createObjectURL(blob));
            stopCheckInCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Cleanup camera streams
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (checkInStream) {
        checkInStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, checkInStream]);

  // Ensure video displays when streams are set
  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const video = videoRef.current;
      const playVideo = () => {
        video.play().catch(err => console.error('Error playing video:', err));
      };
      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.onloadedmetadata = playVideo;
      }
    }
  }, [showCamera, stream]);

  useEffect(() => {
    if (showCheckInCamera && checkInVideoRef.current && checkInStream) {
      checkInVideoRef.current.srcObject = checkInStream;
      const video = checkInVideoRef.current;
      const playVideo = () => {
        video.play().catch(err => console.error('Error playing video:', err));
      };
      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.onloadedmetadata = playVideo;
      }
    }
  }, [showCheckInCamera, checkInStream]);

  // Close cameras when modals close
  useEffect(() => {
    if (!isCreateRequestDialogOpen && stream) {
      stopCamera();
      setIdPhotoFile(null);
      setIdPhotoPreview(null);
    }
  }, [isCreateRequestDialogOpen]);

  useEffect(() => {
    if (!isCheckInModalOpen && checkInStream) {
      stopCheckInCamera();
    }
  }, [isCheckInModalOpen]);

  const handleCreateRequest = async () => {
    if (!selectedUnit) {
      toast({
        title: "Error",
        description: "Please select a tenant and unit",
        variant: "destructive"
      });
      return;
    }

    const unitDetails = occupiedUnits.find(unit => 
      `${unit.tenant_id}-${unit.unit_id}` === selectedUnit
    );
    if (!unitDetails) return;

    // Upload photo if provided
    let idDocumentUrl: string | undefined = undefined;
    if (idPhotoFile && profile?.id) {
      try {
        const fileExt = idPhotoFile.name.split('.').pop();
        const fileName = `request-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visitor-id-photos')
          .upload(filePath, idPhotoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          const { data: signedUrlData } = await supabase.storage
            .from('visitor-id-photos')
            .createSignedUrl(filePath, 31536000);
          
          if (signedUrlData?.signedUrl) {
            idDocumentUrl = signedUrlData.signedUrl;
          }
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast({
          title: "Upload Warning",
          description: "Request created but photo upload failed",
          variant: "default"
        });
      }
    }

    const success = await createSecurityVisitorRequest({
      ...newRequest,
      tenant_id: unitDetails.tenant_id,
      id_document_url: idDocumentUrl,
      expected_duration: newRequest.expected_duration ? parseInt(newRequest.expected_duration) : undefined
    });

    if (success) {
      setIsCreateRequestDialogOpen(false);
      setNewRequest({
        visitor_name: '',
        visitor_phone: '',
        purpose: '',
        expected_arrival: '',
        expected_duration: '',
        special_instructions: ''
      });
      setSelectedUnit('');
      setUnitSearchTerm('');
      setIdPhotoFile(null);
      setIdPhotoPreview(null);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    await updateVisitorRequestStatus(requestId, 'approved');
  };

  const handleRejectRequest = async (requestId: string) => {
    await updateVisitorRequestStatus(requestId, 'rejected', 'Request rejected by security');
  };

  const handleRegisterApprovedVisitor = (request: any) => {
    setSelectedRequestForCheckIn(request);
    setIsCheckInModalOpen(true);
  };
  
  const handleConfirmCheckIn = async () => {
    if (!selectedRequestForCheckIn) return;
    
    let idDocumentUrl = selectedRequestForCheckIn.id_document_url;
    
    // Upload check-in photo if taken
    if (checkInIdPhotoFile && profile?.id) {
      try {
        const fileExt = checkInIdPhotoFile.name.split('.').pop();
        const fileName = `checkin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visitor-id-photos')
          .upload(filePath, checkInIdPhotoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          const { data: signedUrlData } = await supabase.storage
            .from('visitor-id-photos')
            .createSignedUrl(filePath, 31536000);
          
          if (signedUrlData?.signedUrl) {
            idDocumentUrl = signedUrlData.signedUrl;
          }
        }
      } catch (error) {
        console.error('Error uploading check-in photo:', error);
      }
    }
    
    // Register visitor with photo
    const success = await registerVisitorFromApprovedRequest(
      selectedRequestForCheckIn.id, 
      idDocumentUrl ? { id_document_url: idDocumentUrl } : undefined
    );
    
    if (success) {
      setIsCheckInModalOpen(false);
      setSelectedRequestForCheckIn(null);
      setCheckInIdPhotoFile(null);
      setCheckInIdPhotoPreview(null);
      stopCheckInCamera();
    }
  };

  const handleCheckOut = async (visitorId: string) => {
    await checkOutVisitor(visitorId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'expired': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVisitorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary text-primary-foreground';
      case 'checked_out': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter requests by type
  const tenantRequests = requests.filter(r => !r.security_id && r.status === 'pending');
  const securityRequests = requests.filter(r => r.security_id);
  
  // Filter approved requests that haven't been registered as visitors yet
  const approvedRequests = requests.filter(r => {
    if (r.status !== 'approved') return false;
    
    // Check if this request has already been registered as a visitor
    const alreadyRegistered = visitors.some(v => v.visitor_request_id === r.id);
    return !alreadyRegistered;
  });
  
  const activeVisitors = visitors.filter(v => v.status === 'active');
  
  // Filter approved requests that have already been registered as visitors
  const registeredRequests = requests.filter(r => {
    if (r.status !== 'approved') return false;
    
    // Check if this request has already been registered as a visitor
    const alreadyRegistered = visitors.some(v => v.visitor_request_id === r.id);
    return alreadyRegistered;
  });

  if (requestsLoading || visitorsLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading visitor management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Visitor Management</h1>
          <p className="text-muted-foreground">Manage visitor requests and registrations</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsVisitorRegistrationOpen(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Quick Register
          </Button>
          
          <Dialog open={isCreateRequestDialogOpen} onOpenChange={setIsCreateRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Visitor Access
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <DialogTitle>Request Visitor Access</DialogTitle>
                <DialogDescription>
                  Create a visitor request that requires tenant approval before registration.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                <div className="space-y-2">
                  <Label htmlFor="tenant_unit" className="text-sm font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Tenant & Unit Selection
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Search and select from {occupiedUnits.length} occupied units
                  </p>
                  <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={unitSearchOpen}
                        className="w-full justify-between h-auto p-3"
                      >
                        {selectedUnitDetails ? (
                          <div className="flex flex-col items-start text-left">
                            <span className="font-medium">{selectedUnitDetails.tenant_name}</span>
                            <span className="text-xs text-muted-foreground">
                              Unit {selectedUnitDetails.unit_number} • {selectedUnitDetails.property_name}
                            </span>
                            {selectedUnitDetails.tenant_phone && (
                              <span className="text-xs text-muted-foreground">
                                📞 {selectedUnitDetails.tenant_phone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search tenant or unit...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search by tenant name, unit number, or property..." 
                          value={unitSearchTerm}
                          onValueChange={setUnitSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No occupied units found.</CommandEmpty>
                          {Object.entries(groupedUnits).map(([propertyName, units]) => (
                            <CommandGroup key={propertyName} heading={propertyName}>
                              {units.map((unit) => (
                                <CommandItem
                                  key={`${unit.tenant_id}-${unit.unit_id}`}
                                  value={`${unit.tenant_name} ${unit.unit_number} ${unit.property_name}`}
                                  onSelect={() => {
                                    setSelectedUnit(`${unit.tenant_id}-${unit.unit_id}`);
                                    setUnitSearchOpen(false);
                                    setUnitSearchTerm('');
                                  }}
                                  className="flex flex-col items-start p-3 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-primary" />
                                      <span className="font-medium">{unit.tenant_name}</span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        selectedUnit === `${unit.tenant_id}-${unit.unit_id}` 
                                          ? "opacity-100" 
                                          : "opacity-0"
                                      )}
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Unit {unit.unit_number} • {unit.property_address}
                                  </div>
                                  {unit.tenant_phone && (
                                    <div className="text-xs text-muted-foreground">
                                      📞 {unit.tenant_phone}
                                    </div>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {occupiedUnits.length === 0 && (
                    <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
                      <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No occupied units found. Ensure tenants have active leases.
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="visitor_name">Visitor Name</Label>
                  <Input
                    id="visitor_name"
                    placeholder="Full name of visitor"
                    value={newRequest.visitor_name}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="visitor_phone">Phone Number (Optional)</Label>
                  <Input
                    id="visitor_phone"
                    placeholder="Visitor's phone number"
                    value={newRequest.visitor_phone}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_phone: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="purpose">Purpose of Visit</Label>
                  <Input
                    id="purpose"
                    placeholder="Reason for the visit"
                    value={newRequest.purpose}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expected_arrival">Expected Arrival</Label>
                  <Input
                    id="expected_arrival"
                    type="datetime-local"
                    value={newRequest.expected_arrival}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, expected_arrival: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expected_duration">Expected Duration (minutes)</Label>
                  <Input
                    id="expected_duration"
                    type="number"
                    placeholder="How long will the visit take?"
                    value={newRequest.expected_duration}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, expected_duration: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
                  <Textarea
                    id="special_instructions"
                    placeholder="Any special instructions"
                    value={newRequest.special_instructions}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, special_instructions: e.target.value }))}
                  />
                </div>

                {/* ID Document Photo Upload */}
                <div>
                  <Label htmlFor="id_photo">ID Document Photo (Optional)</Label>
                  <div className="mt-2 space-y-3">
                    {/* Camera View */}
                    {showCamera && (
                      <div className="border rounded-lg p-4 bg-muted">
                        <div className="relative w-full flex justify-center">
                          <div className="relative w-full max-w-md aspect-video">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full rounded-lg object-cover"
                              style={{ 
                                backgroundColor: '#000',
                                display: 'block'
                              }}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-center">
                          <Button
                            type="button"
                            onClick={capturePhoto}
                            className="flex items-center gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Capture Photo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={stopCamera}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Upload Options */}
                    {!showCamera && (
                      <div className="flex items-center gap-4 flex-wrap">
                        <input
                          type="file"
                          id="id_photo_upload"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: "File Too Large",
                                  description: "Please select an image smaller than 10MB",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setIdPhotoFile(file);
                              setIdPhotoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('id_photo_upload')?.click()}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Upload from Device
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startCamera}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Take Photo
                        </Button>
                        {(idPhotoFile || idPhotoPreview) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIdPhotoFile(null);
                              setIdPhotoPreview(null);
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Photo Preview */}
                    {idPhotoPreview && !showCamera && (
                      <div className="mt-4">
                        <img
                          src={idPhotoPreview}
                          alt="ID preview"
                          className="w-full max-w-md mx-auto rounded-lg border"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                        />
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {idPhotoFile?.name || 'Photo preview'}
                          {idPhotoFile && ` (${(idPhotoFile.size / 1024).toFixed(1)} KB)`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
              <div className="px-6 pb-6 pt-4 border-t flex-shrink-0">
                <Button 
                  onClick={handleCreateRequest} 
                  className="w-full"
                  disabled={!newRequest.visitor_name || !newRequest.purpose || !newRequest.expected_arrival || !selectedUnit}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Request to Tenant
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Requests</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Ready to register</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently on property</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysVisitors}</div>
            <p className="text-xs text-muted-foreground">Visitors today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Requests Needing Approval */}
      {tenantRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Tenant Visitor Requests
            </CardTitle>
            <CardDescription>Requests from tenants that need your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.expected_duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {request.expected_duration} minutes
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveRequest(request.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Requests Ready for Registration */}
      {approvedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approved Requests - Ready to Register
            </CardTitle>
            <CardDescription>These visitors have been approved and can now be registered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-success/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visiting: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {request.visitor_phone}</p>
                    )}
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleRegisterApprovedVisitor(request)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Check In Visitor
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Visitors */}
      {activeVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Active Visitors
            </CardTitle>
            <CardDescription>Visitors currently on property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge className={getVisitorStatusColor(visitor.status)}>
                        {visitor.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visiting: {visitor.unit?.unit_number || 'Unknown Unit'} - {visitor.tenant?.first_name} {visitor.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Checked in: {format(new Date(visitor.time_in), 'h:mm a')}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    {visitor.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {visitor.visitor_phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedVisitorDetails(visitor);
                        setIsVisitorDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCheckOut(visitor.id)}
                    >
                      Check Out
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registered Requests - Already Checked In */}
      {registeredRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Registered Visitors
            </CardTitle>
            <CardDescription>Approved requests that have been checked in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {registeredRequests.map((request) => {
                // Find the corresponding visitor record
                const visitor = visitors.find(v => v.visitor_request_id === request.id);
                return (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{request.visitor_name}</h3>
                        <Badge className="bg-green-100 text-green-800">
                          Checked In
                        </Badge>
                        {visitor && (
                          <Badge className={getVisitorStatusColor(visitor.status)}>
                            {visitor.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visiting: {request.tenant?.first_name} {request.tenant?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                      {visitor && (
                        <p className="text-sm text-muted-foreground">
                          Checked in: {format(new Date(visitor.time_in), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                      {request.visitor_phone && (
                        <p className="text-sm text-muted-foreground">Phone: {request.visitor_phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {visitor && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedVisitorDetails(visitor);
                            setIsVisitorDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      )}
                      {visitor && visitor.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCheckOut(visitor.id)}
                        >
                          Check Out
                        </Button>
                      )}
                      {visitor && visitor.status === 'checked_out' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Already Checked Out
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security's Own Requests */}
      {securityRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Visitor Requests
            </CardTitle>
            <CardDescription>Visitor requests you've submitted to tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-In Modal with Photo Capture */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Check In Visitor</DialogTitle>
            <DialogDescription>
              Take a photo of the visitor's ID document before checking them in
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {selectedRequestForCheckIn && (
              <>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-medium">{selectedRequestForCheckIn.visitor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Visiting: {selectedRequestForCheckIn.tenant?.first_name} {selectedRequestForCheckIn.tenant?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">Purpose: {selectedRequestForCheckIn.purpose}</p>
                </div>

                {/* ID Document Photo Upload */}
                <div>
                  <Label htmlFor="checkin_id_photo">ID Document Photo (Recommended)</Label>
                  <div className="mt-2 space-y-3">
                    {/* Camera View */}
                    {showCheckInCamera && (
                      <div className="border rounded-lg p-4 bg-muted">
                        <div className="relative w-full flex justify-center">
                          <div className="relative w-full max-w-md aspect-video">
                            <video
                              ref={checkInVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full rounded-lg object-cover"
                              style={{ 
                                backgroundColor: '#000',
                                display: 'block'
                              }}
                            />
                            <canvas ref={checkInCanvasRef} className="hidden" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-center">
                          <Button
                            type="button"
                            onClick={captureCheckInPhoto}
                            className="flex items-center gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Capture Photo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={stopCheckInCamera}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Upload Options */}
                    {!showCheckInCamera && (
                      <div className="flex items-center gap-4 flex-wrap">
                        <input
                          type="file"
                          id="checkin_id_photo_upload"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: "File Too Large",
                                  description: "Please select an image smaller than 10MB",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setCheckInIdPhotoFile(file);
                              setCheckInIdPhotoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('checkin_id_photo_upload')?.click()}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Upload from Device
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={startCheckInCamera}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Take Photo
                        </Button>
                        {(checkInIdPhotoFile || checkInIdPhotoPreview) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCheckInIdPhotoFile(null);
                              setCheckInIdPhotoPreview(null);
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Photo Preview */}
                    {checkInIdPhotoPreview && !showCheckInCamera && (
                      <div className="mt-4">
                        <img
                          src={checkInIdPhotoPreview}
                          alt="ID preview"
                          className="w-full max-w-md mx-auto rounded-lg border"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                        />
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {checkInIdPhotoFile?.name || 'Photo preview'}
                          {checkInIdPhotoFile && ` (${(checkInIdPhotoFile.size / 1024).toFixed(1)} KB)`}
                        </p>
                      </div>
                    )}

                    {selectedRequestForCheckIn.id_document_url && !checkInIdPhotoPreview && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          ID photo already uploaded from request: {selectedRequestForCheckIn.visitor_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="px-6 pb-6 pt-4 border-t flex-shrink-0 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCheckInModalOpen(false);
                stopCheckInCamera();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCheckIn}
              className="flex-1"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Check In
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visitor Details Modal */}
      <Dialog open={isVisitorDetailsOpen} onOpenChange={setIsVisitorDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visitor Details
            </DialogTitle>
            <DialogDescription>
              Complete visitor information including ID document
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisitorDetails && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Visitor Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedVisitorDetails.visitor_name}</p>
                  </div>
                  {selectedVisitorDetails.visitor_phone && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedVisitorDetails.visitor_phone}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">Visiting Unit</Label>
                    <p className="font-medium">
                      {selectedVisitorDetails.unit?.unit_number || 'Unknown Unit'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tenant</Label>
                    <p className="font-medium">
                      {selectedVisitorDetails.tenant?.first_name} {selectedVisitorDetails.tenant?.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Purpose</Label>
                    <p className="font-medium">{selectedVisitorDetails.purpose}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge className={getVisitorStatusColor(selectedVisitorDetails.status)}>
                      {selectedVisitorDetails.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Checked In</Label>
                    <p className="font-medium">
                      {format(new Date(selectedVisitorDetails.time_in), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {selectedVisitorDetails.time_out && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Checked Out</Label>
                      <p className="font-medium">
                        {format(new Date(selectedVisitorDetails.time_out), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                  {selectedVisitorDetails.emergency_contact && (
                    <div className="col-span-2">
                      <Label className="text-sm text-muted-foreground">Emergency Contact</Label>
                      <p className="font-medium">{selectedVisitorDetails.emergency_contact}</p>
                    </div>
                  )}
                  {selectedVisitorDetails.security_notes && (
                    <div className="col-span-2">
                      <Label className="text-sm text-muted-foreground">Security Notes</Label>
                      <p className="font-medium">{selectedVisitorDetails.security_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ID Document Photo */}
              {selectedVisitorDetails.id_document_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      ID Document
                    </CardTitle>
                    <CardDescription>Visitor's identification document photo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedVisitorDetails.id_document_url}
                        alt="ID Document"
                        className="w-full h-auto max-h-96 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="p-8 text-center text-muted-foreground">
                                <svg class="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p>ID Document photo not available</p>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        window.open(selectedVisitorDetails.id_document_url, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!selectedVisitorDetails.id_document_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      ID Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-8 text-center text-muted-foreground border rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No ID document photo available</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visitor Registration Modal */}
      <VisitorRegistrationModal
        isOpen={isVisitorRegistrationOpen}
        onClose={() => setIsVisitorRegistrationOpen(false)}
        onSuccess={() => {
          // Refresh data after successful registration
          // The hooks will automatically update due to real-time subscriptions
        }}
      />
    </div>
  );
};
