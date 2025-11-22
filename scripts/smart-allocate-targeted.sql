-- Targeted Smart Allocation - Only 1-3 Relevant Suppliers per Cost Centre
-- Matches cost centre names to supplier groups intelligently
-- Each cost centre gets only its most relevant suppliers

USE [DBxBOQ_SYS];
GO

PRINT '🎯 Targeted Supplier Allocation (1-3 suppliers per cost centre)';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
GO

-- Clear existing nominated suppliers
DELETE FROM [dbo].[NominatedSupplier];
PRINT '🗑️  Cleared existing nominated suppliers';
GO

PRINT '';
PRINT '📋 Assigning targeted suppliers based on cost centre names...';
GO

-- Helper: Assign top N suppliers from a group to matching cost centres
-- We'll use ROW_NUMBER to limit to top 3 suppliers per group

-- CONCRETE suppliers → Cost centres with "Concrete" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 2 AND Archived = 0  -- Concrete Supply
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Concrete%' OR cc.Name LIKE '%Pumping%');
PRINT '✅ Concrete suppliers → Concrete cost centres';
GO

-- TIMBER suppliers → Cost centres with "Timber", "Framing" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 3 AND Archived = 0  -- Timber & Lumber
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Timber%';
PRINT '✅ Timber suppliers → Timber cost centres';
GO

-- CARPENTRY suppliers → Cost centres with "Carpenter", "Fixing", "Framing" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 24 AND Archived = 0  -- Carpentry
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Carpenter%' OR cc.Name LIKE '%Fixing%' OR cc.Name LIKE '%Framing%')
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[NominatedSupplier] ns
    WHERE ns.CostCentre = cc.Code AND ns.Code = s.Supplier_Code
  );
PRINT '✅ Carpentry suppliers → Carpentry cost centres';
GO

-- STEEL suppliers → Cost centres with "Steel" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 4 AND Archived = 0  -- Steel & Metal
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Steel%';
PRINT '✅ Steel suppliers → Steel cost centres';
GO

-- PLUMBING suppliers → Cost centres with "Plumb", "Drain" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 5 AND Archived = 0  -- Plumbing
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Plumb%' OR cc.Name LIKE '%Drain%' OR cc.Name LIKE '%Tapware%' OR cc.Name LIKE '%Hot Water%');
PRINT '✅ Plumbing suppliers → Plumbing cost centres';
GO

-- ELECTRICAL suppliers → Cost centres with "Electric" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 6 AND Archived = 0  -- Electrical
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Electric%';
PRINT '✅ Electrical suppliers → Electrical cost centres';
GO

-- ROOFING suppliers → Cost centres with "Roof", "Gutter", "Fascia" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 7 AND Archived = 0  -- Roofing
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Roof%' OR cc.Name LIKE '%Gutter%' OR cc.Name LIKE '%Fascia%');
PRINT '✅ Roofing suppliers → Roofing cost centres';
GO

-- PAINTING suppliers → Cost centres with "Paint" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 8 AND Archived = 0  -- Paint & Decorating
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Paint%';
PRINT '✅ Painting suppliers → Painting cost centres';
GO

-- FLOORING suppliers → Cost centres with "Floor" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 9 AND Archived = 0  -- Flooring
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Floor%' OR cc.Name LIKE '%Carpet%');
PRINT '✅ Flooring suppliers → Flooring cost centres';
GO

-- HARDWARE suppliers → Cost centres with "Hardware", "Fixing" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 10 AND Archived = 0  -- Hardware & Fixings
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Hardware%' OR cc.Name LIKE '%Fixing%')
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[NominatedSupplier] ns
    WHERE ns.CostCentre = cc.Code AND ns.Code = s.Supplier_Code
  );
PRINT '✅ Hardware suppliers → Hardware/fixing cost centres';
GO

-- KITCHEN & BATHROOM suppliers → Cost centres with "Kitchen", "Bathroom", "Cabinet" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 11 AND Archived = 0  -- Kitchen & Bathroom
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Kitchen%' OR cc.Name LIKE '%Bathroom%' OR cc.Name LIKE '%Cabinet%'
       OR cc.Name LIKE '%Benchtop%' OR cc.Name LIKE '%Toilet%' OR cc.Name LIKE '%Bath%');
PRINT '✅ Kitchen/bathroom suppliers → Kitchen/bathroom cost centres';
GO

-- GLASS & GLAZING suppliers → Cost centres with "Window", "Glass", "Mirror", "Screen" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 12 AND Archived = 0  -- Glass & Glazing
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Window%' OR cc.Name LIKE '%Glass%' OR cc.Name LIKE '%Mirror%'
       OR cc.Name LIKE '%Screen%' OR cc.Name LIKE '%Splashback%');
PRINT '✅ Glass/glazing suppliers → Windows/glass cost centres';
GO

-- INSULATION suppliers → Cost centres with "Insulat" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 13 AND Archived = 0  -- Insulation
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Insulat%';
PRINT '✅ Insulation suppliers → Insulation cost centres';
GO

-- LANDSCAPING suppliers → Cost centres with "Landscape", "Paving", "Water tank" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 14 AND Archived = 0  -- Landscaping
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Landscape%' OR cc.Name LIKE '%Paving%' OR cc.Name LIKE '%Water tank%'
       OR cc.Name LIKE '%Letterbox%' OR cc.Name LIKE '%Clothes Hoist%');
