# n8n PostgreSQL COPY Node - Complete Development Guide

## Project Overview

Create a custom n8n community node that adds PostgreSQL COPY command support for efficient bulk data import/export operations. This node will handle streaming large datasets to/from CSV/TSV files while maintaining security through n8n's credential system.

## Project Specifications

### Package Information
- **Package Name**: `n8n-nodes-postgres-custom`
- **Version**: `1.0.0`
- **License**: MIT
- **n8n API Version**: 1
- **Node.js Version**: >=18.0.0
- **TypeScript**: Yes

### Core Dependencies
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "pg-copy-streams": "^6.0.5"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "n8n-workflow": "^1.0.0",
    "n8n-core": "^1.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

## Project Structure

```
n8n-nodes-postgres-custom/
├── nodes/
│   └── PostgresCopy/
│       ├── PostgresCopy.node.ts          # Main node implementation
│       ├── PostgresCopy.node.json        # Node metadata
│       ├── postgres.svg                  # Node icon
│       └── operations/
│           ├── copyTo.operation.ts       # COPY TO implementation
│           └── copyFrom.operation.ts     # COPY FROM implementation
├── credentials/
│   └── PostgresApi.credentials.ts        # Reuse existing postgres credentials
├── test/
│   ├── unit/
│   │   ├── copyTo.test.ts
│   │   └── copyFrom.test.ts
│   └── integration/
│       └── PostgresCopy.integration.test.ts
├── docs/
│   ├── README.md                         # Main documentation
│   ├── USAGE.md                          # Usage examples
│   ├── API.md                            # API reference
│   └── TROUBLESHOOTING.md                # Common issues
├── examples/
│   ├── export-to-csv.json                # n8n workflow example
│   ├── import-from-csv.json              # n8n workflow example
│   └── bulk-operations.json              # Advanced examples
├── package.json
├── tsconfig.json
├── jest.config.js
├── .npmignore
├── .gitignore
├── LICENSE
└── CHANGELOG.md
```

## Feature Requirements

### 1. COPY TO (Export) Operation

**UI Flow:**
1. User selects PostgreSQL credential (reuse existing `postgres` credential type from n8n)
2. Operation dropdown shows: "Copy To" / "Copy From"
3. When "Copy To" selected, show query input and format options
4. Execute and return binary file data

**Capabilities:**
- Execute SELECT query and stream results to file
- Support CSV and TSV formats
- Optional header row inclusion
- Custom delimiter support
- NULL value handling
- Quote character configuration
- Escape character configuration
- Streaming for large datasets (handle millions of rows)
- Progress tracking for long operations

**Parameters:**
- **Operation** (dropdown, required): 
  - Options: "Copy To (Export)", "Copy From (Import)"
  - Default: "Copy To (Export)"
- **Query** (string, required, show when operation=copyTo): SELECT statement to export
- **Output Format** (dropdown, required, show when operation=copyTo):
  - Options: "CSV", "TSV (Tab-Separated)", "Custom Delimiter"
  - Default: "CSV"
- **Custom Delimiter** (string, show when format=custom): Custom delimiter character
- **Include Header** (boolean, default: true): Include column names as first row
- **Quote Character** (string, default: '"', advanced): Character to quote fields
- **Null String** (string, default: '', advanced): String to represent NULL values
- **File Name** (string, default: 'export.csv'): Output filename
- **Binary Property Name** (string, default: 'data'): Property name for binary output

**Output (Binary Data):**
```javascript
{
  json: {
    rowCount: 1000,
    fileSize: 52428,
    executionTimeMs: 1234,
    fileName: 'export.csv',
    format: 'csv'
  },
  binary: {
    data: {
      data: '<base64_encoded_csv_content>',
      mimeType: 'text/csv',
      fileName: 'export.csv',
      fileExtension: 'csv',
      fileSize: 52428
    }
  }
}
```

### 2. COPY FROM (Import) Operation

**UI Flow:**
1. User selects same PostgreSQL credential (reuse from n8n)
2. Operation dropdown: Select "Copy From (Import)"
3. Specify table name and binary property to import
4. Execute and return import statistics

**Capabilities:**
- Import CSV/TSV file into PostgreSQL table
- Support for header row mapping
- Column subset import
- Data validation before import
- Streaming for large files
- Transaction support (rollback on error)
- Dry-run mode for validation

