"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  ImagePlus,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Unlink,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onInsertImage?: () => void;
}

export function EditorToolbar({
  editor,
  disabled = false,
  onInsertImage,
}: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b border-border/70 bg-gradient-to-r from-background via-background to-muted/30 px-3 py-2.5 backdrop-blur-sm">
      {/* Text Formatting */}
      <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Bold"
          disabled={disabled}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Italic"
          disabled={disabled}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Underline"
          disabled={disabled}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6 bg-border/70" />

      {/* Lists */}
      <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Bullet List"
          disabled={disabled}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Numbered List"
          disabled={disabled}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6 bg-border/70" />

      {/* Alignment */}
      <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Align Left"
          disabled={disabled}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Align Center"
          disabled={disabled}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"}
          title="Align Right"
          disabled={disabled}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6 bg-border/70" />

      {/* Links */}
      <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm">
        {editor.isActive("link") ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
            disabled={disabled}
          >
            <Unlink className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const url = window.prompt("Enter URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Add Link"
            disabled={disabled}
          >
            <Link className="h-4 w-4" />
          </Button>
        )}
      </div>

      {onInsertImage ? (
        <>
          <Separator orientation="vertical" className="mx-2 h-6 bg-border/70" />
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onInsertImage}
              title="Insert Image"
              disabled={disabled}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
