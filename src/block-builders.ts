// Builders pour créer facilement TOUS les types de blocs Notion
// Compatible API 2025-09-03 - Version COMPLÈTE pour cours complexes et design

export interface RichText {
  type: 'text';
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export type Color = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'
  | 'gray_background' | 'brown_background' | 'orange_background' | 'yellow_background' 
  | 'green_background' | 'blue_background' | 'purple_background' | 'pink_background' | 'red_background';

export type CodeLanguage = 
  | 'abap' | 'arduino' | 'bash' | 'basic' | 'c' | 'clojure' | 'coffeescript' | 'c++' | 'c#' 
  | 'css' | 'dart' | 'diff' | 'docker' | 'elixir' | 'elm' | 'erlang' | 'flow' | 'fortran' 
  | 'f#' | 'gherkin' | 'glsl' | 'go' | 'graphql' | 'groovy' | 'haskell' | 'html' | 'java' 
  | 'javascript' | 'json' | 'julia' | 'kotlin' | 'latex' | 'less' | 'lisp' | 'livescript' 
  | 'lua' | 'makefile' | 'markdown' | 'markup' | 'matlab' | 'mermaid' | 'nix' | 'objective-c' 
  | 'ocaml' | 'pascal' | 'perl' | 'php' | 'plain text' | 'powershell' | 'prolog' | 'protobuf' 
  | 'python' | 'r' | 'reason' | 'ruby' | 'rust' | 'sass' | 'scala' | 'scheme' | 'scss' 
  | 'shell' | 'sql' | 'swift' | 'typescript' | 'vb.net' | 'verilog' | 'vhdl' | 'visual basic' 
  | 'webassembly' | 'xml' | 'yaml' | 'java/c/c++/c#';

// ==================== HELPERS ====================

// Helper pour créer du rich text simple
export function richText(content: string, options?: {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: Color;
  link?: string;
}): RichText {
  return {
    type: 'text',
    text: {
      content,
      link: options?.link ? { url: options.link } : null
    },
    annotations: {
      bold: options?.bold || false,
      italic: options?.italic || false,
      strikethrough: options?.strikethrough || false,
      underline: options?.underline || false,
      code: options?.code || false,
      color: options?.color || 'default'
    }
  };
}

// Helper pour créer du rich text avec multiples segments (ex: texte normal + bold + italic)
export function richTextArray(...segments: (string | { text: string; bold?: boolean; italic?: boolean; code?: boolean; color?: Color; link?: string })[]): RichText[] {
  return segments.map(segment => {
    if (typeof segment === 'string') {
      return richText(segment);
    }
    return richText(segment.text, segment);
  });
}

// ==================== TEXT BLOCKS ====================

// Paragraph
export function paragraph(content: string | RichText[], options?: { color?: Color; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.paragraph.children = options.children;
  return block;
}

// Headings avec support toggleable et children
export function heading1(content: string | RichText[], options?: { color?: Color; toggleable?: boolean; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_1.children = options.children;
  return block;
}

export function heading2(content: string | RichText[], options?: { color?: Color; toggleable?: boolean; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_2.children = options.children;
  return block;
}

export function heading3(content: string | RichText[], options?: { color?: Color; toggleable?: boolean; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_3.children = options.children;
  return block;
}

// Callout (parfait pour notes importantes, warnings, tips)
export function callout(content: string | RichText[], options?: { 
  icon?: string; 
  color?: Color;
  children?: any[];
}) {
  const block: any = {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      icon: options?.icon ? { type: 'emoji', emoji: options.icon } : { type: 'emoji', emoji: '💡' },
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.callout.children = options.children;
  return block;
}

// Quote
export function quote(content: string | RichText[], options?: { color?: Color; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.quote.children = options.children;
  return block;
}

// ==================== CODE & EQUATIONS ====================

// Code block avec tous les langages supportés
export function code(content: string, language: CodeLanguage = 'javascript', caption?: string) {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [richText(content)],
      language,
      caption: caption ? [richText(caption)] : []
    }
  };
}

// Equation (LaTeX) - block level
export function equation(expression: string) {
  return {
    object: 'block',
    type: 'equation',
    equation: { expression }
  };
}

// ==================== LISTS ====================

// Bulleted list item avec support enfants imbriqués
export function bulletedListItem(content: string | RichText[], options?: { color?: Color; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.bulleted_list_item.children = options.children;
  return block;
}

// Numbered list item avec support enfants imbriqués
export function numberedListItem(content: string | RichText[], options?: { color?: Color; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.numbered_list_item.children = options.children;
  return block;
}

// To-do avec support enfants imbriqués
export function todo(content: string | RichText[], checked: boolean = false, options?: { color?: Color; children?: any[] }) {
  const block: any = {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      checked,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.to_do.children = options.children;
  return block;
}

// Toggle (pour masquer du contenu) avec enfants obligatoires pour être utile
export function toggle(content: string | RichText[], children: any[] = [], options?: { color?: Color }) {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: typeof content === 'string' ? [richText(content)] : content,
      color: options?.color || 'default',
      children
    }
  };
}

// ==================== MEDIA ====================

// Image (externe)
export function image(url: string, caption?: string) {
  return {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url },
      caption: caption ? [richText(caption)] : []
    }
  };
}

// Video (externe - YouTube, Vimeo, etc.)
export function video(url: string, caption?: string) {
  return {
    object: 'block',
    type: 'video',
    video: {
      type: 'external',
      external: { url },
      caption: caption ? [richText(caption)] : []
    }
  };
}

// Audio (externe)
export function audio(url: string, caption?: string) {
  return {
    object: 'block',
    type: 'audio',
    audio: {
      type: 'external',
      external: { url },
      caption: caption ? [richText(caption)] : []
    }
  };
}

// PDF (externe)
export function pdf(url: string, caption?: string) {
  return {
    object: 'block',
    type: 'pdf',
    pdf: {
      type: 'external',
      external: { url },
      caption: caption ? [richText(caption)] : []
    }
  };
}

// File (externe)
export function file(url: string, name?: string, caption?: string) {
  return {
    object: 'block',
    type: 'file',
    file: {
      type: 'external',
      external: { url },
      name: name || 'file',
      caption: caption ? [richText(caption)] : []
    }
  };
}

// Embed (iframes - Figma, Google Maps, etc.)
// Note: L'API Notion ne supporte pas caption pour embed
export function embed(url: string) {
  return {
    object: 'block',
    type: 'embed',
    embed: { url }
  };
}

// Bookmark (lien avec preview)
export function bookmark(url: string, caption?: string) {
  return {
    object: 'block',
    type: 'bookmark',
    bookmark: {
      url,
      caption: caption ? [richText(caption)] : []
    }
  };
}

// Link Preview - NOTE: L'API Notion ne supporte PAS la création de link_preview
// Ce bloc ne peut être que lu, pas créé. Utiliser bookmark() à la place.
// Gardé pour référence si on lit des blocs existants
export function linkPreview(url: string) {
  console.warn('linkPreview: L\'API Notion ne supporte pas la création de ce bloc. Utilisez bookmark() à la place.');
  return bookmark(url);
}

// ==================== LAYOUT ====================

// Divider
export function divider() {
  return {
    object: 'block',
    type: 'divider',
    divider: {}
  };
}

// Table of contents
export function tableOfContents(color?: Color) {
  return {
    object: 'block',
    type: 'table_of_contents',
    table_of_contents: {
      color: color || 'default'
    }
  };
}

// Breadcrumb
export function breadcrumb() {
  return {
    object: 'block',
    type: 'breadcrumb',
    breadcrumb: {}
  };
}

// Column list (pour layout en colonnes)
// width_ratio optionnel: nombre entre 0 et 1 pour la largeur relative
export function columnList(columns: { blocks: any[]; widthRatio?: number }[] | any[][]) {
  // Support ancien format (array of arrays) et nouveau format (avec widthRatio)
  const normalizedColumns = Array.isArray(columns[0]) 
    ? (columns as any[][]).map(blocks => ({ blocks, widthRatio: undefined }))
    : columns as { blocks: any[]; widthRatio?: number }[];

  return {
    object: 'block',
    type: 'column_list',
    column_list: {
      children: normalizedColumns.map(col => {
        const column: any = {
          object: 'block',
          type: 'column',
          column: {
            children: col.blocks
          }
        };
        if (col.widthRatio !== undefined) {
          column.column.width_ratio = col.widthRatio;
        }
        return column;
      })
    }
  };
}

// Table avec support rich text avancé
export function table(rows: (string | RichText[])[][], options?: { 
  hasColumnHeader?: boolean; 
  hasRowHeader?: boolean;
}) {
  const tableRows = rows.map(row => ({
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: row.map(cell => typeof cell === 'string' ? [richText(cell)] : cell)
    }
  }));
  
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: rows[0]?.length || 0,
      has_column_header: options?.hasColumnHeader ?? true,
      has_row_header: options?.hasRowHeader ?? false,
      children: tableRows
    }
  };
}

// ==================== SYNCED BLOCKS ====================

// Synced block original (créer un bloc synchronisé)
export function syncedBlockOriginal(children: any[]) {
  return {
    object: 'block',
    type: 'synced_block',
    synced_block: {
      synced_from: null,
      children
    }
  };
}

// Synced block reference (référencer un bloc synchronisé existant)
export function syncedBlockReference(blockId: string) {
  return {
    object: 'block',
    type: 'synced_block',
    synced_block: {
      synced_from: {
        block_id: blockId
      }
    }
  };
}

// ==================== TEMPLATES POUR COURS ====================

// Template: Note importante
export function noteImportante(content: string, type: 'info' | 'warning' | 'tip' | 'danger' = 'info') {
  const configs = {
    info: { icon: 'ℹ️', color: 'blue_background' as Color },
    warning: { icon: '⚠️', color: 'yellow_background' as Color },
    tip: { icon: '💡', color: 'green_background' as Color },
    danger: { icon: '🚨', color: 'red_background' as Color }
  };
  return callout(content, configs[type]);
}

// Template: Section de cours avec titre et contenu
export function courseSection(title: string, content: any[], options?: { 
  color?: Color;
  toggleable?: boolean;
}) {
  if (options?.toggleable) {
    return heading2(title, { color: options.color, toggleable: true, children: content });
  }
  return [
    heading2(title, { color: options?.color }),
    ...content
  ];
}

// Template: Bloc de définition
export function definition(term: string, definition: string, options?: { color?: Color }) {
  return callout([
    richText(term, { bold: true }),
    richText(': '),
    richText(definition)
  ], { icon: '📖', color: options?.color || 'purple_background' });
}

// Template: Étape numérotée
export function step(number: number, title: string, description?: string, children?: any[]) {
  const content = [
    richText(`Étape ${number}: `, { bold: true }),
    richText(title)
  ];
  
  const block = callout(content, { 
    icon: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][number - 1] || '⏺️',
    color: 'gray_background',
    children: description || children ? [
      ...(description ? [paragraph(description)] : []),
      ...(children || [])
    ] : undefined
  });
  
