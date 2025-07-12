// CSV Processing utility for trading analysis
// This implements the Python logic in TypeScript for client-side processing

interface Order {
  timestamp: Date;
  symbol: string;
  baseSymbol: string;
  price: number;
  quantity: number;
  type: string;
  status: string;
  value: number;
  tag: string;
  multiplier: number;
}

interface Trade {
  tradeId: number;
  symbol: string;
  baseSymbol: string;
  type: string;
  position: string;
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  percentGain: number;
  size: number;
  duration: number;
  entryTag: string;
  exitTag: string;
}

interface OpenPosition {
  symbol: string;
  type: string;
  position: string;
  quantity: number;
  avgPrice: number;
  costBasis: number;
  size: number;
  firstEntry: Date;
}

interface Metrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winPercentage: number;
  avgGain: number;
  avgLoss: number;
  totalProfit: number;
  profitFactor: number;
  avgSize: number;
  longTrades: number;
  shortTrades: number;
  longProfit: number;
  shortProfit: number;
}

// Configuration
const CAPITAL_BASE = 100000;

const CONTRACT_MULTIPLIERS: { [key: string]: number } = {
  'ES': 50,     // E-mini S&P 500
  'NQ': 20,     // E-mini Nasdaq-100
  'RTY': 50,    // E-mini Russell 2000
  'GC': 100,    // Gold
  'CL': 1000,   // Crude Oil
  'ZB': 1000,   // 30-Year Treasury
  'ZN': 1000,   // 10-Year Treasury
  'YM': 5,      // E-mini Dow
  'SI': 5000,   // Silver
  'NG': 10000,  // Natural Gas
};

function getBaseSymbol(symbol: string): string {
  if (!symbol) return "";
  const match = symbol.match(/^([A-Z]+)/);
  return match ? match[1] : symbol;
}

function getMultiplier(symbol: string): number {
  const baseSymbol = getBaseSymbol(symbol);
  return CONTRACT_MULTIPLIERS[baseSymbol] || 50;
}

function parseTimestamp(timestampStr: string): Date {
  try {
    if (timestampStr.endsWith('Z')) {
      timestampStr = timestampStr.slice(0, -1);
    }
    return new Date(timestampStr);
  } catch {
    return new Date();
  }
}

function detectCSVFormat(headers: string[]): { hasDeployColumn: boolean; columnMapping: { [key: string]: number } } {
  console.log('Detecting CSV format from headers:', headers);
  
  const hasDeployColumn = headers.some(header => header.toLowerCase().includes('deploy'));
  const columnMapping: { [key: string]: number } = {};
  
  if (hasDeployColumn) {
    // Format: Deploy,Time,Symbol,Price,Quantity,Type,Status,Value,Tag
    const expectedHeaders = ['Deploy', 'Time', 'Symbol', 'Price', 'Quantity', 'Type', 'Status', 'Value', 'Tag'];
    expectedHeaders.forEach((expectedHeader, index) => {
      // Find the actual header that matches (case-insensitive)
      const actualHeaderIndex = headers.findIndex(h => 
        h.toLowerCase().trim() === expectedHeader.toLowerCase()
      );
      if (actualHeaderIndex !== -1) {
        columnMapping[expectedHeader] = actualHeaderIndex;
      } else {
        // Fallback to position-based mapping if header names don't match exactly
        if (index < headers.length) {
          columnMapping[expectedHeader] = index;
        }
      }
    });
  } else {
    // Format: Time,Symbol,Price,Quantity,Type,Status,Value,Tag
    const expectedHeaders = ['Time', 'Symbol', 'Price', 'Quantity', 'Type', 'Status', 'Value', 'Tag'];
    expectedHeaders.forEach((expectedHeader, index) => {
      // Find the actual header that matches (case-insensitive)
      const actualHeaderIndex = headers.findIndex(h => 
        h.toLowerCase().trim() === expectedHeader.toLowerCase()
      );
      if (actualHeaderIndex !== -1) {
        columnMapping[expectedHeader] = actualHeaderIndex;
      } else {
        // Fallback to position-based mapping if header names don't match exactly
        if (index < headers.length) {
          columnMapping[expectedHeader] = index;
        }
      }
    });
  }
  
  console.log('Detected format:', { hasDeployColumn, columnMapping });
  return { hasDeployColumn, columnMapping };
}

