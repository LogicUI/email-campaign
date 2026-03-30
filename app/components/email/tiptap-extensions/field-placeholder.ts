import { Node } from "@tiptap/core";

/**
 * Custom TipTap extension for email template placeholders.
 *
 * Renders {{field_name}} as a dedicated inline node so placeholders are not
 * split across formatting tags during merging.
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
      },
      `{{${node.attrs.fieldName}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.fieldName}}}`;
  },
});
