declare module 'pg-copy-streams' {
	import { Readable, Writable } from 'stream';

	export function from(txt: string): Writable;
	export function to(txt: string): Readable;
}
