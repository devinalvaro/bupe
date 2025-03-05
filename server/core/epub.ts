import * as xml from "@libs/xml";
import * as path from "@std/path";

import { Reader } from "./reader.ts";

export interface Container {
	container: {
		rootfiles: {
			rootfile: {
				"@full-path": string;
			};
		};
	};
}

export interface Rootfile {
	package: {
		metadata: {
			"dc:title": Text;
			"dc:creator": Text | Text[];
		};
		manifest: {
			item: Item[];
		};
	};
}

export interface Item {
	"@href": string;
	"@media-type": string;
}

export interface Toc {
	ncx: {
		navMap: {
			navPoint: NavPoint[];
		};
	};
}

export interface NavPoint {
	"@class": string;
	"@id": string;
	"@playOrder": number;
	navLabel: {
		text: Text;
	};
	content: {
		"@src": string;
	};
}

export interface Text {
	"#text": string;
}

export const container: Reader<Container> = Reader.read("META-INF/container.xml", (container) =>
	Reader.value(parse(container)),
);

export const rootfile: Reader<Rootfile> = container.andThen((container) => {
	const rootfilePath = getRootfilePath(container);
	return Reader.read(rootfilePath, (rootfile) => Reader.value(parse(rootfile)));
});

function getRootfilePath(container: Container): string {
	return container.container.rootfiles.rootfile["@full-path"];
}

export const toc: Reader<Toc> = container.andThen((container) =>
	rootfile.andThen((rootfile) => {
		const items = rootfile.package.manifest.item;
		const tocItem = items.find((item) => item["@media-type"] == "application/x-dtbncx+xml");
		if (tocItem === undefined) {
			return Reader.notFound();
		}

		const rootfileDir = path.dirname(getRootfilePath(container));
		const tocPath = path.join(rootfileDir, tocItem["@href"]);
		return Reader.read(tocPath, (toc) => Reader.value(parse(toc)));
	}),
);

export function getContent(src: string): Reader<string> {
	return container.andThen((container) => {
		const rootfileDir = path.dirname(getRootfilePath(container));
		const contentPath = path.join(rootfileDir, src);
		return Reader.read(contentPath, (document) => Reader.value(document));
	});
}

function parse<T>(data: string): T {
	return xml.parse(data, {
		flatten: { text: false },
		revive: { numbers: true },
	}) as unknown as T;
}
