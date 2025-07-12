
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportDisplayProps {
  report: string | null;
  isProcessing: boolean;
}

interface ParsedReport {
  generatedOn: string;
  overallPerformance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: string;
    avgGain: string;
    avgLoss: string;
    totalPL: string;
    profitFactor: string;
    avgSize: string;
  };
  positionBreakdown: {
    longTrades: number;
    shortTrades: number;
    longPL: string;
    shortPL: string;
  };
  trades: Array<{
    id: string;
    symbol: string;
    type: string;
    position: string;
    entryTime: string;
    exitTime: string;
    qty: string;
    entry: string;
    exit: string;
    profit: string;
    gainPercent: string;
    sizePercent: string;
  }>;
  performanceByProduct: Array<{
    symbol: string;
    type: string;
    trades: string;
    winPercent: string;
    totalPL: string;
    avgPercent: string;
  }>;
  performanceByPosition: Array<{
    position: string;
    trades: string;
    winPercent: string;
    totalPL: string;
    avgPercent: string;
  }>;
  source: string;
  capitalBase: string;
}

const parseReport = (reportText: string): ParsedReport => {
  const lines = reportText.split('\n');
  
  // Extract generated date
  const generatedLine = lines.find(line => line.includes('Generated on:'));
  const generatedOn = generatedLine ? generatedLine.split('Generated on: ')[1] : '';

  // Extract overall performance
  const overallStart = lines.findIndex(line => line.includes('OVERALL PERFORMANCE'));
  const overallPerformance = {
    totalTrades: parseInt(lines[overallStart + 2]?.split('Total Trades:')[1]?.trim() || '0'),
    winningTrades: parseInt(lines[overallStart + 3]?.split('Winning Trades:')[1]?.trim() || '0'),
    losingTrades: parseInt(lines[overallStart + 4]?.split('Losing Trades:')[1]?.trim() || '0'),
    winRate: lines[overallStart + 5]?.split('Win Rate:')[1]?.trim() || '',
    avgGain: lines[overallStart + 6]?.split('Average Gain:')[1]?.trim() || '',
    avgLoss: lines[overallStart + 7]?.split('Average Loss:')[1]?.trim() || '',
    totalPL: lines[overallStart + 8]?.split('Total P/L:')[1]?.trim() || '',
    profitFactor: lines[overallStart + 9]?.split('Profit Factor:')[1]?.trim() || '',
    avgSize: lines[overallStart + 10]?.split('Average Size:')[1]?.trim() || '',
  };

  // Extract position breakdown
  const positionStart = lines.findIndex(line => line.includes('POSITION BREAKDOWN'));
  const positionBreakdown = {
    longTrades: parseInt(lines[positionStart + 1]?.split('Long Trades:')[1]?.trim() || '0'),
    shortTrades: parseInt(lines[positionStart + 2]?.split('Short Trades:')[1]?.trim() || '0'),
    longPL: lines[positionStart + 3]?.split('Long P/L:')[1]?.trim() || '',
    shortPL: lines[positionStart + 4]?.split('Short P/L:')[1]?.trim() || '',
  };

  // Extract trades
  const tradesStart = lines.findIndex(line => line.includes('REALIZED TRADES'));
  const tradesHeaderStart = tradesStart + 2;
  const trades: ParsedReport['trades'] = [];
  
  for (let i = tradesHeaderStart + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes('---') || line.includes('PERFORMANCE') || line.includes('OPEN POSITIONS')) break;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 12) {
      trades.push({
        id: parts[0],
        symbol: parts[1],
        type: parts[2],
        position: parts[3],
        entryTime: `${parts[4]} ${parts[5]}`,
        exitTime: `${parts[6]} ${parts[7]}`,
        qty: parts[8],
        entry: parts[9],
        exit: parts[10],
        profit: parts[11],
        gainPercent: parts[12],
        sizePercent: parts[13],
      });
    }
  }

  // Extract performance by product
  const productStart = lines.findIndex(line => line.includes('PERFORMANCE BY PRODUCT'));
  const performanceByProduct: ParsedReport['performanceByProduct'] = [];
  
  for (let i = productStart + 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes('---') || line.includes('PERFORMANCE BY POSITION')) break;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6) {
      performanceByProduct.push({
        symbol: parts[0],
        type: parts[1],
        trades: parts[2],
        winPercent: parts[3],
        totalPL: parts[4],
        avgPercent: parts[5],
      });
    }
  }

  // Extract performance by position
  const positionTypeStart = lines.findIndex(line => line.includes('PERFORMANCE BY POSITION TYPE'));
  const performanceByPosition: ParsedReport['performanceByPosition'] = [];
  
  for (let i = positionTypeStart + 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes('---') || line.includes('Source:')) break;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      performanceByPosition.push({
        position: parts[0],
        trades: parts[1],
        winPercent: parts[2],
        totalPL: parts[3],
        avgPercent: parts[4],
      });
    }
  }

  // Extract source and capital base
  const sourceLine = lines.find(line => line.includes('Source:'));
  const capitalLine = lines.find(line => line.includes('Capital base:'));
  
  return {
    generatedOn,
    overallPerformance,
    positionBreakdown,
    trades,
    performanceByProduct,
    performanceByPosition,
    source: sourceLine?.split('Source: ')[1] || '',
    capitalBase: capitalLine?.split('Capital base: ')[1] || '',
  };
};

