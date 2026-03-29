import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Custom TipTap extension for inline images in emails.
 *
 * Handles:
 * - Images with cid: references (for Gmail compatibility)
 * - Drag-drop and paste of new images
 * - Integration with attachment system
 */
export const InlineImage = Node.create({
  name: "inlineImage",

  group: "block",

  inline: false,

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            src: attributes.src,
            "data-content-id": attributes.contentId || attributes["data-content-id"] || "",
            "data-filename": attributes.filename || "",
            class: "my-4 block max-w-full h-auto rounded-lg",
          };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt"),
      },
      filename: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-filename"),
      },
      contentId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-content-id") ||
          element.getAttribute("src")?.match(/^cid:(.+)$/i)?.[1] ||
          null,
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src^="cid:"]',
        getAttrs: (node) => {
          const img = node as HTMLImageElement;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            filename: img.getAttribute("data-filename"),
            contentId:
              img.getAttribute("data-content-id") ||
              img.getAttribute("src")?.match(/^cid:(.+)$/i)?.[1] ||
              null,
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (node) => {
          const img = node as HTMLImageElement;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            filename: img.getAttribute("data-filename"),
            contentId:
              img.getAttribute("data-content-id") ||
              img.getAttribute("src")?.match(/^cid:(.+)$/i)?.[1] ||
              null,
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs: Record<string, string | number | undefined> = {
      src: node.attrs.src,
      alt: node.attrs.alt,
      "data-content-id": node.attrs.contentId,
      "data-filename": node.attrs.filename,
      class: "my-4 block max-w-full h-auto rounded-lg",
    };

    if (node.attrs.width) {
      attrs.width = node.attrs.width;
    }
    if (node.attrs.height) {
      attrs.height = node.attrs.height;
    }

    return ["img", mergeAttributes(attrs)];
  },
});
