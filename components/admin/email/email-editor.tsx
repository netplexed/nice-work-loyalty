'use client'

import React, { useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, ListOrdered, Image as ImageIcon, Heading1, Heading2, Quote, Undo, Redo, Type, Hash } from 'lucide-react'
import { uploadCampaignImage } from '@/lib/storage/upload'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Extension } from '@tiptap/core'

const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {}
                            }

                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontSize: (fontSize) => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
})

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType
            unsetFontSize: () => ReturnType
        }
    }
}

interface EmailEditorProps {
    content: string
    onChange: (html: string) => void
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null
    }

    const addImage = useCallback(() => {
        const url = window.prompt('URL')

        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }, [editor])

    const setFont = (font: string) => {
        editor.chain().focus().setFontFamily(font).run()
    }

    const setSize = (size: string) => {
        editor.chain().focus().setFontSize(size).run()
    }

    return (
        <div className="border-b bg-slate-50 p-2 flex flex-wrap gap-1 sticky top-0 z-10">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 w-24 justify-between">
                        <Type className="h-4 w-4" />
                        <span className="text-xs truncate">
                            {editor.getAttributes('textStyle').fontFamily || 'Font'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>
                        Default (Sans)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Inter, sans-serif')} className="font-sans">
                        Inter (Sans)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('serif')} className="font-serif">
                        Serif
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('monospace')} className="font-mono">
                        Monospace
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('cursive')} className="italic">
                        Cursive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Arial, sans-serif')} className="font-sans">
                        Arial
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Georgia, serif')} className="font-serif">
                        Georgia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Times New Roman, serif')} className="font-serif">
                        Times New Roman
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Verdana, sans-serif')} className="font-sans">
                        Verdana
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFont('Helvetica, sans-serif')} className="font-sans">
                        Helvetica
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 w-16 justify-between">
                        <Hash className="h-4 w-4" />
                        <span className="text-xs truncate">
                            {editor.getAttributes('textStyle').fontSize?.replace('px', '') || 'Size'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
                        Default
                    </DropdownMenuItem>
                    {[12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72].map(size => (
                        <DropdownMenuItem key={size} onClick={() => setSize(`${size}px`)}>
                            {size}px
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
                variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <Button
                variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading1 className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <Heading2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <Button
                variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={addImage}
            >
                <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <Quote className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Undo className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Redo className="w-4 h-4" />
            </Button>
        </div>
    )
}

export function EmailEditor({ content, onChange }: EmailEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            TextStyle,
            FontSize,
            FontFamily,
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: 'Write something amazing...',
            })
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        // Upload image
                        uploadCampaignImage(file).then(url => {
                            if (url) {
                                const { schema } = view.state;
                                const node = schema.nodes.image.create({ src: url });
                                const transaction = view.state.tr.replaceSelectionWith(node);
                                view.dispatch(transaction);
                            } else {
                                toast.error('Failed to upload image')
                            }
                        })
                        return true; // handled
                    }
                }
                return false;
            }
        },
    })

    return (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col min-h-[500px]">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1 overflow-y-auto cursor-text bg-white" />
        </div>
    )
}
