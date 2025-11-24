# n8n-nodes-postgresql-copy

Custom n8n community node (developer: **Firman Hanafi**) to run PostgreSQL `COPY TO` / `COPY FROM` with streaming (CSV/TSV/custom delimiter) for bulk export/import.

## Features
- COPY TO: export SELECT results to CSV/TSV/custom delimiter; header, quote/null, encoding options.
- COPY FROM: import CSV/TSV/custom delimiter from a binary property; header, column mapping, dry-run, skip errors.
- Streaming: avoids loading the whole file into memory.
- Uses n8n’s built-in Postgres credentials.

## Installation
- n8n UI: Settings → Community Nodes → install `n8n-nodes-postgresql-copy`.
- CLI (in your n8n directory): `npm install n8n-nodes-postgresql-copy`

## Node Configuration
- Credentials: select Postgres (host, port, database, user, password, ssl).
- Operation:
  - **Copy To (Export)**: set `Query`, `Output Format` (csv/tsv/custom), `File Name`, `Binary Property Name`, header/quote/null/encoding options.
  - **Copy From (Import)**: set `Table Name`, `Input Binary Field`, `Input Format` (csv/tsv/custom), `Has Header`, `Column Mapping`, quote/null/skipErrors/dryRun options.

## Output
- Copy To: JSON `{rowCount, fileSize, executionTimeMs, fileName, format}` + binary file (with `mimeType`, `fileName`, `fileExtension`).
- Copy From: JSON `{success, table, rowsImported, rowsSkipped, errors, executionTimeMs, dryRun}`.

## Notes
- For custom delimiter, fill `Custom Delimiter`.
- `Dry Run` rolls back the transaction (no data written).
- Ensure resources are sufficient for large files; COPY uses streaming but still needs memory headroom.

## Development
```
npm install
npm run build
npm test   # requires devDependencies
```

## License
MIT
