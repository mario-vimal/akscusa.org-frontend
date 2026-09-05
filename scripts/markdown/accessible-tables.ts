import type { Element, Properties, Root, RootContent } from "hast";
import type { HastPluginDefinition } from "satteri";

import { measurePublicImage } from "~/lib/public-image";

const text = (node: RootContent): string => {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(text).join("");
  return "";
};

const normalizedText = (node: RootContent): string =>
  text(node).replace(/\s+/g, " ").trim();

const dimension = (value: Properties[string]): number | undefined => {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

/**
 * Tables and public images need their structure before scripts or image bytes
 * arrive. Share the HAST walk so imported images keep Astro's own processing
 * and remote images never introduce a network dependency into the build.
 */
export const accessibleTables = (): HastPluginDefinition => ({
  name: "accessible-tables",
  async before(tree, context) {
    let tableNumber = 0;
    const measurements: Promise<void>[] = [];

    const walk = (parent: Readonly<Root | Element>, section?: string): void => {
      let heading = section;

      for (const child of parent.children) {
        if (child.type !== "element") continue;

        if (child.tagName === "img") {
          const {
            src,
            width: authoredWidth,
            height: authoredHeight,
          } = child.properties;
          const width = dimension(authoredWidth);
          const height = dimension(authoredHeight);

          if (
            typeof src === "string" &&
            src.startsWith("/") &&
            !src.startsWith("//") &&
            (!width || !height) &&
            (authoredWidth === undefined || width !== undefined) &&
            (authoredHeight === undefined || height !== undefined)
          ) {
            measurements.push(
              measurePublicImage(src).then((size) => {
                if (!width) {
                  context.setProperty(
                    child,
                    "width",
                    height
                      ? Math.max(
                          1,
                          Math.round((height * size.width) / size.height),
                        )
                      : size.width,
                  );
                }
                if (!height) {
                  context.setProperty(
                    child,
                    "height",
                    width
                      ? Math.max(
                          1,
                          Math.round((width * size.height) / size.width),
                        )
                      : size.height,
                  );
                }
              }),
            );
          }
          continue;
        }

        if (/^h[1-6]$/.test(child.tagName)) {
          heading = normalizedText(child) || heading;
        }

        if (child.tagName !== "table") {
          walk(child, heading);
          continue;
        }

        const classes =
          parent.type === "element" ? parent.properties.className : undefined;
        if (Array.isArray(classes) && classes.includes("prose-table-scroll")) {
          walk(child, heading);
          continue;
        }

        tableNumber += 1;
        const caption = child.children.find(
          (node) => node.type === "element" && node.tagName === "caption",
        );
        const label =
          (caption && normalizedText(caption)) ||
          heading ||
          `Table ${tableNumber}`;

        context.wrapNode(child, {
          type: "element",
          tagName: "div",
          properties: {
            className: ["prose-table-scroll"],
            role: "region",
            ariaLabel: `${label} (scroll horizontally)`,
            tabIndex: 0,
          },
          children: [],
        });
        walk(child, heading);
      }
    };

    walk(tree);
    await Promise.all(measurements);
  },
});
