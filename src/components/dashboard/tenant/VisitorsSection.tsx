import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, Plus, Clock, User, Phone, Calendar, MapPin, 
  CheckCircle, XCircle, AlertCircle, Eye, Edit, Trash2, Camera, FileText
} from 'lucide-react';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const VisitorsSection = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    expected_arrival: '',
    expected_duration: '',
    special_instructions: ''
  });
  
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { 
    requests, 
    loading: requestsLoading, 
    createVisitorRequest, 
    cancelVisitorRequest,
    updateVisitorRequestStatus
  } = useVisitorRequests();
  
  const { visitors, loading: visitorsLoading } = useVisitors();

  // Camera functions
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
            const file = new File([blob], `id-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setIdPhotoFile(file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
              setIdPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Ensure video displays when stream is set
  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const video = videoRef.current;
      
      const playVideo = () => {
        video.play().catch(err => {
          console.error('Error playing video:', err);
        });
      };
      
      if (video.readyState >= 2) {
        // Video already has enough data
        playVideo();
      } else {
        video.onloadedmetadata = playVideo;
      }
    }
  }, [showCamera, stream]);

  // Close camera when modal closes
  useEffect(() => {
    if (!isCreateDialogOpen && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  }, [isCreateDialogOpen, stream]);

  const handleCreateRequest = async () => {
    if (!profile?.id) return;

    // Upload ID photo if provided
    let idDocumentUrl: string | undefined;
    if (idPhotoFile) {
      try {
        const fileExt = idPhotoFile.name.split('.').pop();
        const fileName = `visitor-request-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('visitor-id-photos')
          .upload(filePath, idPhotoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('ID photo upload error:', uploadError);
          toast({
            title: "Upload Warning",
            description: "Request submitted but ID photo upload failed",
            variant: "default"
          });
        } else {
          const { data: signedUrlData } = await supabase.storage
            .from('visitor-id-photos')
            .createSignedUrl(filePath, 31536000);
          
          if (signedUrlData?.signedUrl) {
            idDocumentUrl = signedUrlData.signedUrl;
          }
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    const success = await createVisitorRequest({
      ...newRequest,
      expected_duration: newRequest.expected_duration ? parseInt(newRequest.expected_duration) : undefined,
      id_document_url: idDocumentUrl
    });

    if (success) {
      setIsCreateDialogOpen(false);
      setNewRequest({
        visitor_name: '',
        visitor_phone: '',
        purpose: '',
        expected_arrival: '',
        expected_duration: '',
        special_instructions: ''
      });
      setIdPhotoFile(null);
      setIdPhotoPreview(null);
      setShowCamera(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const activeVisitors = visitors.filter(v => v.status === 'active');

  if (requestsLoading || visitorsLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground">Manage your visitor requests and view current visitors</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                Submit a visitor request for approval. Security will be notified once approved.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
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
                  placeholder="Any special instructions for security"
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
                        id="id_photo"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (max 10MB)
                            if (file.size > 10 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Please select an image under 10MB",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            setIdPhotoFile(file);
                            
                            // Create preview
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setIdPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="default"
                        onClick={startCamera}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('id_photo')?.click()}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Upload from Device
                      </Button>
                      
                      {idPhotoFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIdPhotoFile(null);
                            setIdPhotoPreview(null);
                            const input = document.getElementById('id_photo') as HTMLInputElement;
                            if (input) input.value = '';
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Photo Preview */}
                  {idPhotoPreview && !showCamera && (
                    <div className="relative w-full max-w-md border rounded-lg overflow-hidden">
                      <img
                        src={idPhotoPreview}
                        alt="ID Document Preview"
                        className="w-full h-auto max-h-64 object-contain bg-muted"
                      />
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {idPhotoFile?.name || 'Captured Photo'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 border-t flex-shrink-0">
              <Button 
                onClick={handleCreateRequest} 
                className="w-full"
                disabled={!newRequest.visitor_name || !newRequest.purpose || !newRequest.expected_arrival}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
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
            <p className="text-xs text-muted-foreground">Ready for visit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVisitors.length}</div>
            <p className="text-xs text-muted-foreground">Currently visiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Visitors */}
      {activeVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your Current Visitors
            </CardTitle>
            <CardDescription>Visitors currently at your unit</CardDescription>
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
                    <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Checked in: {format(new Date(visitor.time_in), 'MMM d, yyyy h:mm a')}
                    </p>
                    {visitor.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {visitor.visitor_phone}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitor Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Visitor Requests
          </CardTitle>
          <CardDescription>Track the status of your visitor requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No visitor requests yet</p>
                <p className="text-sm text-muted-foreground">Create your first visitor request to get started</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.expected_duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {request.expected_duration} minutes
                      </p>
                    )}
                    {request.security_notes && (
                      <p className="text-sm text-muted-foreground">
                        Security Notes: {request.security_notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'pending' && request.security_id && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateVisitorRequestStatus(request.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateVisitorRequestStatus(request.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'pending' && !request.security_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelVisitorRequest(request.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};