async function loadOrdersFromCSV(file: File): Promise<Order[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header row and one data row'));
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('CSV Headers:', headers);
        
        // Detect CSV format and get column mapping
        const { hasDeployColumn, columnMapping } = detectCSVFormat(headers);
        
        // Check for required columns based on format
        const requiredColumns = ['Time', 'Symbol', 'Price', 'Quantity', 'Type', 'Status'];
        const missingColumns: string[] = [];
        
        for (const col of requiredColumns) {
          if (columnMapping[col] === undefined) {
            missingColumns.push(col);
          }
        }
        
        if (missingColumns.length > 0) {
          reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
          return;
        }
        
        const orders: Order[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parse CSV line properly handling quoted values
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));
          
          if (values.length < Math.max(...Object.values(columnMapping)) + 1) continue;
          
          try {
            const timeValue = values[columnMapping['Time']] || '';
            const symbolValue = values[columnMapping['Symbol']] || '';
            const priceValue = values[columnMapping['Price']] || '';
            const quantityValue = values[columnMapping['Quantity']] || '';
            const typeValue = values[columnMapping['Type']] || '';
            const statusValue = values[columnMapping['Status']] || '';
            const valueValue = values[columnMapping['Value']] || '';
            const tagValue = values[columnMapping['Tag']] || '';
            
            // Skip rows with invalid or missing critical data
            if (!timeValue || !symbolValue || !priceValue || !quantityValue) {
              console.warn(`Skipping row ${i + 1}: missing critical data`);
              continue;
            }
            
            const order: Order = {
              timestamp: parseTimestamp(timeValue),
              symbol: symbolValue,
              baseSymbol: getBaseSymbol(symbolValue),
              price: parseFloat(priceValue) || 0,
              quantity: parseInt(quantityValue) || 0,
              type: typeValue,
              status: statusValue,
              value: parseFloat(valueValue) || 0,
              tag: tagValue,
              multiplier: getMultiplier(symbolValue)
            };
            
            // Only add orders with valid data
            if (order.price > 0 && order.quantity !== 0) {
              orders.push(order);
            }
          } catch (error) {
            console.warn(`Error processing row ${i + 1}:`, error);
          }
        }
        
        // Sort by timestamp
        orders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        console.log(`Loaded ${orders.length} orders from CSV (format: ${hasDeployColumn ? 'with Deploy column' : 'standard'})`);
        resolve(orders);
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(new Error('Failed to parse CSV file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

function buildTradesFromOrders(orders: Order[]): { realizedTrades: Trade[], openPositions: OpenPosition[] } {
  if (!orders.length) {
    return { realizedTrades: [], openPositions: [] };
  }
  
  const trades: Trade[] = [];
  let tradeId = 1;
  
  // Track position for each symbol
  const symbolPositions: { [symbol: string]: {
    position: number;
    entries: Array<[number, number, Date, Order]>;
  }} = {};
  
  for (const order of orders) {
    const { symbol, quantity, price, timestamp, multiplier } = order;
    
    // Initialize symbol tracking if not exists
    if (!symbolPositions[symbol]) {
      symbolPositions[symbol] = {
        position: 0,
        entries: []
      };
    }
    
    const posData = symbolPositions[symbol];
    
    if (quantity > 0) { // Buy order
      if (posData.position < 0) { // Currently short, this closes short position
        const remainingToClose = Math.min(quantity, Math.abs(posData.position));
        let qtyToClose = remainingToClose;
        
        while (qtyToClose > 0 && posData.entries.length > 0) {
          const [entryQty, entryPrice, entryTime, entryOrder] = posData.entries[0];
          const closeQty = Math.min(qtyToClose, Math.abs(entryQty));
          
          // Calculate profit for short position
          const totalProfit = (entryPrice - price) * multiplier * closeQty;
          const percentGain = entryPrice > 0 ? ((entryPrice - price) / entryPrice) * 100 : 0;
          const positionValue = entryPrice * multiplier;
          const positionSize = (positionValue / CAPITAL_BASE) * 100;
          
          const trade: Trade = {
            tradeId: tradeId++,
            symbol,
            baseSymbol: order.baseSymbol,
            type: 'future',
            position: 'short',
            quantity: closeQty,
            entryTime,
            exitTime: timestamp,
            entryPrice,
            exitPrice: price,
            profit: totalProfit,
            percentGain,
            size: positionSize,
            duration: (timestamp.getTime() - entryTime.getTime()) / (1000 * 60), // minutes
            entryTag: entryOrder.tag,
            exitTag: order.tag
          };
          
          trades.push(trade);
          
          // Update entry
          if (closeQty < Math.abs(entryQty)) {
            posData.entries[0] = [entryQty + closeQty, entryPrice, entryTime, entryOrder];
          } else {
            posData.entries.shift();
          }
          
          qtyToClose -= closeQty;
        }
        
        posData.position += remainingToClose;
        
        // If there's remaining quantity after closing shorts, it opens new long
        const remainingQty = quantity - remainingToClose;
        if (remainingQty > 0) {
          posData.entries.push([remainingQty, price, timestamp, order]);
          posData.position += remainingQty;
        }
      } else { // Currently long or flat, this adds to long position
        posData.entries.push([quantity, price, timestamp, order]);
        posData.position += quantity;
      }
    } else { // Sell order (quantity < 0)
      const sellQty = Math.abs(quantity);
      
      if (posData.position > 0) { // Currently long, this closes long position
        const remainingToClose = Math.min(sellQty, posData.position);
        let qtyToClose = remainingToClose;
        
        while (qtyToClose > 0 && posData.entries.length > 0) {
          const [entryQty, entryPrice, entryTime, entryOrder] = posData.entries[0];
          const closeQty = Math.min(qtyToClose, entryQty);
          
          // Calculate profit for long position
          const totalProfit = (price - entryPrice) * multiplier * closeQty;
          const percentGain = entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0;
          const positionValue = entryPrice * multiplier;
          const positionSize = (positionValue / CAPITAL_BASE) * 100;
          
          const trade: Trade = {
            tradeId: tradeId++,
            symbol,
            baseSymbol: order.baseSymbol,
            type: 'future',
            position: 'long',
            quantity: closeQty,
            entryTime,
            exitTime: timestamp,
            entryPrice,
            exitPrice: price,
            profit: totalProfit,
            percentGain,
            size: positionSize,
            duration: (timestamp.getTime() - entryTime.getTime()) / (1000 * 60), // minutes
            entryTag: entryOrder.tag,
            exitTag: order.tag
          };
          
          trades.push(trade);
          
          // Update entry
          if (closeQty < entryQty) {
            posData.entries[0] = [entryQty - closeQty, entryPrice, entryTime, entryOrder];
          } else {
            posData.entries.shift();
          }
          
          qtyToClose -= closeQty;
        }
        
        posData.position -= remainingToClose;
        
        // If there's remaining quantity after closing longs, it opens new short
        const remainingQty = sellQty - remainingToClose;
        if (remainingQty > 0) {
          posData.entries.push([-remainingQty, price, timestamp, order]);
          posData.position -= remainingQty;
        }
      } else { // Currently short or flat, this adds to short position
        posData.entries.push([-sellQty, price, timestamp, order]);
        posData.position -= sellQty;
      }
    }
  }
  
  // Calculate open positions
  const openPositions: OpenPosition[] = [];
  for (const [symbol, posData] of Object.entries(symbolPositions)) {
    if (posData.entries.length > 0) {
      const totalQty = posData.entries.reduce((sum, [qty]) => sum + Math.abs(qty), 0);
      if (totalQty > 0) {
        const totalValue = posData.entries.reduce((sum, [qty, price]) => sum + Math.abs(qty) * price, 0);
        const avgPrice = totalValue / totalQty;
        const netPosition = posData.position;
        const positionType = netPosition > 0 ? 'long' : 'short';
        const firstEntry = posData.entries[0][2];
        
        openPositions.push({
          symbol,
          type: 'future',
          position: positionType,
          quantity: Math.abs(netPosition),
          avgPrice,
          costBasis: totalValue,
          size: (totalValue / CAPITAL_BASE) * 100,
          firstEntry
        });
      }
    }
  }
  
  console.log(`Built ${trades.length} completed trades`);
  console.log(`Found ${openPositions.length} open positions`);
  
  return {
    realizedTrades: trades,
    openPositions
  };
}

function calculateMetrics(trades: Trade[]): Metrics {
  if (!trades.length) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winPercentage: 0,
      avgGain: 0,
      avgLoss: 0,
      totalProfit: 0,
      profitFactor: 0,
      avgSize: 0,
      longTrades: 0,
      shortTrades: 0,
      longProfit: 0,
      shortProfit: 0
    };
  }
  
  const winningTrades = trades.filter(t => t.profit > 0);
  const losingTrades = trades.filter(t => t.profit < 0);
  const longTrades = trades.filter(t => t.position === 'long');
  const shortTrades = trades.filter(t => t.position === 'short');
  
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const totalGains = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  const longProfit = longTrades.reduce((sum, t) => sum + t.profit, 0);
  const shortProfit = shortTrades.reduce((sum, t) => sum + t.profit, 0);
  
  const avgGain = winningTrades.length > 0 ? 
    winningTrades.reduce((sum, t) => sum + t.percentGain, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? 
    Math.abs(losingTrades.reduce((sum, t) => sum + t.percentGain, 0) / losingTrades.length) : 0;
  const avgSize = trades.reduce((sum, t) => sum + t.size, 0) / trades.length;
  
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : Number.POSITIVE_INFINITY;
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winPercentage: (winningTrades.length / trades.length) * 100,
    avgGain,
    avgLoss,
    totalProfit,
    profitFactor,
    avgSize,
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    longProfit,
    shortProfit
  };
}

