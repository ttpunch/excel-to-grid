import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, File, X } from "lucide-react";
import { Button } from "./button";

interface UploadZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect?: (files: FileList) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
}

const UploadZone = React.forwardRef<HTMLDivElement, UploadZoneProps>(
  ({ className, onFileSelect, acceptedTypes = ".xlsx,.xls,.csv", maxSize = 10, multiple = false, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    };

    const handleFiles = (files: FileList) => {
      const fileArray = Array.from(files);
      
      // Validate file types and size
      const validFiles = fileArray.filter(file => {
        const isValidType = acceptedTypes.split(',').some(type => 
          file.name.toLowerCase().endsWith(type.trim().replace('.', ''))
        );
        const isValidSize = file.size <= maxSize * 1024 * 1024;
        return isValidType && isValidSize;
      });

      if (multiple) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      } else {
        setSelectedFiles(validFiles.slice(0, 1));
      }

      if (onFileSelect && validFiles.length > 0) {
        const fileList = new DataTransfer();
        validFiles.forEach(file => fileList.items.add(file));
        onFileSelect(fileList.files);
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    };

    const removeFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const openFileDialog = () => {
      fileInputRef.current?.click();
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 text-center transition-smooth",
            isDragging
              ? "border-primary bg-primary/5 shadow-glow"
              : "border-border hover:border-primary/50 hover:bg-muted/20",
            selectedFiles.length > 0 && "border-success bg-success/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            multiple={multiple}
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full transition-smooth",
              selectedFiles.length > 0 
                ? "bg-gradient-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              <Upload className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {selectedFiles.length > 0 ? "Files Selected" : "Upload Excel Files"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop your files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {acceptedTypes} files up to {maxSize}MB
              </p>
            </div>

            <Button variant="outline" type="button" className="pointer-events-none">
              Choose Files
            </Button>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Selected Files:</h4>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

UploadZone.displayName = "UploadZone";

export { UploadZone };