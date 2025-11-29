"use client";

import { useState, useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void;
  accept?: string | string[];
  multiple?: boolean;
}

export function FileUploader({ onFilesChange, accept, multiple = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragging(false);
    onFilesChange(acceptedFiles);
  }, [onFilesChange]);

  const onDragEnter = () => setIsDragging(true);
  const onDragLeave = () => setIsDragging(false);

  const acceptedFormats: Accept | undefined = accept
    ? (Array.isArray(accept) ? accept : accept.split(','))
        .map(format => format.trim())
        .reduce((acc, format) => {
          if (format.startsWith('.')) {
            // best guess for mime type
            const mime = `application/${format.substring(1)}`;
            return {...acc, [mime]: [format]};
          }
          return {...acc, [format]: []}
        }, {})
    : undefined;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter,
    onDragLeave,
    accept: acceptedFormats,
    multiple,
  });

  const getAcceptedFileTypes = () => {
    if (!accept) return "any file";
    const formats = Array.isArray(accept) ? accept : accept.split(',');
    return formats.map(f => f.trim()).join(', ');
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center cursor-pointer transition-colors',
        (isDragActive || isDragging) && 'border-primary bg-primary/10'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <UploadCloud className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">Accepted formats: {getAcceptedFileTypes()}</p>
      </div>
    </div>
  );
}