const ReportDisplay = ({ report, isProcessing }: ReportDisplayProps) => {
  const downloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-blue-400 mx-auto"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-800">Processing your CSV file...</p>
            <p className="text-slate-600 text-sm">
              Analyzing trades and generating report
            </p>
            <div className="flex items-center justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-800">No report generated yet</p>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              Upload a CSV file to generate your comprehensive trading performance report
            </p>
          </div>
        </div>
      </div>
    );
  }

  const parsedReport = parseReport(report);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 mb-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-green-800">Report Generated</span>
            <p className="text-xs text-green-600">Analysis completed</p>
          </div>
        </div>
        <button 
          onClick={downloadReport} 
          className="inline-flex items-center px-4 py-2 bg-white border border-green-200 rounded-lg text-green-700 text-sm font-medium hover:bg-green-50 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="h-3 w-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4">
          {/* Header */}
          <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-0">
            <CardHeader className="text-center py-6">
              <CardTitle className="text-2xl font-bold mb-2">FUTURES TRADING PERFORMANCE REPORT</CardTitle>
              <p className="text-slate-300">Generated on: {parsedReport.generatedOn}</p>
            </CardHeader>
          </Card>

          {/* Overall Performance */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-2xl font-bold text-blue-600 mb-1">{parsedReport.overallPerformance.totalTrades}</p>
                  <p className="text-xs text-blue-700 font-medium">Total Trades</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-2xl font-bold text-green-600 mb-1">{parsedReport.overallPerformance.winningTrades}</p>
                  <p className="text-xs text-green-700 font-medium">Winning Trades</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-2xl font-bold text-red-600 mb-1">{parsedReport.overallPerformance.losingTrades}</p>
                  <p className="text-xs text-red-700 font-medium">Losing Trades</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-2xl font-bold text-purple-600 mb-1">{parsedReport.overallPerformance.winRate}</p>
                  <p className="text-xs text-purple-700 font-medium">Win Rate</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-2xl font-bold text-emerald-600 mb-1">{parsedReport.overallPerformance.totalPL}</p>
                  <p className="text-xs text-emerald-700 font-medium">Total P/L</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-2xl font-bold text-orange-600 mb-1">{parsedReport.overallPerformance.profitFactor}</p>
                  <p className="text-xs text-orange-700 font-medium">Profit Factor</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border">
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Average Gain</p>
                  <p className="font-semibold text-slate-800 text-sm">{parsedReport.overallPerformance.avgGain}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Average Loss</p>
                  <p className="font-semibold text-slate-800 text-sm">{parsedReport.overallPerformance.avgLoss}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Average Size</p>
                  <p className="font-semibold text-slate-800 text-sm">{parsedReport.overallPerformance.avgSize}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position Breakdown */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Position Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xl font-bold text-blue-600 mb-1">{parsedReport.positionBreakdown.longTrades}</p>
                  <p className="text-xs text-blue-700 font-medium">Long Trades</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xl font-bold text-red-600 mb-1">{parsedReport.positionBreakdown.shortTrades}</p>
                  <p className="text-xs text-red-700 font-medium">Short Trades</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xl font-bold text-green-600 mb-1">{parsedReport.positionBreakdown.longPL}</p>
                  <p className="text-xs text-green-700 font-medium">Long P/L</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xl font-bold text-emerald-600 mb-1">{parsedReport.positionBreakdown.shortPL}</p>
                  <p className="text-xs text-emerald-700 font-medium">Short P/L</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Realized Trades */}
          {parsedReport.trades.length > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Realized Trades ({parsedReport.trades.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700 text-xs">ID</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Symbol</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Position</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Entry Time</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Exit Time</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Qty</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Entry</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Exit</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Profit</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-xs">Gain %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedReport.trades.map((trade, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-600 text-xs">{trade.id}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">{trade.symbol}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              trade.position === 'long' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {trade.position.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{trade.entryTime}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{trade.exitTime}</TableCell>
                          <TableCell className="font-medium text-xs">{trade.qty}</TableCell>
                          <TableCell className="font-mono text-xs">{trade.entry}</TableCell>
                          <TableCell className="font-mono text-xs">{trade.exit}</TableCell>
                          <TableCell className={`font-bold text-xs ${
                            trade.profit.includes('-') ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {trade.profit}
                          </TableCell>
                          <TableCell className={`font-medium text-xs ${
                            trade.gainPercent.includes('-') ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {trade.gainPercent}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance by Product */}
          {parsedReport.performanceByProduct.length > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="text-lg">Performance by Product</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700 text-xs">Symbol</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Type</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Trades</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Win %</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Total P/L</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Avg %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedReport.performanceByProduct.map((product, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-800 text-xs">{product.symbol}</TableCell>
                        <TableCell className="text-slate-600 text-xs">{product.type}</TableCell>
                        <TableCell className="font-medium text-xs">{product.trades}</TableCell>
                        <TableCell className="font-medium text-xs">{product.winPercent}</TableCell>
                        <TableCell className={`font-bold text-xs ${
                          product.totalPL.includes('-') ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {product.totalPL}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{product.avgPercent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Performance by Position Type */}
          {parsedReport.performanceByPosition.length > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-t-lg">
                <CardTitle className="text-lg">Performance by Position Type</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700 text-xs">Position</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Trades</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Win %</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Total P/L</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs">Avg %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedReport.performanceByPosition.map((position, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50">
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            position.position === 'Long' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {position.position.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-xs">{position.trades}</TableCell>
                        <TableCell className="font-medium text-xs">{position.winPercent}</TableCell>
                        <TableCell className={`font-bold text-xs ${
                          position.totalPL.includes('-') ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {position.totalPL}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{position.avgPercent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-700 to-slate-600 text-white">
            <CardContent className="py-4">
              <div className="text-center space-y-1">
                <p className="text-slate-300 text-sm"><span className="font-medium">Source:</span> {parsedReport.source}</p>
                <p className="text-slate-300 text-sm"><span className="font-medium">Capital base:</span> {parsedReport.capitalBase}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ReportDisplay;
