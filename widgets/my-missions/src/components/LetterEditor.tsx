import * as React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Redo2,
  Undo2,
} from 'lucide-react';

/**
 * Rich-text editing for a participant's support letter.
 *
 * Replaces the legacy widget's `jodit-react`, which shipped a second editor
 * framework plus 5,345 lines of its own CSS injected into the shadow root.
 * Tiptap sits on ProseMirror, whose `EditorView` resolves selections against
 * `dom.getRootNode()` rather than the global `document` — the reason a
 * `document.execCommand` toolbar or an editor that reaches for
 * `document.getSelection()` misbehaves inside a shadow root.
 */

/** The letter is prose, not source code: no code, rules, or quote blocks. */
const EXTENSIONS = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    horizontalRule: false,
    blockquote: false,
    heading: { levels: [2, 3] },
    // Inside an editor a click should place the caret, not navigate away.
    link: { openOnClick: false },
  }),
];

const TOOLBAR_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-sm text-fg transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-accent aria-pressed:text-accent-fg';

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The editor loses its DOM selection on blur, and mousedown blurs it
      // before click fires — so the command would apply to nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={TOOLBAR_BUTTON}
    >
      {children}
    </button>
  );
}

/** Inline URL field, opened by the link button. */
function LinkField({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}): React.JSX.Element {
  const [href, setHref] = React.useState(
    () => (editor.getAttributes('link').href as string | undefined) ?? '',
  );

  const apply = (): void => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (url === '') chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
    onClose();
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-2 py-2">
      <label className="sr-only" htmlFor="my-missions-link-url">
        Link URL
      </label>
      <input
        id="my-missions-link-url"
        type="url"
        value={href}
        autoFocus
        placeholder="https://example.com"
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            apply();
          }
          if (event.key === 'Escape') onClose();
        }}
        className="h-8 flex-1 rounded-sm border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={apply}
        className="h-8 rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-8 rounded-sm px-2 text-sm text-muted-fg hover:bg-muted"
      >
        Cancel
      </button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const [linkOpen, setLinkOpen] = React.useState(false);
  // The toolbar's pressed/disabled states are derived from editor state, which
  // React knows nothing about — re-render on every transaction.
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    editor.on('transaction', forceRender);
    return () => {
      editor.off('transaction', forceRender);
    };
  }, [editor]);

  return (
    <>
      <div
        role="toolbar"
        aria-label="Letter formatting"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1"
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon aria-hidden className="size-4" />
        </ToolbarButton>

        <span aria-hidden className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onClick={() => setLinkOpen((open) => !open)}
        >
          <Link2 aria-hidden className="size-4" />
        </ToolbarButton>

        <span aria-hidden className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 aria-hidden className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 aria-hidden className="size-4" />
        </ToolbarButton>
      </div>
      {linkOpen && <LinkField editor={editor} onClose={() => setLinkOpen(false)} />}
    </>
  );
}

export interface LetterEditorProps {
  /** The letter as HTML. */
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

export function LetterEditor({
  value,
  onChange,
  disabled = false,
}: LetterEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !disabled,
    // The widget mounts into a shadow root on a live page, never server-rendered.
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class:
          'min-h-48 px-3 py-2 text-fg focus:outline-hidden [&_a]:text-primary [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5',
        'aria-label': 'Support letter',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Adopt a letter that changed underneath us — a refetch after a successful
  // save, or a different trip reusing this component. Guarded on the rendered
  // HTML so re-emitting our own `onUpdate` value doesn't reset the caret.
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return <div className="h-56 rounded-md border border-border bg-muted/30" />;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg focus-within:ring-2 focus-within:ring-ring">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
