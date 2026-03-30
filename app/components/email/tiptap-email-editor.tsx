"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { LoaderCircle, Lock, TriangleAlert } from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { FieldPlaceholder } from "./tiptap-extensions/field-placeholder";
import { InlineImage } from "./tiptap-extensions/inline-image";
import { EditorToolbar } from "./editor-toolbar";
import { PlaceholderMenu } from "./placeholder-menu";
import {
  generateContentId,
  getInlineImageDisplayDimensions,
  prepareInlineImageAttachment,
} from "@/core/email/attachment-utils";
import {
  buildInlineImagePreviewSource,
  normalizeHtmlForComparison,
  prepareEmailEditorContent,
  serializeEmailEditorHtml,
} from "@/core/email/editor-content";
import type { Attachment } from "@/types/gmail";

interface TipTapEmailEditorProps {
  content: string; // HTML content
  editorJson?: string; // TipTap JSON (optional)
  onChange: (html: string, json?: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  availablePlaceholders: string[];
  onInsertPlaceholder: (placeholder: string) => void;
  onUploadImage: (file: File) => Promise<void>;
  className?: string;
  disabled?: boolean;
  id?: string; // For accessibility and label association
  forceUpdate?: number; // Increment to force content refresh
  loadingState?: {
    title: string;
    detail?: string;
  };
}

export function TipTapEmailEditor({
  content,
  editorJson,
  onChange,
  attachments,
  onAttachmentsChange,
  availablePlaceholders,
  onInsertPlaceholder,
  onUploadImage,
  className = "",
  disabled = false,
  id,
  forceUpdate,
  loadingState,
}: TipTapEmailEditorProps) {
  void onUploadImage;

  // Track if update is from parent (to avoid loops)
  const isUpdatingFromParent = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const lastSelectionPositionRef = useRef<number | null>(null);

  // Track forceUpdate to detect when parent wants to force a refresh
  const [internalForceUpdate, setInternalForceUpdate] = useState(0);
  const [imageUploadNotice, setImageUploadNotice] = useState<string | undefined>();
  const [imageUploadError, setImageUploadError] = useState<string | undefined>();
  const busyDescriptionId = useId();
  const normalizationKeyRef = useRef<string | null>(null);
  const preparedContent = useMemo(
    () =>
      prepareEmailEditorContent({
        content,
        editorJson,
        attachments,
      }),
    [attachments, content, editorJson],
  );

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatches in Next.js
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline",
          },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      FieldPlaceholder,
      InlineImage,
    ],
    content: preparedContent.displayContent,
    onUpdate: ({ editor }) => {
      // Skip onChange if we're updating from parent
      if (isUpdatingFromParent.current) {
        isUpdatingFromParent.current = false;
        return;
      }

      const html = serializeEmailEditorHtml(editor.getHTML());
      const json = JSON.stringify(editor.getJSON());
      onChange(html, json);
    },
    onSelectionUpdate: ({ editor }) => {
      lastSelectionPositionRef.current = editor.state.selection.from;
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id && { "aria-label": id }),
        class:
          "email-editor__content prose prose-sm max-w-none min-h-[220px] px-5 py-4 focus:outline-none",
      },
      handleDrop: (view, event: DragEvent) => {
        if (disabled) {
          return true;
        }
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));

        if (imageFiles.length === 0) {
          return false;
        }

        event.preventDefault();
        const dropPosition = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;

        imageFiles.forEach((file) => {
          void handleImageUpload(file, dropPosition);
        });

        return true;
      },
      handlePaste: (view, event: ClipboardEvent) => {
        if (disabled) {
          return true;
        }

        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((item) => item.type.startsWith("image/"));

        if (imageItems.length > 0) {
          event.preventDefault();
          imageItems.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              void handleImageUpload(file, view.state.selection.from);
            }
          });
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled, false);
  }, [disabled, editor]);

  // Sync editor content when props change (for regeneration, etc.)
  useEffect(() => {
    if (!editor || isUpdatingFromParent.current) return;

    // When forceUpdate changes, always refresh content
    if (forceUpdate !== undefined && forceUpdate !== internalForceUpdate) {
      isUpdatingFromParent.current = true;
      editor.commands.setContent(preparedContent.displayContent);
      setInternalForceUpdate(forceUpdate);
      return;
    }

    const currentValue =
      preparedContent.comparisonMode === "json"
        ? JSON.stringify(editor.getJSON())
        : normalizeHtmlForComparison(editor.getHTML());
    const contentChanged = currentValue !== preparedContent.comparisonValue;

    if (contentChanged) {
      isUpdatingFromParent.current = true;
      editor.commands.setContent(preparedContent.displayContent);
    }
  }, [editor, forceUpdate, internalForceUpdate, preparedContent]);

  useEffect(() => {
    if (!editor || !preparedContent.shouldPersistNormalization) {
      return;
    }

    const normalizationKey = `${content}::${editorJson ?? ""}`;

    if (normalizationKeyRef.current === normalizationKey) {
      return;
    }

    normalizationKeyRef.current = normalizationKey;

    const normalizedHtml = serializeEmailEditorHtml(editor.getHTML());
    const normalizedJson = JSON.stringify(editor.getJSON());

    if (normalizedHtml !== content || normalizedJson !== editorJson) {
      onChange(normalizedHtml, normalizedJson);
    }
  }, [content, editor, editorJson, onChange, preparedContent.shouldPersistNormalization]);

  const insertImageNode = async (
    attachment: Attachment,
    targetPosition?: number,
  ) => {
    if (!editor) {
      return;
    }

    const previewSource =
      buildInlineImagePreviewSource(attachment) ?? `cid:${attachment.contentId}`;
    const insertPosition =
      targetPosition ?? lastSelectionPositionRef.current ?? editor.state.selection.from;

    const didInsert = editor
      .chain()
      .focus(insertPosition)
      .insertContentAt(insertPosition, {
        type: "inlineImage",
        attrs: {
          src: previewSource,
          alt: attachment.filename,
          filename: attachment.filename,
          contentId: attachment.contentId,
          ...getInlineImageDisplayDimensions(attachment),
        },
      })
      .run();

    if (didInsert) {
      lastSelectionPositionRef.current = insertPosition + 1;
    }
  };

  // Handle file upload (shared by drop, paste, and picker)
  const handleImageUpload = async (file: File, targetPosition?: number) => {
    if (disabled) {
      return;
    }

    setImageUploadError(undefined);

    try {
      const { attachment, warning } = await prepareInlineImageAttachment(file);
      attachment.isInline = true;
      attachment.contentId = await generateContentId(attachment.filename);

      setImageUploadNotice(warning);

      // Add to attachments
      const updatedAttachments = [...attachments, attachment];
      onAttachmentsChange(updatedAttachments);

      await insertImageNode(attachment, targetPosition);
    } catch (caughtError) {
      setImageUploadError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to process image "${file.name}".`,
      );
    }
  };

  // Handle placeholder insertion
  const handleInsertPlaceholder = (placeholder: string) => {
    if (!editor || disabled) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "fieldPlaceholder",
        attrs: { fieldName: placeholder },
      })
      .run();

    onInsertPlaceholder(placeholder);
  };

  if (!editor) {
    return (
      <div
        className={`border rounded-lg p-4 flex items-center justify-center ${className}`}
      >
        <div className="animate-pulse text-muted-foreground">
          Loading editor...
        </div>
        
      </div>
    );
  }

  return (
    <div
      className={`email-editor group relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-gradient-to-br from-white/95 via-white/92 to-muted/35 shadow-[0_20px_55px_-28px_rgba(67,43,18,0.35)] transition-all ${disabled ? "ring-1 ring-border/80" : "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10"} ${className}`}
      aria-busy={Boolean(loadingState)}
      aria-describedby={loadingState ? busyDescriptionId : undefined}
      data-readonly={disabled ? "true" : "false"}
    >
      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files || []);

          files.forEach((file) => {
            void handleImageUpload(file, lastSelectionPositionRef.current ?? editor.state.selection.from);
          });

          event.currentTarget.value = "";
        }}
      />
      <EditorToolbar
        editor={editor}
        disabled={disabled}
        onInsertImage={() => {
          lastSelectionPositionRef.current = editor.state.selection.from;
          imageInputRef.current?.click();
        }}
      />
      <PlaceholderMenu
        placeholders={availablePlaceholders}
        onInsert={handleInsertPlaceholder}
        disabled={disabled}
      />
      {imageUploadNotice ? (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{imageUploadNotice}</span>
        </div>
      ) : null}
      {imageUploadError ? (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{imageUploadError}</span>
        </div>
      ) : null}
      <div className={`relative bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(249,245,238,0.92))] ${disabled ? "pointer-events-none select-none" : ""}`}>
        <EditorContent editor={editor} />
        {loadingState ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[linear-gradient(135deg,rgba(255,251,246,0.78),rgba(247,241,231,0.9))] backdrop-blur-[2px]">
            <div
              id={busyDescriptionId}
              className="mx-5 flex max-w-sm items-start gap-3 rounded-2xl border border-border/80 bg-white/92 px-4 py-3 shadow-lg"
            >
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                <LoaderCircle className="h-4 w-4 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {loadingState.title}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {loadingState.detail ?? "The current text is locked until the regenerated draft is ready."}
                </p>
              </div>
            </div>
          </div>
        ) : disabled ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-sm">
            <Lock className="h-3 w-3" />
            Read only
          </div>
        ) : null}
      </div>
    </div>
  );
}
