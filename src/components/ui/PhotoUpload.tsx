import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  onUpload: (result: { url: string; path: string; size: number }) => void;
  onRemove?: () => void;
  currentPhoto?: string;
  bucket: string;
  path: string;
  maxSize?: number;
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showPreview?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUpload,
  onRemove,
  currentPhoto,
  bucket,
  path,
  maxSize = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  compress = true,
  quality = 0.8,
  className,
  disabled = false,
  placeholder = "Click to upload photo",
  showPreview = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { uploadPhoto, uploading, progress } = usePhotoUpload();

  const handleFileSelect = async (file: File) => {
    const result = await uploadPhoto({
      bucket,
      path,
      file,
      maxSize,
      allowedTypes,
      compress,
      quality,
    });

    if (result) {
      onUpload(result);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <Card
        className={cn(
          "relative border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "cursor-wait"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(',')}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || uploading}
          />

          {showPreview && currentPhoto ? (
            <div className="relative">
              <img
                src={currentPhoto}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              {uploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                  <Progress value={progress} className="w-full max-w-xs" />
                </div>
              ) : (
                <>
                  <div className="rounded-full bg-muted p-3">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{placeholder}</p>
                    <p className="text-xs text-muted-foreground">
                      Max size: {maxSize}MB • {allowedTypes.map(t => t.split('/')[1]).join(', ')}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface MultiplePhotoUploadProps {
  onUpload: (results: Array<{ url: string; path: string; size: number }>) => void;
  onRemove?: (index: number) => void;
  currentPhotos?: string[];
  bucket: string;
  path: string;
  maxSize?: number;
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number;
  maxPhotos?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const MultiplePhotoUpload: React.FC<MultiplePhotoUploadProps> = ({
  onUpload,
  onRemove,
  currentPhotos = [],
  bucket,
  path,
  maxSize = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  compress = true,
  quality = 0.8,
  maxPhotos = 10,
  className,
  disabled = false,
  placeholder = "Click to upload photos",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { uploadMultiplePhotos, uploading, progress } = usePhotoUpload();

  const handleFilesSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxPhotos - currentPhotos.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      return;
    }

    const results = await uploadMultiplePhotos({
      bucket,
      path,
      files: filesToUpload,
      maxSize,
      allowedTypes,
      compress,
      quality,
    });

    if (results.length > 0) {
      onUpload(results);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading && currentPhotos.length < maxPhotos) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (index: number) => {
    if (onRemove) {
      onRemove(index);
    }
  };

  const canUploadMore = currentPhotos.length < maxPhotos;

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileChange}
        multiple
        className="hidden"
        disabled={disabled || uploading || !canUploadMore}
      />

      {/* Photo Grid */}
      {currentPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {currentPhotos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canUploadMore && (
        <Card
          className={cn(
            "relative border-2 border-dashed transition-colors cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            disabled && "opacity-50 cursor-not-allowed",
            uploading && "cursor-wait"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <CardContent className="p-6">
            {uploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={progress} className="w-full max-w-xs" />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-muted p-3">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{placeholder}</p>
                  <p className="text-xs text-muted-foreground">
                    Max size: {maxSize}MB • {allowedTypes.map(t => t.split('/')[1]).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentPhotos.length}/{maxPhotos} photos uploaded
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
