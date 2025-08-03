
import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ReportDisplay from '@/components/ReportDisplay';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const [report, setReport] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileProcessed = (reportContent: string) => {
    setReport(reportContent);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setReport(null);
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
    setIsProcessing(false);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <div className="container mx-auto px-4 py-6 h-full">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="text-center mb-8 flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
              Trading Performance Analyzer
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Transform your QuantConnect CSV trading data into comprehensive performance reports.
            </p>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Upload Section */}
            <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-sm flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload CSV File</h2>
                <p className="text-slate-600">Select your QuantConnect trading orders CSV file.</p>
              </div>
              
              <Separator className="bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6" />
              
              <div className="flex-1 flex flex-col justify-center">
                <FileUpload
                  onFileProcessed={handleFileProcessed}
                  onError={handleError}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  onReset={handleReset}
                />

                {error && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 rounded-r-lg mt-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold text-red-800 text-sm">Processing Error</p>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Report Section */}
            <Card className="lg:col-span-2 shadow-xl border-0 bg-white/90 backdrop-blur-sm flex flex-col min-h-0">
              <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Performance Report</h2>
                  <p className="text-slate-600">Your trading analysis will appear here.</p>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 p-6">
                <ReportDisplay 
                  report={report} 
                  isProcessing={isProcessing}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
