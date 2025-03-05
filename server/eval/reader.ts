import * as zip from "@zip.js/zip.js";

import { Reader } from "../core/reader.ts";

export class ZipReader {
	private readonly entries: zip.Entry[];
	readonly close: () => Promise<void>;
	private readonly cache: Map<string, string>;

	constructor(entries: zip.Entry[], close: () => Promise<void>) {
		this.entries = entries;
		this.close = close;
		this.cache = new Map();
	}

	static async from(data: Uint8Array): Promise<ZipReader> {
		const dataReader = new zip.Uint8ArrayReader(data);
		const zipReader = new zip.ZipReader(dataReader);
		const zipEntries = await zipReader.getEntries();
		return new ZipReader(zipEntries, zipReader.close);
	}

	async eval<T>(reader: Reader<T>): Promise<T> {
		const op = reader.op;
		switch (op.type) {
			case "Read": {
				const document = await this.read(op.name);
				const next = op.next(document);
				return this.eval(next);
			}
			case "Value":
				return op.value;
			case "NotFound":
				throw `Not found`;
			default: {
				const _: never = op;
				return _ as T;
			}
		}
	}

	private async read(filename: string): Promise<string> {
		const cached = this.cache.get(filename);
		if (cached !== undefined) {
			return cached;
		}

		const entry = this.entries.find((entry) => entry.filename === filename);
		if (entry === undefined) {
			throw `Entry "${filename}" not found`;
		}

		const document = await entry.getData?.(new zip.TextWriter());
		if (document === undefined) {
			throw `Entry "${filename}" cannot be read`;
		}

		this.cache.set(filename, document);

		return document;
	}
}