**Parameters:**
- **Operation** (dropdown, required): "Copy From (Import)"
- **Table Name** (string, required, show when operation=copyFrom): Target table name
- **Binary Property Name** (string, default: 'data', show when operation=copyFrom): Input binary property
- **Input Format** (dropdown, required, show when operation=copyFrom):
  - Options: "CSV", "TSV (Tab-Separated)", "Custom Delimiter"
  - Default: "CSV"
- **Custom Delimiter** (string, show when format=custom): Custom delimiter character
- **Has Header Row** (boolean, default: true): First row contains column names
- **Column Mapping** (fixedCollection, optional, advanced): Map CSV columns to table columns
- **Quote Character** (string, default: '"', advanced)
- **Null String** (string, default: '', advanced): String that represents NULL
- **Skip Errors** (boolean, default: false, advanced): Continue on row errors
- **Dry Run** (boolean, default: false, advanced): Validate without importing

**Output (JSON Data):**
```javascript
{
  json: {
    success: true,
    table: 'customers',
    rowsImported: 1000,
    rowsSkipped: 5,
    errors: [],
    executionTimeMs: 2345,
    dryRun: false
  }
}
```

### 3. Error Handling

**Required Error Scenarios:**
- Connection failures with retry logic
- Query syntax errors with helpful messages
- File format validation errors
- Large file memory management
- Transaction rollback on failures
- Credential validation errors
- Network timeout handling

### 4. Security Requirements

**Must Implement:**
- Use n8n credentials system (never expose passwords)
- SQL injection prevention (parameterized queries where applicable)
- File size limits to prevent DoS
- Memory limits for streaming operations
- SSL/TLS support for database connections
- Input validation and sanitization

## Implementation Guidelines

### Node Class Structure

