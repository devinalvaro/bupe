import * as xml from "@libs/xml";
import { xml_document as XmlDocument, xml_node as XmlNode } from "@libs/xml";
import * as path from "@std/path";
import * as zip from "@zip.js/zip.js";
import { Effect, Option, pipe } from "effect";
import { NoSuchElementException } from "effect/Cause";

export interface Epub {
  container: Effect.Effect<Container, NoSuchElementException, never>;
  rootfile: Effect.Effect<Rootfile, NoSuchElementException, never>;
  toc: Effect.Effect<Toc, NoSuchElementException, never>;
  getContent: (src: string) => Effect.Effect<Content, NoSuchElementException>;
}

export function createEpub(entries: zip.Entry[]): Epub {
  const container = getContainer(entries);

  const rootfile = pipe(
    container,
    Effect.andThen((container) => getRootfile(entries, container)),
  );

  return {
    container,
    rootfile,
    toc: pipe(
      Effect.all([container, rootfile]),
      Effect.andThen(([container, rootfile]) => getToc(entries, container, rootfile)),
    ),
    getContent: (src: string) =>
      pipe(
        container,
        Effect.andThen((container) => getContent(entries, container, src)),
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

export interface Content {
  html: {
    body: XmlNode;
  };
}

export interface Text {
  "#text": string;
}

function getContainer(entries: zip.Entry[]): Effect.Effect<Container, NoSuchElementException> {
  return pipe(
    getEntry(entries, "META-INF/container.xml"),
    Effect.andThen((container) => container as unknown as Container),
  );
}

function getRootfilePath(container: Container): string {
  return container.container.rootfiles.rootfile["@full-path"];
}

function getRootfile(
  entries: zip.Entry[],
  container: Container,
): Effect.Effect<Rootfile, NoSuchElementException> {
  return pipe(
    getEntry(entries, getRootfilePath(container)),
    Effect.andThen((rootfile) => rootfile as unknown as Rootfile),
  );
}

function getToc(
  entries: zip.Entry[],
  container: Container,
  rootfile: Rootfile,
): Effect.Effect<Toc, NoSuchElementException> {
  const items = rootfile.package.manifest.item;
  const rootfileDir = path.dirname(getRootfilePath(container));
  return pipe(
    Option.fromNullable(items.find((item) => item["@media-type"] == "application/x-dtbncx+xml")),
    Option.andThen((tocItem) => tocItem["@href"]),
    Effect.andThen((tocHref) => getEntry(entries, path.join(rootfileDir, tocHref))),
    Effect.andThen((toc) => toc as unknown as Toc),
  );
}

function getContent(
  entries: zip.Entry[],
  container: Container,
  src: string,
): Effect.Effect<Content, NoSuchElementException> {
  const rootfileDir = path.dirname(getRootfilePath(container));
  return pipe(
    getEntry(entries, path.join(rootfileDir, src)),
    Effect.andThen((content) => content as unknown as Content),
  );
}

function getEntry(
  entries: zip.Entry[],
  filename: string,
): Effect.Effect<XmlDocument, NoSuchElementException> {
  return pipe(
    Option.fromNullable(entries.find((entry) => entry.filename === filename)),
    Option.andThen((entry) => Option.fromNullable(entry.getData?.(new zip.TextWriter()))),
    Effect.andThen((data) => Effect.promise(() => data)),
    Effect.andThen((data) =>
      xml.parse(data, {
        flatten: { text: false },
        revive: { numbers: true },
      }),
    ),
  );
}