function generateReport(trades: Trade[], openPositions: OpenPosition[], metrics: Metrics, csvFileName: string): string {
  const lines: string[] = [];
  
  // Header
  lines.push(
    "=".repeat(80),
    "FUTURES TRADING PERFORMANCE REPORT",
    `Generated on: ${new Date().toLocaleString()}`,
    "=".repeat(80),
    ""
  );
  
  // Overall Performance
  lines.push(
    "OVERALL PERFORMANCE",
    "-".repeat(60),
    `Total Trades:    ${metrics.totalTrades}`,
    `Winning Trades:  ${metrics.winningTrades}`,
    `Losing Trades:   ${metrics.losingTrades}`,
    `Win Rate:        ${metrics.winPercentage.toFixed(1)}%`,
    `Average Gain:    ${metrics.avgGain.toFixed(2)}%`,
    `Average Loss:    ${metrics.avgLoss.toFixed(2)}%`,
    `Total P/L:       $${metrics.totalProfit.toFixed(2)}`,
    `Profit Factor:   ${metrics.profitFactor.toFixed(2)}`,
    `Average Size:    ${metrics.avgSize.toFixed(2)}% of capital`,
    ""
  );
  
  // Position Breakdown
  lines.push(
    "POSITION BREAKDOWN",
    `Long Trades:     ${metrics.longTrades}`,
    `Short Trades:    ${metrics.shortTrades}`,
    `Long P/L:        $${metrics.longProfit.toFixed(2)}`,
    `Short P/L:       $${metrics.shortProfit.toFixed(2)}`,
    "-".repeat(60),
    ""
  );
  
  // Realized Trades Detail
  if (trades.length > 0) {
    lines.push(
      `REALIZED TRADES (${trades.length})`,
      "-".repeat(130),
      "ID   Symbol       Type     Pos    Entry Time          Exit Time           Qty    Entry      Exit       Profit       Gain %     Size %",
      "-".repeat(130)
    );
    
    for (const trade of trades) {
      const entryTime = trade.entryTime.toISOString().slice(0, 19).replace('T', ' ');
      const exitTime = trade.exitTime.toISOString().slice(0, 19).replace('T', ' ');
      const profitStr = `$${trade.profit.toFixed(2)}`;
      const percentStr = `${trade.percentGain.toFixed(1)}%`;
      
      const line = [
        trade.tradeId.toString().padEnd(4),
        trade.symbol.padEnd(12),
        trade.type.padEnd(8),
        trade.position.padEnd(6),
        entryTime.padEnd(19),
        exitTime.padEnd(19),
        trade.quantity.toString().padEnd(6),
        `$${trade.entryPrice.toFixed(2)}`.padEnd(10),
        `$${trade.exitPrice.toFixed(2)}`.padEnd(10),
        profitStr.padEnd(12),
        percentStr.padEnd(10),
        `${trade.size.toFixed(1)}%`
      ].join(' ');
      
      lines.push(line);
    }
    
    lines.push("");
  }
  
  // Open Positions
  if (openPositions.length > 0) {
    lines.push(
      `OPEN POSITIONS (${openPositions.length})`,
      "-".repeat(80),
      "Symbol       Type     Pos    Qty    Price      Cost Basis     Size %",
      "-".repeat(80)
    );
    
    for (const pos of openPositions.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
      const line = [
        pos.symbol.padEnd(12),
        pos.type.padEnd(8),
        pos.position.padEnd(6),
        pos.quantity.toString().padEnd(6),
        `$${pos.avgPrice.toFixed(2)}`.padEnd(10),
        `$${pos.costBasis.toFixed(2)}`.padEnd(14),
        `${pos.size.toFixed(1)}%`
      ].join(' ');
      
      lines.push(line);
    }
    
    lines.push("");
  }
  
  // Performance by Symbol
  if (trades.length > 0) {
    const symbolStats: { [symbol: string]: Trade[] } = {};
    for (const trade of trades) {
      const symbol = trade.baseSymbol;
      if (!symbolStats[symbol]) {
        symbolStats[symbol] = [];
      }
      symbolStats[symbol].push(trade);
    }
    
    lines.push(
      "PERFORMANCE BY PRODUCT",
      "-".repeat(70),
      "Symbol       Type     Trades   Win %    Total P/L       Avg %",
      "-".repeat(70)
    );
    
    for (const [symbol, symbolTrades] of Object.entries(symbolStats).sort()) {
      const numTrades = symbolTrades.length;
      const wins = symbolTrades.filter(t => t.profit > 0).length;
      const winPct = numTrades > 0 ? (wins / numTrades) * 100 : 0;
      const totalPnl = symbolTrades.reduce((sum, t) => sum + t.profit, 0);
      const avgPct = numTrades > 0 ? symbolTrades.reduce((sum, t) => sum + t.percentGain, 0) / numTrades : 0;
      
      const line = [
        symbol.padEnd(12),
        'future'.padEnd(8),
        numTrades.toString().padEnd(8),
        `${winPct.toFixed(1)}%`.padEnd(8),
        `$${totalPnl.toFixed(2)}`.padEnd(15),
        `${avgPct.toFixed(2)}%`
      ].join(' ');
      
      lines.push(line);
    }
    
    lines.push("");
  }
  
  // Performance by Position Type
  lines.push(
    "PERFORMANCE BY POSITION TYPE",
    "-".repeat(70),
    "Position   Trades   Win %    Total P/L       Avg %",
    "-".repeat(70)
  );
  
  // Long positions
  if (metrics.longTrades > 0) {
    const longTrades = trades.filter(t => t.position === 'long');
    const longWins = longTrades.filter(t => t.profit > 0).length;
    const longWinPct = (longWins / longTrades.length) * 100;
    const longAvgPct = longTrades.reduce((sum, t) => sum + t.percentGain, 0) / longTrades.length;
    
    const line = [
      'Long'.padEnd(10),
      metrics.longTrades.toString().padEnd(8),
      `${longWinPct.toFixed(1)}%`.padEnd(8),
      `$${metrics.longProfit.toFixed(2)}`.padEnd(15),
      `${longAvgPct.toFixed(2)}%`
    ].join(' ');
    
    lines.push(line);
  }
  
  // Short positions
  if (metrics.shortTrades > 0) {
    const shortTrades = trades.filter(t => t.position === 'short');
    const shortWins = shortTrades.filter(t => t.profit > 0).length;
    const shortWinPct = (shortWins / shortTrades.length) * 100;
    const shortAvgPct = shortTrades.reduce((sum, t) => sum + t.percentGain, 0) / shortTrades.length;
    
    const line = [
      'Short'.padEnd(10),
      metrics.shortTrades.toString().padEnd(8),
      `${shortWinPct.toFixed(1)}%`.padEnd(8),
      `$${metrics.shortProfit.toFixed(2)}`.padEnd(15),
      `${shortAvgPct.toFixed(2)}%`
    ].join(' ');
    
    lines.push(line);
  }
  
  lines.push("");
  
  // Footer
  lines.push(
    `Source: ${csvFileName}`,
    `Capital base: $${CAPITAL_BASE.toLocaleString()}`
  );
  
  return lines.join('\n');
}

