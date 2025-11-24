# API Reference

## Node: Postgres COPY
- **displayName**: Postgres COPY
- **name**: postgresCopy
- **version**: 1
- **credentials**: `postgres`

### Operations
- `copyTo` (export)
- `copyFrom` (import)

### Parameters (copyTo)
- `query` (string, required)
- `outputFormat` (csv|tsv|custom)
- `customDelimiter` (string, when custom)
- `includeHeader` (boolean)
- `fileName` (string)
- `binaryPropertyName` (string)
- `options.quoteChar` (string)
- `options.nullString` (string)
- `options.encoding` (UTF8|LATIN1|WIN1252)

### Parameters (copyFrom)
- `tableName` (string, required)
- `inputBinaryField` (string, required)
- `inputFormat` (csv|tsv|custom)
- `inputCustomDelimiter` (string, when custom)
- `hasHeader` (boolean)
- `columnMapping.columns[].target` (string, optional)
- `inputOptions.quoteChar` (string)
- `inputOptions.nullString` (string)
- `inputOptions.skipErrors` (boolean)
- `inputOptions.dryRun` (boolean)

### Outputs
- **copyTo**: JSON { rowCount, fileSize, executionTimeMs, fileName, format }, Binary at `binaryPropertyName`.
- **copyFrom**: JSON { success, table, rowsImported, rowsSkipped, errors, executionTimeMs, dryRun }.
