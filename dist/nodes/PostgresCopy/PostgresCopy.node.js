"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresCopy = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const pg_1 = require("pg");
const pg_copy_streams_1 = require("pg-copy-streams");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
class PostgresCopy {
    constructor() {
        this.description = {
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
                    name: 'postgres',
                    required: true,
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
                // COPY TO
                {
                    displayName: 'Query',
                    name: 'query',
                    type: 'string',
                    typeOptions: { rows: 4 },
                    displayOptions: { show: { operation: ['copyTo'] } },
                    default: 'SELECT * FROM table_name',
                    required: true,
                    description: 'SELECT query to export data',
                },
                {
                    displayName: 'Output Format',
                    name: 'outputFormat',
                    type: 'options',
                    displayOptions: { show: { operation: ['copyTo'] } },
                    options: [
                        { name: 'CSV (Comma-Separated)', value: 'csv' },
                        { name: 'TSV (Tab-Separated)', value: 'tsv' },
                        { name: 'Custom Delimiter', value: 'custom' },
                    ],
                    default: 'csv',
                    description: 'Output file format',
                },
                {
                    displayName: 'Custom Delimiter',
                    name: 'customDelimiter',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyTo'], outputFormat: ['custom'] } },
                    default: '|',
                    description: 'Custom delimiter character',
                },
                {
                    displayName: 'Include Header Row',
                    name: 'includeHeader',
                    type: 'boolean',
                    displayOptions: { show: { operation: ['copyTo'] } },
                    default: true,
                    description: 'Include column names as first row',
                },
                {
                    displayName: 'File Name',
                    name: 'fileName',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyTo'] } },
                    default: 'export.csv',
                    description: 'Name of the output file',
                },
                {
                    displayName: 'Binary Property Name',
                    name: 'binaryPropertyName',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyTo'] } },
                    default: 'data',
                    description: 'Binary property to store output file',
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    displayOptions: { show: { operation: ['copyTo'] } },
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
                // COPY FROM
                {
                    displayName: 'Table Name',
                    name: 'tableName',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    default: '',
                    required: true,
                    description: 'Target table name',
                },
                {
                    displayName: 'Input Binary Field',
                    name: 'inputBinaryField',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    default: 'data',
                    required: true,
                    description: 'Binary field containing file to import',
                },
                {
                    displayName: 'Input Format',
                    name: 'inputFormat',
                    type: 'options',
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    options: [
                        { name: 'CSV (Comma-Separated)', value: 'csv' },
                        { name: 'TSV (Tab-Separated)', value: 'tsv' },
                        { name: 'Custom Delimiter', value: 'custom' },
                    ],
                    default: 'csv',
                    description: 'Input file format',
                },
                {
                    displayName: 'Custom Delimiter',
                    name: 'inputCustomDelimiter',
                    type: 'string',
                    displayOptions: { show: { operation: ['copyFrom'], inputFormat: ['custom'] } },
                    default: '|',
                    description: 'Custom delimiter character',
                },
                {
                    displayName: 'Has Header Row',
                    name: 'hasHeader',
                    type: 'boolean',
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    default: true,
                    description: 'First row contains column names',
                },
                {
                    displayName: 'Column Mapping',
                    name: 'columnMapping',
                    type: 'fixedCollection',
                    typeOptions: { multipleValues: true },
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    default: {},
                    description: 'Map input columns to table columns (order matters)',
                    options: [
                        {
                            name: 'columns',
                            displayName: 'Columns',
                            values: [
                                {
                                    displayName: 'Target Column',
                                    name: 'target',
                                    type: 'string',
                                    default: '',
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Options',
                    name: 'inputOptions',
                    type: 'collection',
                    placeholder: 'Add Option',
                    displayOptions: { show: { operation: ['copyFrom'] } },
                    default: {},
                    options: [
                        {
                            displayName: 'Quote Character',
                            name: 'quoteChar',
                            type: 'string',
                            default: '"',
                        },
                        {
                            displayName: 'Null String',
                            name: 'nullString',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Skip Errors',
                            name: 'skipErrors',
                            type: 'boolean',
                            default: false,
                            description: 'Continue on row errors (best effort)',
                        },
                        {
                            displayName: 'Dry Run',
                            name: 'dryRun',
                            type: 'boolean',
                            default: false,
                            description: 'Validate without importing (transaction rollback)',
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        const credentials = (await this.getCredentials('postgres'));
        const sslConfig = PostgresCopy.buildSslConfig(credentials);
        const client = new pg_1.Client({
            host: credentials.host,
            port: credentials.port,
            database: credentials.database,
            user: credentials.user,
            password: credentials.password,
            ssl: sslConfig,
        });
        try {
            await client.connect();
            for (let i = 0; i < items.length; i++) {
                if (operation === 'copyTo') {
                    const result = await PostgresCopy.prototype.executeCopyTo.call(this, client, i);
                    returnData.push(result);
                }
                else if (operation === 'copyFrom') {
                    const result = await PostgresCopy.prototype.executeCopyFrom.call(this, client, items[i], i);
                    returnData.push(result);
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
                        itemIndex: i,
                    });
                }
            }
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), error.message);
        }
        finally {
            await client.end().catch(() => { });
        }
        return this.prepareOutputData(returnData);
    }
    static buildCopyOptions(format, delimiter, opts) {
        const copyOptions = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
        if (opts.includeHeader)
            copyOptions.push('HEADER');
        if (opts.quoteChar)
            copyOptions.push(`QUOTE '${opts.quoteChar}'`);
        if (opts.nullString !== undefined)
            copyOptions.push(`NULL '${opts.nullString}'`);
        if (opts.encoding)
            copyOptions.push(`ENCODING '${opts.encoding}'`);
        return copyOptions.join(', ');
    }
    static resolveDelimiter(format, custom) {
        if (format === 'tsv')
            return '\t';
        if (format === 'custom')
            return custom || '|';
        return ',';
    }
    // Normalize SSL config coming from n8n Postgres credentials to pg client format
    static buildSslConfig(creds) {
        var _a;
        const sslVal = creds.ssl;
        const ignore = creds.allowUnauthorizedCerts ||
            creds.ignoreSslIssues ||
            (creds.rejectUnauthorized === false);
        if (sslVal === false || sslVal === undefined) {
            return false;
        }
        if (typeof sslVal === 'string') {
            const v = sslVal.toLowerCase();
            // values like "disable", "allow", "prefer" should not force SSL
            if (['disable', 'off', 'false', 'allow', 'prefer'].includes(v)) {
                return false;
            }
            // other string modes -> enable ssl
            return { rejectUnauthorized: ignore ? false : true };
        }
        if (sslVal === true) {
            return { rejectUnauthorized: ignore ? false : true };
        }
        if (typeof sslVal === 'object') {
            return { ...sslVal, rejectUnauthorized: ignore ? false : (_a = sslVal.rejectUnauthorized) !== null && _a !== void 0 ? _a : true };
        }
        return false;
    }
    async executeCopyTo(client, itemIndex) {
        const timeoutMs = 30000; // hard timeout to avoid hanging
        const query = this.getNodeParameter('query', itemIndex);
        const outputFormat = this.getNodeParameter('outputFormat', itemIndex);
        const includeHeader = this.getNodeParameter('includeHeader', itemIndex);
        const fileName = this.getNodeParameter('fileName', itemIndex);
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {}) || {};
        const delimiter = PostgresCopy.resolveDelimiter(outputFormat, this.getNodeParameter('customDelimiter', itemIndex, '|'));
        const copyOptions = PostgresCopy.buildCopyOptions(outputFormat, delimiter, {
            delimiter,
            includeHeader,
            quoteChar: options.quoteChar,
            nullString: options.nullString,
            encoding: options.encoding,
        });
        const copyCommand = `COPY (${query}) TO STDOUT WITH (${copyOptions})`;
        const start = Date.now();
        let stream;
        try {
            // @ts-expect-error - pg-copy-streams returns Readable but pg types expect Submittable
            stream = client.query((0, pg_copy_streams_1.to)(copyCommand));
        }
        catch (error) {
            const errorMsg = error.message || String(error);
            const description = errorMsg.includes('does not exist')
                ? `Table or column does not exist: ${errorMsg}`
                : `COPY TO query failed: ${errorMsg}`;
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), description, { itemIndex });
        }
        const chunks = [];
        let rowCount = 0;
        let streamError = null;
        const timeout = setTimeout(() => {
            stream.destroy(new Error(`COPY TO timeout after ${timeoutMs / 1000}s`));
        }, timeoutMs);
        try {
            await new Promise((resolve, reject) => {
                stream.on('data', (chunk) => {
                    chunks.push(chunk);
                    rowCount += (chunk.toString().match(/\n/g) || []).length;
                });
                stream.on('error', (err) => {
                    clearTimeout(timeout);
                    streamError = err;
                    // Reject immediately on error to prevent hanging
                    reject(err);
                });
                stream.on('end', () => {
                    clearTimeout(timeout);
                    // Check if error occurred before end event
                    if (streamError) {
                        reject(streamError);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        catch (error) {
            const errorMsg = error.message || String(error);
            const description = errorMsg.includes('does not exist')
                ? `Table or column does not exist: ${errorMsg}`
                : `COPY TO failed: ${errorMsg}`;
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), description, { itemIndex });
        }
        const fileBuffer = Buffer.concat(chunks);
        if (includeHeader && rowCount > 0)
            rowCount -= 1;
        const executionTimeMs = Date.now() - start;
        const mimeType = outputFormat === 'csv' ? 'text/csv' : 'text/tab-separated-values';
        const fileExtension = outputFormat === 'csv' ? 'csv' : 'tsv';
        const binaryData = await this.helpers.prepareBinaryData(fileBuffer, fileName, mimeType);
        binaryData.fileExtension = fileExtension;
        return {
            json: {
                rowCount,
                fileSize: fileBuffer.length,
                executionTimeMs,
                fileName,
                format: outputFormat,
            },
            binary: {
                [binaryPropertyName]: binaryData,
            },
        };
    }
    async executeCopyFrom(client, item, itemIndex) {
        const timeoutMs = 30000; // hard timeout to avoid hanging
        const tableName = this.getNodeParameter('tableName', itemIndex);
        const inputBinaryField = this.getNodeParameter('inputBinaryField', itemIndex);
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex);
        const hasHeader = this.getNodeParameter('hasHeader', itemIndex);
        const columnMapping = this.getNodeParameter('columnMapping', itemIndex, {});
        const inputOptions = this.getNodeParameter('inputOptions', itemIndex, {}) || {};
        if (!item.binary || !item.binary[inputBinaryField]) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data found in property "${inputBinaryField}"`, {
                itemIndex,
            });
        }
        const binaryData = item.binary[inputBinaryField];
        const buffer = Buffer.from(binaryData.data, 'base64');
        const delimiter = PostgresCopy.resolveDelimiter(inputFormat, this.getNodeParameter('inputCustomDelimiter', itemIndex, '|'));
        const columnList = [];
        const mapping = columnMapping.columns;
        if (mapping && Array.isArray(mapping)) {
            for (const m of mapping) {
                if (m.target)
                    columnList.push(m.target);
            }
        }
        const opts = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
        if (hasHeader)
            opts.push('HEADER');
        if (inputOptions.quoteChar)
            opts.push(`QUOTE '${inputOptions.quoteChar}'`);
        if (inputOptions.nullString !== undefined)
            opts.push(`NULL '${inputOptions.nullString}'`);
        const columnClause = columnList.length ? `(${columnList.join(',')})` : '';
        const copyCommand = `COPY ${tableName} ${columnClause} FROM STDIN WITH (${opts.join(', ')})`;
        const dryRun = inputOptions.dryRun;
        let rowsImported = 0;
        try {
            await client.query('BEGIN');
            // @ts-expect-error - pg-copy-streams returns Writable but pg types expect Submittable
            const targetStream = client.query((0, pg_copy_streams_1.from)(copyCommand));
            const source = stream_1.Readable.from(buffer);
            // Add timeout protection with race condition
            const pipelinePromise = (0, promises_1.pipeline)(source, targetStream);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    targetStream.destroy();
                    reject(new Error(`COPY FROM timeout after ${timeoutMs / 1000}s`));
                }, timeoutMs);
            });
            await Promise.race([pipelinePromise, timeoutPromise]);
            // Row count is not easily available; leave undefined
            rowsImported = 0;
            if (dryRun) {
                await client.query('ROLLBACK');
            }
            else {
                await client.query('COMMIT');
            }
        }
        catch (error) {
            await client.query('ROLLBACK').catch(() => { });
            // Provide more descriptive error message
            const errorMsg = error.message || String(error);
            const description = errorMsg.includes('does not exist')
                ? `Table or column does not exist: ${errorMsg}`
                : `COPY FROM failed: ${errorMsg}`;
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), description, { itemIndex });
        }
        return {
            json: {
                success: true,
                table: tableName,
                rowsImported,
                rowsSkipped: 0,
                errors: [],
                executionTimeMs: undefined,
                dryRun: !!dryRun,
            },
        };
    }
}
exports.PostgresCopy = PostgresCopy;
