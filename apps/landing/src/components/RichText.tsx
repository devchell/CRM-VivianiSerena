import type { ReactNode } from 'react'

type RichTextNode =
  | { type: 'text'; value: string }
  | { type: 'element'; tag: string; href?: string; target?: string; children: RichTextNode[] }

const ALLOWED_TAGS = new Set(['a', 'blockquote', 'br', 'em', 'h2', 'h3', 'li', 'ol', 'p', 'strong', 'u', 'ul'])
const VOID_TAGS = new Set(['br'])
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function readAttribute(source: string, name: string): string | undefined {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

function safeHref(value: string | undefined): string | undefined {
  const href = value?.trim()
  if (!href || href.startsWith('//')) return undefined

  try {
    const parsed = new URL(href, 'https://vivianiserena.com')
    return SAFE_PROTOCOLS.has(parsed.protocol) ? href : undefined
  } catch {
    return undefined
  }
}

function appendNode(stack: Array<{ tag?: string; children: RichTextNode[] }>, node: RichTextNode) {
  stack[stack.length - 1].children.push(node)
}

export function parseRichText(value: string): RichTextNode[] {
  const root: RichTextNode[] = []
  const stack: Array<{ tag?: string; children: RichTextNode[] }> = [{ children: root }]

  for (const token of value.split(/(<\/?[a-z][^>]*>)/gi)) {
    if (!token) continue

    const tagMatch = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>/i)
    if (!tagMatch) {
      appendNode(stack, { type: 'text', value: token })
      continue
    }

    const [, closing, rawTag, attributes] = tagMatch
    const tag = rawTag.toLowerCase()

    if (closing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === tag) {
          stack.length = index
          break
        }
      }
      continue
    }

    if (!ALLOWED_TAGS.has(tag)) continue

    const href = tag === 'a' ? safeHref(readAttribute(attributes, 'href')) : undefined
    const node: Extract<RichTextNode, { type: 'element' }> = {
      type: 'element',
      tag,
      ...(tag === 'a' ? {
        ...(href ? { href } : {}),
        ...(readAttribute(attributes, 'target') === '_blank' ? { target: '_blank' } : {}),
      } : {}),
      children: [],
    }
    appendNode(stack, node)

    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) {
      stack.push(node)
    }
  }

  return root
}

function renderNode(node: RichTextNode, key: string): ReactNode {
  if (node.type === 'text') return node.value

  const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`))

  switch (node.tag) {
    case 'a':
      return <a key={key} href={node.href} target={node.target} rel={node.target === '_blank' ? 'noopener noreferrer' : undefined}>{children}</a>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'br':
      return <br key={key} />
    case 'em':
      return <em key={key}>{children}</em>
    case 'h2':
      return <h2 key={key}>{children}</h2>
    case 'h3':
      return <h3 key={key}>{children}</h3>
    case 'li':
      return <li key={key}>{children}</li>
    case 'ol':
      return <ol key={key}>{children}</ol>
    case 'p':
      return <p key={key}>{children}</p>
    case 'strong':
      return <strong key={key}>{children}</strong>
    case 'u':
      return <u key={key}>{children}</u>
    case 'ul':
      return <ul key={key}>{children}</ul>
    default:
      return null
  }
}

export function RichText({ html }: { html: string }) {
  return <>{parseRichText(html).map((node, index) => renderNode(node, String(index)))}</>
}