  return block;
}

// Template: Bloc exercice
export function exercice(title: string, instructions: string[], solution?: string) {
  const children: any[] = instructions.map(i => bulletedListItem(i));
  
  if (solution) {
    children.push(
      toggle('💡 Voir la solution', [
        code(solution, 'plain text')
      ], { color: 'green_background' })
    );
  }
  
  return callout([richText('Exercice: ', { bold: true }), richText(title)], {
    icon: '✏️',
    color: 'orange_background',
    children
  });
}

// Template: Résumé de chapitre
export function chapterSummary(points: string[]) {
  return callout('📝 Points clés à retenir', {
    icon: '📝',
    color: 'blue_background',
    children: points.map(p => bulletedListItem(p, { color: 'blue' }))
  });
}

// Template: Objectifs d'apprentissage
export function learningObjectives(objectives: string[]) {
  return callout('🎯 À la fin de cette section, vous serez capable de :', {
    icon: '🎯',
    color: 'green_background',
    children: objectives.map(o => todo(o, false))
  });
}

// Template: Prérequis
export function prerequisites(items: string[]) {
  return callout('📋 Prérequis', {
    icon: '📋',
    color: 'gray_background',
    children: items.map(i => bulletedListItem(i))
  });
}

// Template: Temps estimé
export function estimatedTime(minutes: number) {
  return callout(`⏱️ Temps estimé : ${minutes} minutes`, {
    icon: '⏱️',
    color: 'purple_background'
  });
}

