import { PostgresCopy } from '../../nodes/PostgresCopy/PostgresCopy.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { PassThrough, Readable } from 'stream';

describe('PostgresCopy - COPY FROM', () => {
	const node = new PostgresCopy();

	const mockClient = {
		connect: jest.fn(),
		end: jest.fn(),
		query: jest.fn(),
	};

	const sampleCsv = 'id,name\n1,Alice\n';
	const setupQueryMock = (target: PassThrough, tableExists = true) => {
		mockClient.query.mockImplementation((sql: any) => {
			if (typeof sql === 'string') {
				if (sql.includes('to_regclass')) {
					return Promise.resolve({ rows: tableExists ? [{ regclass: 'test' }] : [] });
				}
				return Promise.resolve();
			}
			return target;
		});
	};

	const makeContext = (item: INodeExecutionData): IExecuteFunctions => {
		const items = [item];
		return {
			getInputData: () => items,
			getNodeParameter: (name: string) => {
				const map: any = {
					operation: 'copyFrom',
					tableName: 'test',
					inputBinaryField: 'data',
					inputFormat: 'csv',
					hasHeader: true,
					columnMapping: {},
					inputOptions: {},
					inputCustomDelimiter: '|',
				};
				return map[name];
			},
			getCredentials: async () => ({} as any),
			prepareOutputData: (data: any) => data,
			helpers: {
				prepareBinaryData: async () => ({}),
			},
			getNode: () => ({ name: 'test' } as any),
			continueOnFail: () => false,
		} as any;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('streams COPY FROM without error', async () => {
		const target = new PassThrough();
		setupQueryMock(target);

		const item: INodeExecutionData = {
			json: {},
			binary: {
				data: {
					data: Buffer.from(sampleCsv).toString('base64'),
					mimeType: 'text/csv',
				},
			},
		};

		const ctx = makeContext(item);

		// Consume the stream data to simulate successful write
		target.on('data', () => {
			// drain data
		});

		const result = await node.executeCopyFrom.call(ctx as any, mockClient as any, item, 0);
		expect(result.json.success).toBe(true);
	});

	it('should throw error when table does not exist', async () => {
		const target = new PassThrough();
		setupQueryMock(target, false);

		const item: INodeExecutionData = {
			json: {},
			binary: {
				data: {
					data: Buffer.from(sampleCsv).toString('base64'),
					mimeType: 'text/csv',
				},
			},
		};

		const ctx = makeContext(item);
		await expect(node.executeCopyFrom.call(ctx as any, mockClient as any, item, 0)).rejects.toThrow(
			'Table does not exist',
		);
	});

	it('should throw error when stream fails (Bug #1 fix)', async () => {
		const target = new PassThrough();
		setupQueryMock(target);

		const item: INodeExecutionData = {
			json: {},
			binary: {
				data: {
					data: Buffer.from(sampleCsv).toString('base64'),
					mimeType: 'text/csv',
				},
			},
		};

		const ctx = makeContext(item);
		const promise = node.executeCopyFrom.call(ctx as any, mockClient as any, item, 0);

		// Simulate stream error (like data format mismatch)
		process.nextTick(() => {
			target.destroy(new Error('invalid input syntax for type integer'));
		});

		await expect(promise).rejects.toThrow();
	});

	it('should propagate pipeline errors properly (Bug #1 fix)', async () => {
		const target = new PassThrough();
		setupQueryMock(target);

		const invalidCsv = 'id,name\ninvalid,data\n';
		const item: INodeExecutionData = {
			json: {},
			binary: {
				data: {
					data: Buffer.from(invalidCsv).toString('base64'),
					mimeType: 'text/csv',
				},
			},
		};

		const ctx = makeContext(item);
		const promise = node.executeCopyFrom.call(ctx as any, mockClient as any, item, 0);

		// Simulate error during copy process
		process.nextTick(() => {
			target.emit('error', new Error('COPY failed'));
		});

		await expect(promise).rejects.toThrow('COPY failed');
	});
});
