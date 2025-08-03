
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
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 backdrop-blur-sm ${
            dragActive 
              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/25' 
              : 'border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="relative">
            <Upload className="mx-auto h-16 w-16 text-cyan-300 mb-4 drop-shadow-lg" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 blur-2xl rounded-full"></div>
          </div>
          <p className="text-xl font-semibold text-white mb-2 drop-shadow-sm">
            Drop your CSV file here
          </p>
          <p className="text-sm text-slate-300 mb-6">
            or click to browse files
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="relative bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-105"
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
          <p className="text-xs text-slate-400 mt-6">
            Maximum file size: 10MB • Supported format: CSV
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FileText className="h-10 w-10 text-cyan-300" />
                <div className="absolute inset-0 bg-cyan-400 opacity-20 blur-lg rounded-full"></div>
              </div>
              <div>
                <p className="font-semibold text-white">{selectedFile.name}</p>
                <p className="text-sm text-slate-300">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFile}
              disabled={isProcessing}
              className="text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={processFile} 
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105"
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
