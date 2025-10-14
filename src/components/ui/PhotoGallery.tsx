import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
  photos: string[];
  onRemove?: (index: number) => void;
  onDownload?: (url: string, index: number) => void;
  className?: string;
  maxColumns?: number;
  showActions?: boolean;
  allowFullscreen?: boolean;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onRemove,
  onDownload,
  className,
  maxColumns = 4,
  showActions = true,
  allowFullscreen = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePhotoClick = (index: number) => {
    if (allowFullscreen) {
      setSelectedIndex(index);
      setIsFullscreen(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setSelectedIndex(null);
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleDownload = (url: string, index: number) => {
    if (onDownload) {
      onDownload(url, index);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRemove = (index: number) => {
    if (onRemove) {
      onRemove(index);
    }
  };

  if (photos.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>No photos available</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${Math.min(maxColumns, photos.length)}, 1fr)` }}>
        {photos.map((photo, index) => (
          <Card key={index} className="group relative overflow-hidden">
            <CardContent className="p-0">
              <div
                className="relative cursor-pointer"
                onClick={() => handlePhotoClick(index)}
              >
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                />
                {showActions && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    {onDownload && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(photo, index);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {onRemove && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Photo {selectedIndex !== null ? selectedIndex + 1 : 0} of {photos.length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseFullscreen}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative flex-1 flex items-center justify-center p-6">
            {selectedIndex !== null && (
              <>
                <img
                  src={photos[selectedIndex]}
                  alt={`Photo ${selectedIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain"
                />
                
                {/* Navigation buttons */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={handlePrevious}
                      disabled={selectedIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={handleNext}
                      disabled={selectedIndex === photos.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          {selectedIndex !== null && showActions && (
            <div className="flex items-center justify-center space-x-2 p-6 pt-0">
              {onDownload && (
                <Button
                  onClick={() => handleDownload(photos[selectedIndex], selectedIndex)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRemove(selectedIndex);
                    if (selectedIndex === photos.length - 1 && selectedIndex > 0) {
                      setSelectedIndex(selectedIndex - 1);
                    } else if (photos.length === 1) {
                      handleCloseFullscreen();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