```typescript
export class PostgresCopy implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Postgres COPY',
    name: 'postgresCopy',
    icon: 'file:postgres.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Execute PostgreSQL COPY commands for bulk operations',
    defaults: {
      name: 'Postgres COPY',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'postgres',  // ← Reuse existing PostgreSQL credential
        required: true,
        displayOptions: {
          show: {
            operation: ['copyTo', 'copyFrom'],
          },
        },
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Copy To (Export)',
            value: 'copyTo',
            description: 'Export query results to CSV/TSV file',
            action: 'Export data to file',
          },
          {
            name: 'Copy From (Import)',
            value: 'copyFrom',
            description: 'Import CSV/TSV file into table',
            action: 'Import data from file',
          },
        ],
        default: 'copyTo',
      },
      
      // === COPY TO Parameters ===
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        default: 'SELECT * FROM table_name',
        required: true,
        description: 'SELECT query to export data',
        placeholder: 'SELECT id, name, email FROM users WHERE created_at > NOW() - INTERVAL \'7 days\'',
      },
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        options: [
          {
            name: 'CSV (Comma-Separated)',
            value: 'csv',
          },
          {
            name: 'TSV (Tab-Separated)',
            value: 'tsv',
          },
          {
            name: 'Custom Delimiter',
            value: 'custom',
          },
        ],
        default: 'csv',
        description: 'Output file format',
      },
      {
        displayName: 'Custom Delimiter',
        name: 'customDelimiter',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['copyTo'],
            outputFormat: ['custom'],
          },
        },
        default: '|',
        description: 'Custom delimiter character (e.g., | or ;)',
      },
      {
        displayName: 'Include Header Row',
        name: 'includeHeader',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        default: true,
        description: 'Whether to include column names as first row',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        default: 'export.csv',
        description: 'Name of the output file',
        placeholder: 'data_{{$now.format(\'YYYY-MM-DD\')}}.csv',
      },
      {
        displayName: 'Binary Property Name',
        name: 'binaryPropertyName',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        default: 'data',
        description: 'Name of the binary property to store the file',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            operation: ['copyTo'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Quote Character',
            name: 'quoteChar',
            type: 'string',
            default: '"',
            description: 'Character to quote fields containing delimiter',
          },
          {
            displayName: 'Null String',
            name: 'nullString',
            type: 'string',
            default: '',
            description: 'String to represent NULL values',
          },
          {
            displayName: 'Encoding',
            name: 'encoding',
            type: 'options',
            options: [
              { name: 'UTF-8', value: 'UTF8' },
              { name: 'Latin1', value: 'LATIN1' },
              { name: 'Win1252', value: 'WIN1252' },
            ],
            default: 'UTF8',
            description: 'Character encoding for output file',
          },
        ],
      },
      
      // === COPY FROM Parameters ===
      {
        displayName: 'Table Name',
        name: 'tableName',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['copyFrom'],
          },
        },
        default: '',
        required: true,
        description: 'Name of the table to import data into',
        placeholder: 'customers',
      },
      {
        displayName: 'Input Binary Field',
        name: 'inputBinaryField',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['copyFrom'],
          },
        },
        default: 'data',
        required: true,
        description: 'Name of the binary field containing the file to import',
      },
      {
        displayName: 'Input Format',
        name: 'inputFormat',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['copyFrom'],
          },
        },
        options: [
          {
            name: 'CSV (Comma-Separated)',
            value: 'csv',
          },
          {
            name: 'TSV (Tab-Separated)',
            value: 'tsv',
          },
          {
            name: 'Custom Delimiter',
            value: 'custom',
          },
        ],
        default: 'csv',
        description: 'Input file format',
      },
      {
        displayName: 'Has Header Row',
        name: 'hasHeader',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['copyFrom'],
          },
        },
        default: true,
        description: 'Whether the first row contains column names',
      },
      // Additional COPY FROM parameters...
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    // Get PostgreSQL credentials (reuse existing n8n postgres credential)
    const credentials = await this.getCredentials('postgres') as IDataObject;

    const client = new Client({
      host: credentials.host as string,
      port: credentials.port as number,
      database: credentials.database as string,
      user: credentials.user as string,
      password: credentials.password as string,
      ssl: credentials.ssl as boolean | object,
      allowExitOnIdle: credentials.allowExitOnIdle as boolean,
    });

    try {
      await client.connect();

      for (let i = 0; i < items.length; i++) {
        if (operation === 'copyTo') {
          // Execute COPY TO and return binary data
          const result = await this.executeCopyTo(client, i);
          returnData.push(result);
          
        } else if (operation === 'copyFrom') {
          // Execute COPY FROM and return statistics
          const result = await this.executeCopyFrom(client, items[i], i);
          returnData.push(result);
        }
      }

    } finally {
      await client.end();
    }

    return [returnData];
  }

  private async executeCopyTo(
    this: IExecuteFunctions,
    client: Client,
    itemIndex: number,
  ): Promise<INodeExecutionData> {
    const query = this.getNodeParameter('query', itemIndex) as string;
    const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
    const includeHeader = this.getNodeParameter('includeHeader', itemIndex) as boolean;
    const fileName = this.getNodeParameter('fileName', itemIndex) as string;
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
    const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

    // Determine delimiter
    let delimiter = ',';
    if (outputFormat === 'tsv') {
      delimiter = '\t';
    } else if (outputFormat === 'custom') {
      delimiter = this.getNodeParameter('customDelimiter', itemIndex) as string;
    }

    // Build COPY command
    const copyOptions = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
    
    if (includeHeader) {
      copyOptions.push('HEADER');
    }
    
    if (options.quoteChar) {
      copyOptions.push(`QUOTE '${options.quoteChar}'`);
    }
    
    if (options.nullString !== undefined) {
      copyOptions.push(`NULL '${options.nullString}'`);
    }
    
    if (options.encoding) {
      copyOptions.push(`ENCODING '${options.encoding}'`);
    }

    const copyCommand = `COPY (${query}) TO STDOUT WITH (${copyOptions.join(', ')})`;

    // Execute COPY TO STDOUT and collect data
    const startTime = Date.now();
    const stream = client.query(copyCommand);
    
    const chunks: Buffer[] = [];
    let rowCount = 0;
    
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      // Approximate row count (count newlines)
      rowCount += (chunk.toString().match(/\n/g) || []).length;
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const fileBuffer = Buffer.concat(chunks);
    const executionTime = Date.now() - startTime;

    // Adjust row count if header is included
    if (includeHeader && rowCount > 0) {
      rowCount -= 1;
    }

    // Determine MIME type
    const mimeType = outputFormat === 'csv' ? 'text/csv' : 'text/tab-separated-values';
    const fileExtension = outputFormat === 'csv' ? 'csv' : 'tsv';

    // Return as binary data
    return {
      json: {
        rowCount,
        fileSize: fileBuffer.length,
        executionTimeMs: executionTime,
        fileName,
        format: outputFormat,
      },
      binary: {
        [binaryPropertyName]: {
          data: fileBuffer.toString('base64'),
          mimeType,
          fileName,
          fileExtension,
          fileSize: fileBuffer.length,
        },
      },
    };
  }

  private async executeCopyFrom(
    this: IExecuteFunctions,
    item: INodeExecutionData,
    itemIndex: number,
  ): Promise<INodeExecutionData> {
    // Implementation for COPY FROM...
    // Returns JSON with import statistics
  }
}
```

