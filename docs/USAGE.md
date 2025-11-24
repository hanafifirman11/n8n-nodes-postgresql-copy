# Usage

## Copy To (Export)
1. Set `Operation` = Copy To (Export)
2. Provide `Query` (SELECT).
3. Choose `Output Format` (CSV/TSV/Custom).
4. Optional: `Custom Delimiter`, `Include Header`.
5. Set `File Name` and `Binary Property Name`.
6. Run node; output binary contains the file, JSON has rowCount/fileSize/time.

## Copy From (Import)
1. Set `Operation` = Copy From (Import).
2. Set `Table Name`.
3. Set `Input Binary Field` (where the incoming CSV/TSV is stored).
4. Choose `Input Format` (CSV/TSV/Custom) and delimiter.
5. Optional: `Has Header`, `Column Mapping`, `Quote`, `Null String`, `Dry Run`.
6. Run node; JSON returns success + stats.

## Tips
- Keep queries simple and safe; avoid unbounded exports.
- Use `Binary Property Name` consistently with upstream/downstream nodes.
- For large imports, prefer running inside a transaction (default) and disable `Dry Run` to commit.
- `Column Mapping` lets you define target columns order; input column order must match file order.
