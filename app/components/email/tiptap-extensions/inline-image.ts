import { Node, mergeAttributes } from "@tiptap/core";

const MIN_IMAGE_WIDTH = 120;

function parseDimension(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function applyImageNodeAttributes(
  image: HTMLImageElement,
  container: HTMLDivElement,
  attrs: Record<string, unknown>,
) {
  const width = parseDimension(attrs.width);
  const height = parseDimension(attrs.height);

  image.src = String(attrs.src ?? "");
  image.alt = String(attrs.alt ?? attrs.filename ?? "");
  image.dataset.contentId = String(attrs.contentId ?? "");
  image.dataset.filename = String(attrs.filename ?? "");
  image.style.width = width ? `${width}px` : "";
  image.style.height = height ? `${height}px` : "";
  image.style.maxWidth = "100%";
  image.style.objectFit = "contain";

  if (width) {
    image.setAttribute("width", String(width));
  } else {
    image.removeAttribute("width");
  }

  if (height) {
    image.setAttribute("height", String(height));
  } else {
    image.removeAttribute("height");
  }

  container.style.width = width ? `${width}px` : "fit-content";
}

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
    const width = parseDimension(node.attrs.width);
    const height = parseDimension(node.attrs.height);
    const attrs: Record<string, string | number | undefined> = {
      src: node.attrs.src,
      alt: node.attrs.alt,
      "data-content-id": node.attrs.contentId,
      "data-filename": node.attrs.filename,
      class: "my-4 block max-w-full h-auto rounded-lg",
      style: width
        ? `width: ${width}px; max-width: 100%; height: auto;`
        : "max-width: 100%; height: auto;",
    };

    if (width) {
      attrs.width = width;
    }
    if (height) {
      attrs.height = height;
    }

    return ["img", mergeAttributes(attrs)];
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      let currentNode = node;
      let isResizing = false;
      let dragStartX = 0;
      let dragStartWidth = parseDimension(currentNode.attrs.width) || 0;
      const container = document.createElement("div");
      container.className = "email-inline-image-node";
      container.contentEditable = "false";

      const image = document.createElement("img");
      image.className = "email-inline-image-node__image";
      image.draggable = false;

      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "email-inline-image-node__handle";
      handle.setAttribute("aria-label", "Resize image");

      applyImageNodeAttributes(image, container, currentNode.attrs);
      container.append(image, handle);

      const stopResizeListeners = () => {
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);
      };

      const onPointerMove = (event: MouseEvent) => {
        if (!isResizing) {
          return;
        }

        const aspectRatio =
          (parseDimension(currentNode.attrs.width) || image.naturalWidth || 1) /
          (parseDimension(currentNode.attrs.height) || image.naturalHeight || 1);
        const editorWidth = editor.view.dom.clientWidth || 720;
        const nextWidth = Math.max(
          MIN_IMAGE_WIDTH,
          Math.min(
            editorWidth - 48,
            Math.round(dragStartWidth + (event.clientX - dragStartX)),
          ),
        );
        const nextHeight = Math.max(1, Math.round(nextWidth / aspectRatio));

        applyImageNodeAttributes(image, container, {
          ...currentNode.attrs,
          width: nextWidth,
          height: nextHeight,
        });
        container.classList.add("is-resizing");
        handle.style.opacity = "1";
      };

      const onPointerUp = () => {
        if (!isResizing) {
          return;
        }

        isResizing = false;
        container.classList.remove("is-resizing");
        stopResizeListeners();

        const pos = getPos();

        if (typeof pos !== "number") {
          return;
        }

        const width = parseDimension(image.getAttribute("width"));
        const height = parseDimension(image.getAttribute("height"));

        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            width,
            height,
          }),
        );
      };

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const width = parseDimension(currentNode.attrs.width) || image.clientWidth;

        dragStartWidth = width;
        dragStartX = event.clientX;
        isResizing = true;
        window.addEventListener("mousemove", onPointerMove);
        window.addEventListener("mouseup", onPointerUp);
      });

      return {
        dom: container,
        update: (updatedNode: typeof node) => {
          if (updatedNode.type !== currentNode.type) {
            return false;
          }

          currentNode = updatedNode;
          applyImageNodeAttributes(image, container, updatedNode.attrs);
          return true;
        },
        selectNode: () => {
          container.classList.add("ProseMirror-selectednode");
          handle.style.opacity = "1";
        },
        deselectNode: () => {
          container.classList.remove("ProseMirror-selectednode");
          handle.style.opacity = "";
        },
        stopEvent: (event: Event) =>
          isResizing || event.target === handle,
        ignoreMutation: () => true,
        destroy: () => {
          stopResizeListeners();
        },
      };
    };
  },
});
