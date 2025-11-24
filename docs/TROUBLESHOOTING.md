# Troubleshooting

- **Connection refused**: verify host/port/ssl, DB reachable from n8n container.
- **Auth failed**: check user/password and DB name.
- **COPY syntax error**: validate query/table names; ensure delimiter matches file.
- **No binary found** (copyFrom): confirm upstream node sets binary on `Input Binary Field`.
- **Encoding issues**: set `Encoding` (copyTo) or ensure file encoding UTF-8 for import.
- **Dry Run**: enabled? Data won’t persist; disable to commit.
- **Large files**: ensure n8n container memory OK; COPY streams but buffering still uses RAM.
