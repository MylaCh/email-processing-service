# Supplier File Specification

Suppliers send Excel files (.xlsx) containing product data. Each file represents a purchase order from a single supplier.

## File Structure

- **Format:** `.xlsx`
- **Sheets:** The file may contain multiple sheets. A file is considered a supplier file if **any** of its sheets contains product data matching the structure below.
- **Row 1:** Column headers
- **Row 2+:** One row per SKU (a product in a specific size)
- Empty rows should be skipped

## Required Columns

Every supplier file **must** contain these fields (column names may vary):

| Field | Description | Example |
|-------|-------------|---------|
| **Brand** | Brand name | `Calvin Klein`, `Tommy Hilfiger` |
| **Model Code** | Article-level identifier (not size-specific) | `MW0MW35585` |
| **Color** | Product color | `Desert Sky`, `Black` |
| **Size** | Size label | `S`, `M`, `42`, `ONESIZE` |
| **RRP** | Recommended retail price (numeric, no currency symbol) | `59.99` |

## Optional Columns

These may or may not be present depending on the supplier:

| Field | Example |
|-------|---------|
| Barcode / EAN | `8720646372928` |
| Currency | `EUR`, `PLN` |
| Category | `T-shirts`, `Coats` |
| Gender | `M`, `F`, `Unisex`, `Kids` |
| Season | `SS25`, `FW24` |
| Composition | `95% Cotton, 5% Elastane` |
| Country of Origin | `Vietnam`, `Bangladesh` |
| Quantity | `78` |
| Product Description | Free-text description |


## Example Rows

**Supplier A (Tommy Hilfiger):**

| Article Style | Article Color Text | Article Size | GTIN | Price Retail |
|---|---|---|---|---|
| MW0MW35585 | Desert Sky | S | 8720646372928 | 89.9 |
| MW0MW35585 | Desert Sky | M | 8720646372935 | 89.9 |

**Supplier B (H&M):**

| Article Number | Article Description | Color | Size | RRP | Currency |
|---|---|---|---|---|---|
| 0279701001187001 | Nail polish remover | Black | NOSIZE | 19.9 | PLN |
| 1234567890123456 | Slim Fit T-shirt | White | M | 49.9 | PLN |
