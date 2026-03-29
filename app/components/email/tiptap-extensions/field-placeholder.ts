import { Node } from "@tiptap/core";

/**
 * Custom TipTap extension for email template placeholders.
 *
 * Renders {{field_name}} as a special inline node with visual distinction.
 * This prevents placeholders from being split across formatting tags during merging.
 */
export const FieldPlaceholder = Node.create({
  name: "fieldPlaceholder",

  group: "inline",

  inline: true,

  atom: true,

  addAttributes() {
    return {
      fieldName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-field-name"),
        renderHTML: (attributes) => {
          if (!attributes.fieldName) {
            return {};
          }
          return {
            "data-field-name": attributes.fieldName,
            class:
              "inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono text-sm font-medium select-all",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-field-name]",
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      {
        "data-field-name": node.attrs.fieldName,
        class:
          "inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono text-sm font-medium select-all",
      },
      `{{${node.attrs.fieldName}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.fieldName}}}`;
  },
});