### Streaming Implementation Example

```typescript
// COPY TO with streaming
import { pipeline } from 'stream/promises';
import copyTo from 'pg-copy-streams';

async function executeCopyTo(client, query, format, options) {
  const copyQuery = buildCopyToQuery(query, format, options);
  const stream = client.query(copyTo.to(copyQuery));
  
  const chunks: Buffer[] = [];
  
  stream.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  await pipeline(stream);
  
  return Buffer.concat(chunks);
}
```

### Error Handling Pattern

```typescript
try {
  await client.connect();
  
  // Execute operation
  const result = await executeOperation();
  
  return result;
  
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    throw new NodeOperationError(
      this.getNode(),
      'Failed to connect to PostgreSQL. Check host and port.',
      { description: error.message }
    );
  }
  
  if (error.code === '42P01') {
    throw new NodeOperationError(
      this.getNode(),
      'Table does not exist',
      { description: `Table "${tableName}" not found in database` }
    );
  }
  
  throw error;
  
} finally {
  await client.end();
}
```

## Testing Requirements

### Unit Tests (Jest)

**Test Files Required:**
1. `copyTo.test.ts` - Test COPY TO operations
2. `copyFrom.test.ts` - Test COPY FROM operations
3. `errorHandling.test.ts` - Test error scenarios
4. `validation.test.ts` - Test input validation

**Test Coverage Requirements:**
- Minimum 80% code coverage
- All error paths tested
- Edge cases covered (empty results, large files, special characters)

**Sample Test Structure:**

```typescript
describe('PostgresCopy - COPY TO', () => {
  let mockExecuteFunctions: IExecuteFunctions;
  let mockClient: Client;
  
  beforeEach(() => {
    // Setup mocks
  });
  
  it('should export data to CSV with headers', async () => {
    // Test implementation
  });
  
  it('should handle empty result sets', async () => {
    // Test implementation
  });
  
  it('should throw error for invalid queries', async () => {
    // Test implementation
  });
  
  it('should handle special characters in data', async () => {
    // Test implementation
  });
});
```

### Integration Tests

**Requirements:**
- Test against actual PostgreSQL instance (use Docker)
- Test with various data types (integers, strings, dates, JSON, arrays)
- Test with large datasets (1M+ rows)
- Test concurrent operations
- Test transaction rollback scenarios

**Docker Setup for Testing:**

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5432:5432"
    volumes:
      - ./test/fixtures:/docker-entrypoint-initdb.d
```

## Documentation Requirements

### 1. README.md

**Must Include:**
- Project description and purpose
- Installation instructions (npm and n8n UI)
- Quick start guide
- Feature list
- Prerequisites
- License information
- Contribution guidelines
- Support/contact information

### 2. USAGE.md

**Must Include:**
- Detailed parameter descriptions
- Step-by-step usage examples
- Common use cases:
  - Export query results to CSV
  - Import CSV to table
  - Bulk data migration
  - Scheduled data exports
  - Data transformation workflows
- Screenshots of node configuration
- Best practices
- Performance tips

### 3. API.md

**Must Include:**
- Complete parameter reference
- Return value specifications
- Error codes and messages
- Examples for each operation
- TypeScript type definitions

### 4. TROUBLESHOOTING.md

**Must Include:**
- Common errors and solutions
- Performance optimization tips
- Memory management guidelines
- Connection issues
- Permission errors
- Data format issues
- FAQ section

## Example Workflows

### Example 1: Daily Data Export

```json
{
  "name": "Daily Sales Export",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "hoursInterval": 24}]
        }
      }
    },
    {
      "name": "Export Sales Data",
      "type": "n8n-nodes-postgres-custom.postgresCopy",
      "parameters": {
        "operation": "copyTo",
        "query": "SELECT * FROM sales WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'",
        "format": "csv",
        "header": true,
        "fileName": "sales_{{$now.format('YYYY-MM-DD')}}.csv"
      }
    },
    {
      "name": "Upload to S3",
      "type": "n8n-nodes-base.awsS3",
      "parameters": {
        "operation": "upload",
        "bucketName": "exports",
        "binaryPropertyName": "data"
      }
    }
  ]
}
```

### Example 2: CSV Import with Validation

```json
{
  "name": "Import Customer Data",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "import-customers",
        "options": {
          "rawBody": true
        }
      }
    },
    {
      "name": "Import to PostgreSQL",
      "type": "n8n-nodes-postgres-custom.postgresCopy",
      "parameters": {
        "operation": "copyFrom",
        "tableName": "customers",
        "format": "csv",
        "header": true,
        "dryRun": false,
        "skipErrors": false
      }
    },
    {
      "name": "Send Notification",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "text": "Import completed: {{$json.rowsImported}} rows"
      }
    }
  ]
}
```

## npm Publishing Checklist

**Before Publishing:**
- [ ] All tests pass (npm test)
- [ ] Code linted (npm run lint)
- [ ] Build successful (npm run build)
- [ ] README.md complete
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] License file included
- [ ] .npmignore configured (exclude test/, docs/, examples/)
- [ ] Keywords added to package.json: ["n8n-community-node-package", "n8n", "postgresql", "copy", "bulk", "import", "export"]

**package.json Configuration:**

```json
{
  "name": "n8n-nodes-postgres-custom",
  "version": "1.0.0",
  "description": "n8n community node for PostgreSQL COPY command - efficient bulk import/export",
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "postgresql",
    "postgres",
    "copy",
    "bulk",
    "import",
    "export",
    "csv",
    "tsv"
  ],
  "license": "MIT",
  "homepage": "https://github.com/yourusername/n8n-nodes-postgres-custom",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/n8n-nodes-postgres-custom.git"
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials package.json",
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/PostgresApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/PostgresCopy/PostgresCopy.node.js"
    ]
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Publishing Commands:**

