import { useState } from 'react';
import { MultiplePhotoUpload } from '@/components/ui/PhotoUpload';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { Label } from '@/components/ui/label';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  entityId: string;
  maxImages?: number;
  className?: string;
}

export const ImageUpload = ({ images, onImagesChange, entityId, maxImages = 10, className }: ImageUploadProps) => {
  const { deletePhoto } = usePhotoUpload();

  const handleUpload = (results: Array<{ url: string; path: string; size: number }>) => {
    const newUrls = results.map(result => result.url);
    onImagesChange([...images, ...newUrls]);
  };

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index];
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    // Try to delete from storage (don't block UI if it fails)
    try {
      // Extract path from URL for deletion
      const urlParts = imageToRemove.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${entityId}/${fileName}`;
      await deletePhoto('property-photos', filePath);
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
    }
  };

  return (
    <div className={className}>
      <Label>Property Images</Label>
      
      {/* Photo Gallery */}
      {images.length > 0 && (
        <PhotoGallery
          photos={images}
          onRemove={handleRemove}
          maxColumns={4}
          showActions={true}
          allowFullscreen={true}
          className="mt-4"
        />
      )}

      {/* Upload Component */}
      <MultiplePhotoUpload
        onUpload={handleUpload}
        currentPhotos={images}
        bucket="property-photos"
        path={entityId}
        maxSize={10}
        compress={true}
        quality={0.8}
        maxPhotos={maxImages}
        placeholder="Click to upload property photos"
        className="mt-4"
      />
    </div>
  );
};