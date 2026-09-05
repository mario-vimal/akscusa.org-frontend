import { defaultTreeAdapter, parse, type DefaultTreeAdapterMap } from "parse5";

export interface Reference {
  page: string;
  tag: string;
  attribute: string;
  url: string;
  line?: number;
  column?: number;
}

export interface HtmlPage {
  anchors: Set<string>;
  references: Reference[];
  canonicals: Reference[];
  base?: Reference;
  provenance: number;
}

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Template = DefaultTreeAdapterMap["template"];

function isTemplate(node: Element): node is Template {
  return node.tagName === "template" && "content" in node;
}

function* elements(
  node: Node,
  inert = false,
): Generator<{ element: Element; inert: boolean }> {
  if (defaultTreeAdapter.isElementNode(node)) {
    yield { element: node, inert };
    if (isTemplate(node)) {
      yield* elements(defaultTreeAdapter.getTemplateContent(node), true);
    }
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) yield* elements(child, inert);
  }
}

const whitespace = /[\t\n\f\r ]/;

export function srcsetUrls(value: string): string[] {
  const urls: string[] = [];
  let position = 0;

  // The HTML candidate algorithm collects URLs before descriptors. Splitting
  // on commas would turn a data URL into a spurious local-file reference.
  while (position < value.length) {
    while (
      position < value.length &&
      (whitespace.test(value[position]!) || value[position] === ",")
    ) {
      position++;
    }
    const start = position;
    while (position < value.length && !whitespace.test(value[position]!)) {
      position++;
    }
    const url = value.slice(start, position);
    if (!url) break;
    urls.push(url.replace(/,+$/, ""));
    if (url.endsWith(",")) continue;

    let parentheses = 0;
    while (position < value.length) {
      const character = value[position++];
      if (character === "(") parentheses++;
      if (character === ")") parentheses = Math.max(0, parentheses - 1);
      if (character === "," && parentheses === 0) break;
    }
  }
  return urls;
}

function reference(
  element: Element,
  page: string,
  attribute: string,
  url: string,
): Reference {
  const location =
    element.sourceCodeLocation?.attrs?.[attribute] ??
    element.sourceCodeLocation;
  return {
    page,
    tag: element.tagName,
    attribute,
    url,
    line: location?.startLine,
    column: location?.startCol,
  };
}

export function readHtml(source: string, page: string): HtmlPage {
  const result: HtmlPage = {
    anchors: new Set(),
    references: [],
    canonicals: [],
    provenance: 0,
  };
  const document = parse(source, {
    sourceCodeLocationInfo: true,
    scriptingEnabled: false,
  });

  for (const { element, inert } of elements(document)) {
    const attributes = new Map(
      element.attrs.map((attribute) => [attribute.name, attribute.value]),
    );
    if (!inert) {
      const id = attributes.get("id");
      const name = element.tagName === "a" ? attributes.get("name") : undefined;
      if (id) result.anchors.add(id);
      if (name) result.anchors.add(name);
    }

    for (const attribute of element.attrs) {
      if (!["href", "src", "srcset"].includes(attribute.name)) continue;
      if (
        element.tagName === "a" &&
        attribute.name === "href" &&
        attributes.has("data-provenance")
      ) {
        // Provenance describes attribution; it never excuses a retiring URL.
        result.provenance++;
      }
      const name = attribute.prefix
        ? `${attribute.prefix}:${attribute.name}`
        : attribute.name;
      const urls =
        attribute.name === "srcset"
          ? srcsetUrls(attribute.value)
          : [attribute.value];

      for (const url of urls) {
        const ref = reference(element, page, name, url);
        result.references.push(ref);
        if (inert || name !== "href") continue;
        if (element.tagName === "base" && !result.base) result.base = ref;
        if (
          element.tagName === "link" &&
          attributes
            .get("rel")
            ?.toLowerCase()
            .split(/\s+/)
            .includes("canonical")
        ) {
          result.canonicals.push(ref);
        }
      }
    }
  }
  return result;
}

function text(node: Node): string {
  if (defaultTreeAdapter.isTextNode(node)) return node.value;
  return "childNodes" in node ? node.childNodes.map(text).join("") : "";
}

export function sitemapLocations(source: string, page: string): Reference[] {
  return [...elements(parse(source, { sourceCodeLocationInfo: true }))]
    .filter(({ element }) => element.tagName === "loc")
    .map(({ element }) =>
      reference(element, page, "loc", text(element).trim()),
    );
}
