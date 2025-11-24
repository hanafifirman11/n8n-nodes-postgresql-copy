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
		mockClient.query.mockImplementation((sql: any) => {
			if (typeof sql === 'string') return Promise.resolve();
			return target;
		});

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
		// simulate consumption
		process.nextTick(() => {
			target.end();
		});
		const result = await promise;
		expect(result.json.success).toBe(true);
	});
});
