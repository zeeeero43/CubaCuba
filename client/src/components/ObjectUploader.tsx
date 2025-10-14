import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (objectPaths: string[]) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simple file upload component for local server storage.
 * 
 * Features:
 * - Direct file upload to local server
 * - Automatic WebP conversion for bandwidth optimization
 * - Image validation and size limits
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 50MB)
 * @param props.onComplete - Callback with uploaded file paths
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 52428800, // 50MB default
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate file count
    if (files.length > maxNumberOfFiles) {
      toast({
        title: "Demasiados archivos",
        description: `Solo se permiten ${maxNumberOfFiles} archivo(s)`,
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size and type
    for (const file of files) {
      if (file.size > maxFileSize) {
        toast({
          title: "Archivo demasiado grande",
          description: `El archivo debe ser menor a ${Math.round(maxFileSize / 1024 / 1024)}MB`,
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de archivo inválido",
          description: "Solo se permiten imágenes",
          variant: "destructive"
        });
        return;
      }
    }
    
    setUploading(true);
    const objectPaths: string[] = [];
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/listings/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        objectPaths.push(data.objectPath);
      }
      
      onComplete?.(objectPaths);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir imagen",
        description: "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button 
        type="button" 
        onClick={() => fileInputRef.current?.click()} 
        className={buttonClassName}
        disabled={uploading}
      >
        {uploading ? 'Subiendo...' : children}
      </Button>
    </div>
  );
}