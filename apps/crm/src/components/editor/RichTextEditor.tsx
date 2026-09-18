'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none',
      },
    },
  })

  if (!editor) return null

  const toolbarBtn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
    >
      {icon}
    </button>
  )

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Negrito', <Bold size={14} />)}
        {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Itálico', <Italic size={14} />)}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
        {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Lista', <List size={14} />)}
        {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Lista numerada', <ListOrdered size={14} />)}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1" />
        {toolbarBtn(editor.isActive('link'), () => {
          if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
          const url = window.prompt('URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }, 'Link', <Link2 size={14} />)}
      </div>
      <EditorContent editor={editor} />
      {!editor.getText() && placeholder && (
        <div className="pointer-events-none absolute left-3 top-[3.15rem] text-sm text-slate-400 dark:text-slate-400">
          {placeholder}
        </div>
      )}
    </div>
  )
}
