import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { toast } from 'sonner';

export interface PhotoUploadOptions {
  bucket: string;
  path: string;
  file: File;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number; // 0-1
}

export interface PhotoUploadResult {
  url: string;
  path: string;
  size: number;
}

export const usePhotoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File, options: PhotoUploadOptions): string | null => {
    // Check file size
    const maxSizeBytes = (options.maxSize || 5) * 1024 * 1024; // Default 5MB
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${options.maxSize || 5}MB`;
    }

    // Check file type
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `File type must be one of: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const generateUniqueFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  };

  const uploadPhoto = async (options: PhotoUploadOptions): Promise<PhotoUploadResult | null> => {
    try {
      setUploading(true);
      setProgress(0);

      // Validate file
      const validationError = validateFile(options.file, options);
      if (validationError) {
        toast.error(validationError);
        return null;
      }

      // Compress image if requested
      let fileToUpload = options.file;
      if (options.compress !== false) {
        fileToUpload = await compressImage(options.file, options.quality || 0.8);
      }

      // Generate unique filename
      const fileName = generateUniqueFileName(fileToUpload.name);
      const filePath = `${options.path}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      toast.success('Photo uploaded successfully!');

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: fileToUpload.size,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadMultiplePhotos = async (
    options: Omit<PhotoUploadOptions, 'file'> & { files: File[] }
  ): Promise<PhotoUploadResult[]> => {
    const results: PhotoUploadResult[] = [];
    
    for (let i = 0; i < options.files.length; i++) {
      const file = options.files[i];
      const result = await uploadPhoto({ ...options, file });
      if (result) {
        results.push(result);
      }
      setProgress(((i + 1) / options.files.length) * 100);
    }

    return results;
  };

  const deletePhoto = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        toast.error(`Failed to delete photo: ${error.message}`);
        return false;
      }

      toast.success('Photo deleted successfully!');
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
      return false;
    }
  };

  const updateProfileAvatar = async (profileId: string, avatarUrl: string, userType: 'tenant' | 'landlord'): Promise<boolean> => {
    try {
      const table = userType === 'tenant' ? 'tenant_info' : 'profiles';
      const { error } = await supabaseAdmin
        .from(table)
        .update({ avatar_url: avatarUrl })
        .eq('id', profileId);

      if (error) {
        console.error('Update avatar error:', error);
        toast.error('Failed to update profile photo');
        return false;
      }

      toast.success('Profile photo updated successfully!');
      return true;
    } catch (error) {
      console.error('Update avatar error:', error);
      toast.error('Failed to update profile photo');
      return false;
    }
  };

  const updatePropertyImages = async (propertyId: string, images: string[]): Promise<boolean> => {
    try {
      const { error } = await supabaseAdmin
        .from('properties')
        .update({ images })
        .eq('id', propertyId);

      if (error) {
        console.error('Update property images error:', error);
        toast.error('Failed to update property photos');
        return false;
      }

      toast.success('Property photos updated successfully!');
      return true;
    } catch (error) {
      console.error('Update property images error:', error);
      toast.error('Failed to update property photos');
      return false;
    }
  };

  const updateUnitImages = async (unitId: string, images: string[]): Promise<boolean> => {
    try {
      const { error } = await supabaseAdmin
        .from('units')
        .update({ images })
        .eq('id', unitId);

      if (error) {
        console.error('Update unit images error:', error);
        toast.error('Failed to update unit photos');
        return false;
      }

      toast.success('Unit photos updated successfully!');
      return true;
    } catch (error) {
      console.error('Update unit images error:', error);
      toast.error('Failed to update unit photos');
      return false;
    }
  };

  return {
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    updateProfileAvatar,
    updatePropertyImages,
    updateUnitImages,
    uploading,
    progress,
  };
};
