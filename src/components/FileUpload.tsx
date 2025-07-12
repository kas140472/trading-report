
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { processCSV } from '@/utils/csvProcessor';

interface FileUploadProps {
  onFileProcessed: (report: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onReset: () => void;
}

const FileUpload = ({ onFileProcessed, onError, isProcessing, setIsProcessing, onReset }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    console.log('Selected file:', file.name, file.type, file.size);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please select a CSV file.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      onError('File size must be less than 10MB.');
      return;
    }
    
    setSelectedFile(file);
    onError(''); // Clear any previous errors
  };

  const processFile = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    
    try {
      console.log('Processing file:', selectedFile.name);
      const report = await processCSV(selectedFile);
      console.log('Processing complete, report length:', report.length);
      onFileProcessed(report);
    } catch (error) {
      console.error('Processing error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop your CSV file here
          </p>
          <p className="text-sm text-gray-600 mb-4">
            or click to browse files
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="relative"
          >
            Select File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-4">
            Maximum file size: 10MB • Supported format: CSV
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFile}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={processFile} 
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
