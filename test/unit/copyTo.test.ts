import { PostgresCopy } from '../../nodes/PostgresCopy/PostgresCopy.node';
import type { IExecuteFunctions } from 'n8n-workflow';
import { PassThrough } from 'stream';

describe('PostgresCopy - COPY TO', () => {
	const node = new PostgresCopy();

	const mockClient = {
		connect: jest.fn(),
		end: jest.fn(),
		query: jest.fn(),
	};

	const makeContext = (binary = false): IExecuteFunctions => {
		const items = [{} as any];
		return {
			getInputData: () => items,
			getNodeParameter: (name: string) => {
				const map: any = {
					operation: 'copyTo',
					query: 'SELECT 1',
					outputFormat: 'csv',
					includeHeader: true,
					fileName: 'export.csv',
					binaryPropertyName: 'data',
					options: {},
				};
				return map[name];
			},
			getCredentials: async () => ({} as any),
			prepareOutputData: (data: any) => data,
			helpers: {
				prepareBinaryData: async (buf: Buffer, name: string, mime?: string) => ({
					data: buf.toString('base64'),
					fileName: name,
					mimeType: mime,
					fileSize: buf.length,
				}),
			},
			getNode: () => ({ name: 'test' } as any),
			continueOnFail: () => false,
		} as any;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('builds COPY TO and returns binary', async () => {
		const stream = new PassThrough();
		stream.write('col\n1\n');
		stream.end();
		mockClient.query.mockReturnValue(stream);

		const ctx = makeContext();
		const result = await node.executeCopyTo.call(ctx as any, mockClient as any, 0);
		expect(result.json.rowCount).toBe(1);
		expect(result.binary?.data).toBeTruthy();
	});
});
