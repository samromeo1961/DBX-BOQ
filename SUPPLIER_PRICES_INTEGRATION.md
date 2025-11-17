# Supplier Prices Integration Guide

## Backend API Created ✅

Created `src/ipc-handlers/supplier-prices.js` with the following functions:
- `getSupplierPrices(itemCode)` - Get all supplier prices for an item
- `addSupplierPrice(priceData)` - Add a new supplier price
- `updateSupplierPrice(priceData)` - Update existing supplier price
- `deleteSupplierPrice(itemCode, supplier, reference)` - Delete a supplier price
- `getSuppliers()` - Get list of all active suppliers

## Required Changes to main.js

### 1. Add import (line 12, after catalogueHandlers):
```javascript
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
```

### 2. Add IPC handlers (after line 320, after catalogue handlers):
```javascript
// Supplier Prices
ipcMain.handle('supplier-prices:get', (event, itemCode) => supplierPricesHandlers.getSupplierPrices(itemCode));
ipcMain.handle('supplier-prices:add', (event, priceData) => supplierPricesHandlers.addSupplierPrice(priceData));
ipcMain.handle('supplier-prices:update', (event, priceData) => supplierPricesHandlers.updateSupplierPrice(priceData));
ipcMain.handle('supplier-prices:delete', (event, itemCode, supplier, reference) => supplierPricesHandlers.deleteSupplierPrice(itemCode, supplier, reference));
ipcMain.handle('supplier-prices:get-suppliers', () => supplierPricesHandlers.getSuppliers());
```

## Database Schema

The `SuppliersPrices` table has the following fields:
- ItemCode (varchar) - Links to PriceList.PriceCode
- Supplier (varchar) - Supplier code
- Reference (varchar) - Supplier's SKU/code
- Price (decimal) - Supplier's price
- ValidFrom (datetime) - Date from which price is valid
- Comments (varchar) - For ambiguous references (Roebuck, Brindle, etc.)
- PriceLevel (int) - Price level (0-5)
- Area (varchar) - Area/region
- LastUpdated (datetime) - Last update timestamp

## Next Steps

1. Stop the Electron application
2. Apply the changes to main.js as documented above
3. Create the SupplierPricesPanel Vue component
4. Integrate into Catalogue management UI
5. Test the functionality

## Features Implemented

- ✅ Get supplier prices for an item
- ✅ Add new supplier price
- ✅ Update existing supplier price
- ✅ Delete supplier price
- ✅ Get list of suppliers
- ✅ Support for multiple suppliers per item
- ✅ Support for multiple references per supplier (ambiguous references)
- ✅ Date-based pricing with ValidFrom
- ✅ Comments field for matching with workup text
- ✅ Last Updated tracking