```bash
# Login to npm
npm login

# Publish (first time)
npm publish

# Publish updates
npm version patch  # or minor, major
npm publish

# Publish with tag (for beta versions)
npm publish --tag beta
```

## Performance Requirements

**Benchmarks to Achieve:**
- Export 1M rows: < 30 seconds
- Import 1M rows: < 60 seconds
- Memory usage: < 500MB for any operation
- Support files up to 10GB

**Optimization Techniques:**
- Use streaming (no loading entire dataset to memory)
- Implement connection pooling for multiple operations
- Use COPY instead of INSERT for bulk operations
- Implement batch processing for validation

## Maintenance and Updates

**Version Planning:**
- v1.0.0: Initial release with COPY TO/FROM
- v1.1.0: Add support for binary formats
- v1.2.0: Add data transformation options
- v2.0.0: Add support for PostgreSQL 16+ features

**Monitoring Requirements:**
- Track npm download statistics
- Monitor GitHub issues
- Collect user feedback
- Track n8n version compatibility

## Success Criteria

**The project is complete when:**
1. All unit tests pass with >80% coverage
2. Integration tests pass against PostgreSQL 12, 13, 14, 15
3. Documentation is complete and reviewed
4. Package successfully installs in n8n
5. All example workflows execute successfully
6. Performance benchmarks are met
7. Security review completed
8. Published to npm registry
9. Listed on n8n community nodes page

## Additional Resources

**Reference Documentation:**
- n8n node development: https://docs.n8n.io/integrations/creating-nodes/
- PostgreSQL COPY: https://www.postgresql.org/docs/current/sql-copy.html
- pg-copy-streams: https://github.com/brianc/node-pg-copy-streams
- n8n credentials: https://docs.n8n.io/integrations/creating-nodes/build/reference/credentials/

**Example Community Nodes to Study:**
- n8n-nodes-base.postgres (official PostgreSQL node)
- n8n-nodes-base.spreadsheetFile (for binary file handling)
- Community nodes with streaming: https://www.npmjs.com/search?q=n8n-nodes

## Development Workflow

1. **Setup** (Day 1)
   - Initialize project with n8n-node-dev
   - Configure TypeScript and Jest
   - Setup Git repository

2. **Core Development** (Day 2-3)
   - Implement COPY TO operation
   - Implement COPY FROM operation
   - Add error handling

3. **Testing** (Day 4)
   - Write unit tests
   - Write integration tests
   - Performance testing

4. **Documentation** (Day 5)
   - Write README, USAGE, API docs
   - Create example workflows
   - Record demo video (optional)

5. **Publishing** (Day 6)
   - Final testing
   - Publish to npm
   - Submit to n8n community nodes

## Notes for Claude Code

- Use TypeScript strict mode
- Follow n8n coding conventions
- Implement comprehensive error messages
- Add JSDoc comments for all public methods
- Use async/await (no callbacks)
- Implement proper resource cleanup (close connections)
- Test edge cases thoroughly
- Optimize for production use (performance + security)
- Make code maintainable (clear variable names, small functions)
- Add logging for debugging (use n8n logger)