// Template: Comparaison côte à côte
export function comparison(left: { title: string; content: any[] }, right: { title: string; content: any[] }) {
  return columnList([
    [
      heading3(left.title, { color: 'green' }),
      ...left.content
    ],
    [
      heading3(right.title, { color: 'red' }),
      ...right.content
    ]
  ]);
}

// Template: Code avec explication
export function codeWithExplanation(codeContent: string, language: CodeLanguage, explanations: { line: string; explanation: string }[]) {
  return [
    code(codeContent, language),
    callout('Explication ligne par ligne :', {
      icon: '📖',
      color: 'gray_background',
      children: explanations.map(e => 
        bulletedListItem([
          richText(e.line, { code: true }),
          richText(' → '),
          richText(e.explanation)
        ])
      )
    })
  ];
}

// Template: Quiz rapide
export function quickQuiz(question: string, options: string[], correctIndex: number) {
  return callout([richText('🧠 Quiz: ', { bold: true }), richText(question)], {
    icon: '🧠',
    color: 'purple_background',
    children: [
      ...options.map((opt, i) => bulletedListItem(`${String.fromCharCode(65 + i)}) ${opt}`)),
      toggle('Voir la réponse', [
        callout(`La bonne réponse est ${String.fromCharCode(65 + correctIndex)}) ${options[correctIndex]}`, {
          icon: '✅',
          color: 'green_background'
        })
      ])
    ]
  });
}

// Export de tous les builders
export const BlockBuilders = {
  // Helpers
  richText,
  richTextArray,
  
  // Text
  paragraph,
  heading1,
  heading2,
  heading3,
  callout,
  quote,
  
  // Code
  code,
  equation,
  
  // Lists
  bulletedListItem,
  numberedListItem,
  todo,
  toggle,
  
  // Media
  image,
  video,
  audio,
  pdf,
  file,
  embed,
  bookmark,
  linkPreview,
  
  // Layout
  divider,
  tableOfContents,
  breadcrumb,
  columnList,
  table,
  
  // Synced
  syncedBlockOriginal,
  syncedBlockReference,
  
  // Templates
  noteImportante,
  courseSection,
  definition,
  step,
  exercice,
  chapterSummary,
  learningObjectives,
  prerequisites,
  estimatedTime,
  comparison,
  codeWithExplanation,
  quickQuiz
};

export default BlockBuilders;
