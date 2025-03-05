import * as epub from "./epub.ts";
import { Reader } from "./reader.ts";
import { ChapterEntry, ChapterId } from "../../common/book/types.ts";

export const title: Reader<string> = epub.rootfile.map(
	(rootfile) => rootfile.package.metadata["dc:title"]["#text"],
);

export const authors: Reader<string[]> = epub.rootfile.map((rootfile) => {
	const creator = rootfile.package.metadata["dc:creator"];
	if (Array.isArray(creator)) {
		return creator.map(({ "#text": text }) => text);
	} else {
		return [creator["#text"]];
	}
});

export const chapterEntries: Reader<ChapterEntry[]> = epub.toc.map((toc) => {
	const navPoints = toc.ncx.navMap.navPoint
		.slice()
		.sort((navPoint: epub.NavPoint) => navPoint["@playOrder"]);

	return navPoints
		.filter((navPoint) => navPoint["@class"] == "chapter")
		.map((navPoint) => {
			const id = navPoint["@id"] as ChapterId;
			const title = navPoint.navLabel.text["#text"];
			return { id, title };
		});
});

export function getChapter(id: ChapterId): Reader<string> {
	return epub.toc.andThen((toc) => {
		const navPoints = toc.ncx.navMap.navPoint;
		const navPoint = navPoints.find((navPoint) => navPoint["@id"] == id, navPoints);
		if (navPoint === undefined) {
			return Reader.notFound();
		}

		return epub.getContent(navPoint.content["@src"]);
	});
}