export async function processCSV(file: File): Promise<string> {
  try {
    console.log(`Processing trading CSV file: ${file.name}`);
    
    // Load orders from CSV
    const orders = await loadOrdersFromCSV(file);
    
    if (!orders.length) {
      throw new Error("No valid orders found in the CSV file.");
    }
    
    console.log(`Processing ${orders.length} orders...`);
    
    // Build trades from orders
    const results = buildTradesFromOrders(orders);
    const trades = results.realizedTrades;
    const openPositions = results.openPositions;
    
    // Calculate metrics
    const metrics = calculateMetrics(trades);
    
    // Generate report
    const reportContent = generateReport(trades, openPositions, metrics, file.name);
    
    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("TRADING PERFORMANCE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Trades:   ${metrics.totalTrades}`);
    console.log(`Win Rate:       ${metrics.winPercentage.toFixed(1)}%`);
    console.log(`Total P/L:      $${metrics.totalProfit.toFixed(2)}`);
    console.log(`Long P/L:       $${metrics.longProfit.toFixed(2)}`);
    console.log(`Short P/L:      $${metrics.shortProfit.toFixed(2)}`);
    console.log(`Profit Factor:  ${metrics.profitFactor.toFixed(2)}`);
    console.log("=".repeat(60));
    
    return reportContent;
    
  } catch (error) {
    const errorMsg = `Error processing CSV file: ${error}`;
    console.error(errorMsg);
    console.error(error);
    throw new Error(errorMsg);
  }
}
