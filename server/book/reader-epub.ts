import * as xml from "@libs/xml";
import { xml_document as XmlDocument } from "@libs/xml";
import * as path from "@std/path";
import * as zip from "@zip.js/zip.js";
import { pipe } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { Effect, all, andThen, promise } from "effect/Effect";
import { fromNullable } from "effect/Option";

export interface EpubReader {
  container: Effect<Container, NoSuchElementException, never>;
  rootfile: Effect<Rootfile, NoSuchElementException, never>;
  toc: Effect<Toc, NoSuchElementException, never>;
  getContent: (src: string) => Effect<string, NoSuchElementException>;
}

export function createEpubReader(entries: zip.Entry[]): EpubReader {
  const container = getContainer(entries);

  const rootfile = pipe(
    container,
    andThen((container) => getRootfile(entries, container)),
  );

  return {
    container,
    rootfile,
    toc: pipe(
      all([container, rootfile]),
      andThen(([container, rootfile]) => getToc(entries, container, rootfile)),
    ),
    getContent: (src: string) =>
      pipe(
        container,
        andThen((container) => getContent(entries, container)(src)),
      ),
  };
}

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

function getContainer(entries: zip.Entry[]): Effect<Container, NoSuchElementException> {
  return pipe(
    getEntry(entries)("META-INF/container.xml"),
    andThen((container) => container as unknown as Container),
  );
}

function getRootfilePath(container: Container): string {
  return container.container.rootfiles.rootfile["@full-path"];
}

function getRootfile(
  entries: zip.Entry[],
  container: Container,
): Effect<Rootfile, NoSuchElementException> {
  return pipe(
    getEntry(entries)(getRootfilePath(container)),
    andThen((rootfile) => rootfile as unknown as Rootfile),
  );
}

function getToc(
  entries: zip.Entry[],
  container: Container,
  rootfile: Rootfile,
): Effect<Toc, NoSuchElementException> {
  const items = rootfile.package.manifest.item;
  const rootfileDir = path.dirname(getRootfilePath(container));
  return pipe(
    fromNullable(items.find((item) => item["@media-type"] == "application/x-dtbncx+xml")),
    andThen((tocItem) => tocItem["@href"]),
    andThen((tocHref) => getEntry(entries)(path.join(rootfileDir, tocHref))),
    andThen((toc) => toc as unknown as Toc),
  );
}

function getContent(
  entries: zip.Entry[],
  container: Container,
): (src: string) => Effect<string, NoSuchElementException> {
  return (src) => {
    const rootfileDir = path.dirname(getRootfilePath(container));
    const contentPath = path.join(rootfileDir, src);
    return pipe(
      getEntry(entries)(contentPath),
      andThen((xmlDocument) => xml.stringify(xmlDocument)),
    );
  };
}

function getEntry(
  entries: zip.Entry[],
): (filename: string) => Effect<XmlDocument, NoSuchElementException> {
  return (filename) =>
    pipe(
      fromNullable(entries.find((entry) => entry.filename === filename)),
      andThen((entry) => fromNullable(entry.getData?.(new zip.TextWriter()))),
      andThen((data) => promise(() => data)),
      andThen((data) =>
        xml.parse(data, {
          flatten: { text: false },
          revive: { numbers: true },
        }),
      ),
    );
}
