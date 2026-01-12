import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { Client } from 'pg';
import { from as copyFrom, to as copyTo } from 'pg-copy-streams';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';

type CopyOptions = {
	delimiter: string;
	includeHeader: boolean;
	quoteChar?: string;
	nullString?: string;
	encoding?: string;
};

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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = (await this.getCredentials('postgres')) as IDataObject;

		const sslConfig = PostgresCopy.buildSslConfig(credentials);

		const client = new Client({
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			ssl: sslConfig,
		});

		try {
			await client.connect();

			for (let i = 0; i < items.length; i++) {
				if (operation === 'copyTo') {
					const result = await PostgresCopy.prototype.executeCopyTo.call(this, client, i);
					returnData.push(result);
				} else if (operation === 'copyFrom') {
					const result = await PostgresCopy.prototype.executeCopyFrom.call(this, client, items[i], i);
					returnData.push(result);
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}
			}
		} catch (error: any) {
			throw new NodeOperationError(this.getNode(), error.message);
		} finally {
			await client.end().catch(() => {});
		}

		return this.prepareOutputData(returnData);
	}

	private static buildCopyOptions(format: 'csv' | 'tsv' | 'custom', delimiter: string, opts: CopyOptions) {
		const copyOptions: string[] = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
		if (opts.includeHeader) copyOptions.push('HEADER');
		if (opts.quoteChar) copyOptions.push(`QUOTE '${opts.quoteChar}'`);
		if (opts.nullString !== undefined) copyOptions.push(`NULL '${opts.nullString}'`);
		if (opts.encoding) copyOptions.push(`ENCODING '${opts.encoding}'`);
		return copyOptions.join(', ');
	}

	private static resolveDelimiter(format: string, custom?: string): string {
		if (format === 'tsv') return '\t';
		if (format === 'custom') return custom || '|';
		return ',';
	}

	// Normalize SSL config coming from n8n Postgres credentials to pg client format
	private static buildSslConfig(creds: IDataObject): boolean | object {
		const sslVal = creds.ssl;
		const ignore =
			(creds.allowUnauthorizedCerts as boolean) ||
			(creds.ignoreSslIssues as boolean) ||
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
			return { ...(sslVal as object), rejectUnauthorized: ignore ? false : (sslVal as any).rejectUnauthorized ?? true };
		}

		return false;
	}

	async executeCopyTo(
		this: IExecuteFunctions,
		client: Client,
		itemIndex: number,
	): Promise<INodeExecutionData> {
		const timeoutMs = 30000; // hard timeout to avoid hanging
		const query = this.getNodeParameter('query', itemIndex) as string;
		const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
		const includeHeader = this.getNodeParameter('includeHeader', itemIndex) as boolean;
		const fileName = this.getNodeParameter('fileName', itemIndex) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const options = (this.getNodeParameter('options', itemIndex, {}) as IDataObject) || {};

		const delimiter = PostgresCopy.resolveDelimiter(
			outputFormat,
			this.getNodeParameter('customDelimiter', itemIndex, '|') as string,
		);

		const copyOptions = PostgresCopy.buildCopyOptions(outputFormat as any, delimiter, {
			delimiter,
			includeHeader,
			quoteChar: options.quoteChar as string,
			nullString: options.nullString as string,
			encoding: options.encoding as string,
		});

		const copyCommand = `COPY (${query}) TO STDOUT WITH (${copyOptions})`;

		const start = Date.now();
		let stream: Readable;

		try {
			// @ts-expect-error - pg-copy-streams returns Readable but pg types expect Submittable
			stream = client.query(copyTo(copyCommand)) as unknown as Readable;
		} catch (error: any) {
			const errorMsg = error.message || String(error);
			const description = errorMsg.includes('does not exist')
				? `Table or column does not exist: ${errorMsg}`
				: `COPY TO query failed: ${errorMsg}`;
			throw new NodeOperationError(this.getNode(), description, { itemIndex });
		}

		const chunks: Buffer[] = [];
		let rowCount = 0;
		let streamError: Error | null = null;

		const timeout = setTimeout(() => {
			stream.destroy(new Error(`COPY TO timeout after ${timeoutMs / 1000}s`));
		}, timeoutMs);

		try {
			await new Promise<void>((resolve, reject) => {
				stream.on('data', (chunk: Buffer) => {
					chunks.push(chunk);
					rowCount += (chunk.toString().match(/\n/g) || []).length;
				});

				stream.on('error', (err: Error) => {
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
					} else {
						resolve();
					}
				});
			});
		} catch (error: any) {
			const errorMsg = error.message || String(error);
			const description = errorMsg.includes('does not exist')
				? `Table or column does not exist: ${errorMsg}`
				: `COPY TO failed: ${errorMsg}`;
			throw new NodeOperationError(this.getNode(), description, { itemIndex });
		}

		const fileBuffer = Buffer.concat(chunks);
		if (includeHeader && rowCount > 0) rowCount -= 1;
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

	async executeCopyFrom(
		this: IExecuteFunctions,
		client: Client,
		item: INodeExecutionData,
		itemIndex: number,
	): Promise<INodeExecutionData> {
		const timeoutMs = 30000; // hard timeout to avoid hanging
		const tableName = this.getNodeParameter('tableName', itemIndex) as string;
		const inputBinaryField = this.getNodeParameter('inputBinaryField', itemIndex) as string;
		const inputFormat = this.getNodeParameter('inputFormat', itemIndex) as string;
		const hasHeader = this.getNodeParameter('hasHeader', itemIndex) as boolean;
		const columnMapping = this.getNodeParameter('columnMapping', itemIndex, {}) as IDataObject;
		const inputOptions = (this.getNodeParameter('inputOptions', itemIndex, {}) as IDataObject) || {};

		if (!item.binary || !item.binary[inputBinaryField]) {
			throw new NodeOperationError(this.getNode(), `No binary data found in property "${inputBinaryField}"`, {
				itemIndex,
			});
		}

		const binaryData = item.binary[inputBinaryField];
		const buffer = Buffer.from(binaryData.data, 'base64');

		const delimiter = PostgresCopy.resolveDelimiter(
			inputFormat,
			this.getNodeParameter('inputCustomDelimiter', itemIndex, '|') as string,
		);

		const columnList: string[] = [];
		const mapping = (columnMapping as any).columns as Array<{ target: string }>;
		if (mapping && Array.isArray(mapping)) {
			for (const m of mapping) {
				if (m.target) columnList.push(m.target);
			}
		}

		const opts: string[] = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
		if (hasHeader) opts.push('HEADER');
		if (inputOptions.quoteChar) opts.push(`QUOTE '${inputOptions.quoteChar}'`);
		if (inputOptions.nullString !== undefined) opts.push(`NULL '${inputOptions.nullString}'`);

		const columnClause = columnList.length ? `(${columnList.join(',')})` : '';
		const copyCommand = `COPY ${tableName} ${columnClause} FROM STDIN WITH (${opts.join(', ')})`;

		const dryRun = inputOptions.dryRun as boolean;
		let rowsImported = 0;

		try {
			await client.query('BEGIN');

			// @ts-expect-error - pg-copy-streams returns Writable but pg types expect Submittable
			const targetStream = client.query(copyFrom(copyCommand)) as unknown as Writable;
			const source = Readable.from(buffer);

			// Add timeout protection with race condition
			const pipelinePromise = pipeline(source, targetStream);
			const timeoutPromise = new Promise<never>((_, reject) => {
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
			} else {
				await client.query('COMMIT');
			}
		} catch (error: any) {
			await client.query('ROLLBACK').catch(() => {});
			// Provide more descriptive error message
			const errorMsg = error.message || String(error);
			const description = errorMsg.includes('does not exist')
				? `Table or column does not exist: ${errorMsg}`
				: `COPY FROM failed: ${errorMsg}`;
			throw new NodeOperationError(this.getNode(), description, { itemIndex });
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
