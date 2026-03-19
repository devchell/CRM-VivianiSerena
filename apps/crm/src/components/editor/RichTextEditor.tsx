'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-rose-gold underline' } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] px-3 py-2 text-sm text-charcoal dark:text-charcoal-100 focus:outline-none',
      },
    },
  })

  if (!editor) return null

  const toolbarBtn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-rose-gold/10 text-rose-gold' : 'text-charcoal-400 hover:text-charcoal dark:hover:text-charcoal-100 hover:bg-blush dark:hover:bg-charcoal-700'}`}
    >
      {icon}
    </button>
  )

  return (
    <div className="border border-blush-300 dark:border-charcoal-600 rounded-lg overflow-hidden bg-white dark:bg-charcoal-700">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-blush-200 dark:border-charcoal-600 bg-cream dark:bg-charcoal-800">
        {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Negrito', <Bold size={14} />)}
        {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Itálico', <Italic size={14} />)}
        <div className="w-px h-4 bg-blush-300 dark:bg-charcoal-600 mx-1" />
        {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Lista', <List size={14} />)}
        {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Lista numerada', <ListOrdered size={14} />)}
        <div className="w-px h-4 bg-blush-300 dark:bg-charcoal-600 mx-1" />
        {toolbarBtn(editor.isActive('link'), () => {
          if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
          const url = window.prompt('URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }, 'Link', <Link2 size={14} />)}
      </div>
      <EditorContent editor={editor} />
      {!editor.getText() && placeholder && (
        <div className="absolute top-12 left-3 text-charcoal-400 dark:text-charcoal-500 text-sm pointer-events-none">{placeholder}</div>
      )}
    </div>
  )
}
