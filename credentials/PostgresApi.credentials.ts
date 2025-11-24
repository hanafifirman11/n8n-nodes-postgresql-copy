import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PostgresApi implements ICredentialType {
	name = 'postgres';
	displayName = 'Postgres';
	documentationUrl = 'postgres';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 5432,
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Allow Exit On Idle',
			name: 'allowExitOnIdle',
			type: 'boolean',
			default: false,
			description: 'Allow client to exit when idle',
		},
	];
}