PRINT '✅ Landscaping suppliers → Landscaping cost centres';
GO

-- DOORS & WINDOWS suppliers → Cost centres with "Door", "Window", "Frame" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 15 AND Archived = 0  -- Doors & Windows
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Door%' OR cc.Name LIKE '%Window%' OR cc.Name LIKE '%Frame%' OR cc.Name LIKE '%Entry%')
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[NominatedSupplier] ns
    WHERE ns.CostCentre = cc.Code AND ns.Code = s.Supplier_Code
  );
PRINT '✅ Doors/windows suppliers → Doors/windows cost centres';
GO

-- BRICKS & MASONRY suppliers → Cost centres with "Brick" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 16 AND Archived = 0  -- Bricks & Masonry
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Brick%' OR cc.Name LIKE '%Render%' OR cc.Name LIKE '%Lintel%');
PRINT '✅ Brickwork suppliers → Brickwork cost centres';
GO

-- JOINERY suppliers → Cost centres with "Joinery", "Stair", "Wardrobe" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 17 AND Archived = 0  -- Joinery & Cabinets
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Stair%' OR cc.Name LIKE '%Wardrobe%' OR cc.Name LIKE '%Sliding Robe%')
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[NominatedSupplier] ns
    WHERE ns.CostCentre = cc.Code AND ns.Code = s.Supplier_Code
  );
PRINT '✅ Joinery suppliers → Joinery cost centres';
GO

-- FENCING suppliers → Cost centres with "Fence", "Balustrade" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 18 AND Archived = 0  -- Fencing
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Fenc%' OR cc.Name LIKE '%Balustrade%');
PRINT '✅ Fencing suppliers → Fencing cost centres';
GO

-- EXCAVATION suppliers → Cost centres with "Excavat", "Drain" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 19 AND Archived = 0  -- Excavation
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Excavat%' OR cc.Name LIKE '%Drain%');
PRINT '✅ Excavation suppliers → Excavation cost centres';
GO

-- SCAFFOLDING suppliers → Cost centres with "Scaffold", "Guard Rail" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 20 AND Archived = 0  -- Scaffolding
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Scaffold%' OR cc.Name LIKE '%Guard Rail%');
PRINT '✅ Scaffolding suppliers → Scaffolding cost centres';
GO

-- HVAC suppliers → Cost centres with "Heat", "Cooling", "HVAC" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 21 AND Archived = 0  -- HVAC
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Heat%' OR cc.Name LIKE '%Cooling%' OR cc.Name LIKE '%Ducted%');
PRINT '✅ HVAC suppliers → HVAC cost centres';
GO

-- TILING suppliers → Cost centres with "Tile" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 3 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 22 AND Archived = 0  -- Tiling
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Til%';
PRINT '✅ Tiling suppliers → Tiling cost centres';
GO

-- PLASTERING suppliers → Cost centres with "Plaster" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 23 AND Archived = 0  -- Plastering
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND cc.Name LIKE '%Plaster%';
PRINT '✅ Plastering suppliers → Plastering cost centres';
GO

-- WATERPROOFING suppliers → Cost centres with "Waterproof", "Bath", "Shower" in name
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 25 AND Archived = 0  -- Waterproofing
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Waterproof%' OR cc.Name LIKE '%Bath%' OR cc.Name LIKE '%Shower%')
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[NominatedSupplier] ns
    WHERE ns.CostCentre = cc.Code AND ns.Code = s.Supplier_Code
  );
PRINT '✅ Waterproofing suppliers → Waterproofing cost centres';
GO

-- GENERAL BUILDING suppliers (Bunnings, Mitre 10) → Some general cost centres only
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 1 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 1 AND Archived = 0  -- General Building
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Pre-Construction%' OR cc.Name LIKE '%Temporary%' OR cc.Name LIKE '%Sundry%');
PRINT '✅ General building suppliers → General cost centres only';
GO

-- CLEANING suppliers → Cleaning cost centres
INSERT INTO [dbo].[NominatedSupplier] (CCBank, CostCentre, Code)
SELECT 1, cc.Code, s.Supplier_Code
FROM [dbo].[CostCentres] cc
CROSS APPLY (
    SELECT TOP 2 Supplier_Code
    FROM [dbo].[Supplier]
    WHERE SuppGroup = 34 AND Archived = 0  -- Cleaning
    ORDER BY SupplierName
) s
WHERE cc.Tier = 1
  AND cc.Code >= '100' AND cc.Code <= '999'
  AND (cc.Name LIKE '%Clean%');
PRINT '✅ Cleaning suppliers → Cleaning cost centres';
GO

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ Targeted allocation complete!';
PRINT '';

-- Summary statistics
SELECT
    COUNT(DISTINCT CostCentre) AS [Cost Centres with Suppliers],
    COUNT(DISTINCT Code) AS [Unique Suppliers Used],
    COUNT(*) AS [Total Nominations],
    COUNT(*) / NULLIF(COUNT(DISTINCT CostCentre), 0) AS [Avg Suppliers per CC]
FROM [dbo].[NominatedSupplier];

PRINT '';
PRINT '💡 Each cost centre now has 1-3 highly relevant suppliers';
PRINT '💡 Restart DBx BOQ and check Settings → Nominated Suppliers';
GO
