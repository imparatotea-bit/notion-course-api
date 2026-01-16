// Builders pour créer facilement TOUS les types de blocs Notion
// Compatible API 2025-09-03 - Version CORRIGÉE avec validations

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

// ==================== VALIDATION HELPERS ====================

// Validation des URLs
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Nettoyer les emojis en début de texte (pour éviter les doublons)
const TEMPLATE_EMOJIS = ['ℹ️', '⚠️', '💡', '🚨', '📖', '✏️', '🧠', '📝', '🎯', '📋', '⏱️'];
function cleanLeadingEmoji(text: string): string {
  let cleaned = text.trim();
  for (const emoji of TEMPLATE_EMOJIS) {
    if (cleaned.startsWith(emoji)) {
      cleaned = cleaned.slice(emoji.length).trim();
    }
  }
  return cleaned;
}

// ==================== HELPERS ====================

// Helper pour créer du rich text simple - AVEC VALIDATION
export function richText(content: string, options?: {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: Color;
  link?: string;
}): RichText {
  // Nettoyer les espaces superflus
  const cleanContent = content.trim();
  
  // Limiter à 2000 caractères (limite API Notion)
  const truncatedContent = cleanContent.length > 2000 
    ? cleanContent.substring(0, 1997) + '...'
    : cleanContent;
  
  // Ne pas créer de rich text vide
  if (!truncatedContent) {
    return {
      type: 'text',
      text: { content: ' ', link: null },
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }
    };
  }

  return {
    type: 'text',
    text: {
      content: truncatedContent,
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

// Helper pour créer du rich text avec multiples segments - évite les segments vides
export function richTextArray(...segments: (string | { text: string; bold?: boolean; italic?: boolean; code?: boolean; color?: Color; link?: string })[]): RichText[] {
  return segments
    .filter(segment => {
      if (typeof segment === 'string') return segment.trim().length > 0;
      return segment.text && segment.text.trim().length > 0;
    })
    .map(segment => {
      if (typeof segment === 'string') {
        return richText(segment);
      }
      return richText(segment.text, segment);
    });
}

// Interface pour le rich text formaté depuis le GPT
export interface FormattedTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: Color;
  link?: string;
}

// Parser de markdown simplifié vers rich text Notion
// Supporte: **bold**, *italic*, `code`, ~~strikethrough~~, [link](url)
export function parseFormattedText(text: string): RichText[] {
  const segments: RichText[] = [];
  
  // Regex pour détecter les patterns markdown
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, style: { bold: true } },           // **bold**
    { regex: /\*(.+?)\*/g, style: { italic: true } },              // *italic*
    { regex: /`(.+?)`/g, style: { code: true } },                  // `code`
    { regex: /~~(.+?)~~/g, style: { strikethrough: true } },       // ~~strikethrough~~
    { regex: /\[(.+?)\]\((.+?)\)/g, style: { link: true } },       // [text](url)
  ];
  
  // Tokenizer simple
  interface Token {
    start: number;
    end: number;
    text: string;
    style: any;
    link?: string;
  }
  
  const tokens: Token[] = [];
  
  // Trouver tous les patterns
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      if (pattern.style.link) {
        tokens.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          style: {},
          link: match[2]
        });
      } else {
        tokens.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          style: pattern.style
        });
      }
    }
  }
  
  // Trier par position
  tokens.sort((a, b) => a.start - b.start);
  
  // Si pas de formatage, retourner le texte brut
  if (tokens.length === 0) {
    return [richText(text)];
  }
  
  // Construire les segments
  let lastEnd = 0;
  for (const token of tokens) {
    // Éviter les chevauchements
    if (token.start < lastEnd) continue;
    
    // Texte avant le token
    if (token.start > lastEnd) {
      const plainText = text.slice(lastEnd, token.start);
      if (plainText.trim()) {
        segments.push(richText(plainText));
      }
    }
    
    // Le token formaté
    segments.push(richText(token.text, {
      ...token.style,
      link: token.link
    }));
    
    lastEnd = token.end;
  }
  
  // Texte restant après le dernier token
  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd);
    if (remaining.trim()) {
      segments.push(richText(remaining));
    }
  }
  
  return segments.length > 0 ? segments : [richText(text)];
}

// Convertir un array de segments formatés en rich text Notion
export function formattedSegmentsToRichText(segments: FormattedTextSegment[]): RichText[] {
  return segments
    .filter(s => s.text && s.text.trim().length > 0)
    .map(s => richText(s.text, {
      bold: s.bold,
      italic: s.italic,
      strikethrough: s.strikethrough,
      underline: s.underline,
      code: s.code,
      color: s.color,
      link: s.link
    }));
}

// ==================== TEXT BLOCKS ====================

// Type pour le contenu texte (string simple, markdown, ou rich text array)
type TextContent = string | RichText[] | FormattedTextSegment[];

// Helper pour convertir TextContent en RichText[]
function toRichTextArray(content: TextContent, parseMarkdown: boolean = true): RichText[] | null {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) return null;
    // Parser le markdown si activé
    return parseMarkdown ? parseFormattedText(trimmed) : [richText(trimmed)];
  }
  
  if (Array.isArray(content) && content.length > 0) {
    // Vérifier si c'est un array de RichText ou de FormattedTextSegment
    const first = content[0];
    if ('type' in first && first.type === 'text') {
      // C'est déjà du RichText[]
      return (content as RichText[]).filter(rt => rt.text.content.trim().length > 0);
    } else {
      // C'est du FormattedTextSegment[]
      return formattedSegmentsToRichText(content as FormattedTextSegment[]);
    }
  }
  
  return null;
}

// Paragraph avec support markdown et rich text
export function paragraph(content: TextContent, options?: { color?: Color; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false);
  if (!richTextContent || richTextContent.length === 0) return null;

  const block: any = {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richTextContent,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.paragraph.children = options.children;
  return block;
}

// Headings avec support toggleable et children
export function heading1(content: TextContent, options?: { color?: Color; toggleable?: boolean; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: richTextContent,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_1.children = options.children;
  return block;
}

export function heading2(content: TextContent, options?: { color?: Color; toggleable?: boolean; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: richTextContent,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_2.children = options.children;
  return block;
}

export function heading3(content: TextContent, options?: { color?: Color; toggleable?: boolean; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: richTextContent,
      color: options?.color || 'default',
      is_toggleable: options?.toggleable || false
    }
  };
  if (options?.toggleable && options?.children) block.heading_3.children = options.children;
  return block;
}

// Callout (parfait pour notes importantes, warnings, tips)
export function callout(content: TextContent, options?: { 
  icon?: string; 
  color?: Color;
  children?: any[];
  parseMarkdown?: boolean;
}) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: richTextContent,
      icon: options?.icon ? { type: 'emoji', emoji: options.icon } : { type: 'emoji', emoji: '💡' },
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.callout.children = options.children;
  return block;
}

// Quote
export function quote(content: TextContent, options?: { color?: Color; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: richTextContent,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.quote.children = options.children;
  return block;
}

// ==================== CODE & EQUATIONS ====================

// Code block avec validation de longueur
export function code(content: string, language: CodeLanguage = 'javascript', caption?: string) {
  const maxCodeLength = 50000;
  let codeContent = content.trim();
  
  if (codeContent.length > maxCodeLength) {
    codeContent = codeContent.substring(0, maxCodeLength - 100) + '\n\n// ... Code tronqué';
    console.warn('code: Contenu tronqué (trop long)');
  }

  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [richText(codeContent)],
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

// Bulleted list item avec support markdown et enfants imbriqués
export function bulletedListItem(content: TextContent, options?: { color?: Color; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: richTextContent,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.bulleted_list_item.children = options.children;
  return block;
}

// Numbered list item avec support markdown et enfants imbriqués
export function numberedListItem(content: TextContent, options?: { color?: Color; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: richTextContent,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.numbered_list_item.children = options.children;
  return block;
}

// To-do avec support markdown et enfants imbriqués
export function todo(content: TextContent, checked: boolean = false, options?: { color?: Color; children?: any[]; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  const block: any = {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: richTextContent,
      checked,
      color: options?.color || 'default'
    }
  };
  if (options?.children) block.to_do.children = options.children;
  return block;
}

// Toggle avec support markdown
export function toggle(content: TextContent, children: any[] = [], options?: { color?: Color; parseMarkdown?: boolean }) {
  const richTextContent = toRichTextArray(content, options?.parseMarkdown !== false) || [richText('')];
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: richTextContent,
      color: options?.color || 'default',
      children
    }
  };
}

// ==================== MEDIA (avec validation URL) ====================

// Image (externe) avec validation
export function image(url: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`image: URL invalide - ${url}`);
    return paragraph(`[Image invalide: ${url}]`);
  }
  
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

// Video (externe - YouTube, Vimeo, etc.) avec validation
export function video(url: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`video: URL invalide - ${url}`);
    return paragraph(`[Vidéo invalide: ${url}]`);
  }

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

// Audio (externe) avec validation
export function audio(url: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`audio: URL invalide - ${url}`);
    return paragraph(`[Audio invalide: ${url}]`);
  }

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

// PDF (externe) avec validation
export function pdf(url: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`pdf: URL invalide - ${url}`);
    return paragraph(`[PDF invalide: ${url}]`);
  }

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

// File (externe) avec validation
export function file(url: string, name?: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`file: URL invalide - ${url}`);
    return paragraph(`[Fichier invalide: ${url}]`);
  }

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

// Embed (iframes - Figma, Google Maps, etc.) avec validation
export function embed(url: string) {
  if (!isValidUrl(url)) {
    console.warn(`embed: URL invalide - ${url}`);
    return paragraph(`[Embed invalide: ${url}]`);
  }

  return {
    object: 'block',
    type: 'embed',
    embed: { url }
  };
}

// Bookmark (lien avec preview) avec validation
export function bookmark(url: string, caption?: string) {
  if (!isValidUrl(url)) {
    console.warn(`bookmark: URL invalide - ${url}`);
    return paragraph(`[Bookmark invalide: ${url}]`);
  }

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
export function columnList(columns: { blocks: any[]; widthRatio?: number }[] | any[][]) {
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


// ==================== TEMPLATES POUR COURS (CORRIGÉS - sans emojis dupliqués) ====================

// Template: Note importante - emoji déjà dans la config, pas dans le texte
export function noteImportante(content: string, type: 'info' | 'warning' | 'tip' | 'danger' = 'info') {
  const configs = {
    info: { icon: 'ℹ️', color: 'blue_background' as Color },
    warning: { icon: '⚠️', color: 'yellow_background' as Color },
    tip: { icon: '💡', color: 'green_background' as Color },
    danger: { icon: '🚨', color: 'red_background' as Color }
  };
  // Ne PAS ajouter d'emoji au début du content - l'icon s'en charge
  const cleanContent = cleanLeadingEmoji(content);
  return callout(cleanContent, configs[type]);
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

// Template: Bloc de définition - emoji déjà dans l'icon
export function definition(term: string, def: string, options?: { color?: Color }) {
  // Ne pas ajouter d'emoji 📖 dans le texte
  const cleanDef = cleanLeadingEmoji(def);
  return callout([
    richText(term, { bold: true }),
    richText(': '),
    richText(cleanDef)
  ], { icon: '📖', color: options?.color || 'purple_background' });
}

// Template: Étape numérotée - gestion correcte des emojis de numéros
export function step(number: number, title: string, description?: string, children?: any[]) {
  const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const emoji = number <= 10 ? emojiNumbers[number - 1] : '⏺️';
  
  // Ne pas répéter "Étape X" dans le titre si déjà présent
  const cleanTitle = title.replace(/^Étape\s+\d+\s*:\s*/i, '').trim();
  
  const content = [
    richText(`Étape ${number}: `, { bold: true }),
    richText(cleanTitle)
  ];
  
  const blockChildren: any[] = [];
  if (description) {
    const descBlock = paragraph(description);
    if (descBlock) blockChildren.push(descBlock);
  }
  if (children) {
    blockChildren.push(...filterValidBlocks(children));
  }
  
  return callout(content, { 
    icon: emoji,
    color: 'gray_background',
    children: blockChildren.length > 0 ? blockChildren : undefined
  });
}

// Template: Bloc exercice - emoji déjà géré
export function exercice(title: string, instructions: string[], solution?: string) {
  // Ne pas ajouter ✏️ dans le titre, enlever "Exercice:" si présent
  let cleanTitle = cleanLeadingEmoji(title);
  cleanTitle = cleanTitle.replace(/^Exercice\s*:\s*/i, '').trim();
  const cleanInstructions = instructions.map(i => i.trim()).filter(i => i.length > 0);
  
  const children: any[] = cleanInstructions.map(i => bulletedListItem(i));
  
  if (solution) {
    children.push(
      toggle('💡 Voir la solution', [
        code(solution.trim(), 'plain text')
      ], { color: 'green_background' })
    );
  }
  
  return callout([richText('Exercice: ', { bold: true }), richText(cleanTitle)], {
    icon: '✏️',
    color: 'orange_background',
    children
  });
}

// Template: Résumé de chapitre
export function chapterSummary(points: string[]) {
  const cleanPoints = points.map(p => p.trim()).filter(p => p.length > 0);
  return callout('Points clés à retenir', {
    icon: '📝',
    color: 'blue_background',
    children: cleanPoints.map(p => bulletedListItem(p, { color: 'blue' }))
  });
}

// Template: Objectifs d'apprentissage
export function learningObjectives(objectives: string[]) {
  const cleanObjectives = objectives.map(o => o.trim()).filter(o => o.length > 0);
  return callout('À la fin de cette section, vous serez capable de :', {
    icon: '🎯',
    color: 'green_background',
    children: cleanObjectives.map(o => todo(o, false))
  });
}

// Template: Prérequis
export function prerequisites(items: string[]) {
  const cleanItems = items.map(i => i.trim()).filter(i => i.length > 0);
  return callout('Prérequis', {
    icon: '📋',
    color: 'gray_background',
    children: cleanItems.map(i => bulletedListItem(i))
  });
}

// Template: Temps estimé
export function estimatedTime(minutes: number) {
  return callout(`Temps estimé : ${minutes} minutes`, {
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

// Template: Quiz rapide - validation et nettoyage
export function quickQuiz(question: string, options: string[], correctIndex: number) {
  // Validation
  if (!options || options.length < 2) {
    console.warn('quickQuiz: Au moins 2 options requises');
    return paragraph('Quiz invalide : options manquantes');
  }
  
  if (correctIndex < 0 || correctIndex >= options.length) {
    console.warn('quickQuiz: correctIndex invalide');
    correctIndex = 0;
  }
  
  // Nettoyer la question (enlever emoji 🧠 et "Quiz:" si présent)
  let cleanQuestion = cleanLeadingEmoji(question);
  cleanQuestion = cleanQuestion.replace(/^Quiz\s*:\s*/i, '').trim();
  const cleanOptions = options.map(opt => opt.trim());
  
  return callout([richText('Quiz: ', { bold: true }), richText(cleanQuestion)], {
    icon: '🧠',
    color: 'purple_background',
    children: [
      ...cleanOptions.map((opt, i) => bulletedListItem(`${String.fromCharCode(65 + i)}) ${opt}`)),
      toggle('Voir la réponse', [
        callout(`La bonne réponse est ${String.fromCharCode(65 + correctIndex)}) ${cleanOptions[correctIndex]}`, {
          icon: '✅',
          color: 'green_background'
        })
      ])
    ]
  });
}

// ==================== VALIDATION GLOBALE ====================

// Helper pour filtrer les blocs null
export function filterValidBlocks(blocks: any[]): any[] {
  return blocks.filter(block => block !== null && block !== undefined);
}

// Fonction de validation complète d'un cours
export function validateCourse(course: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier les champs requis
  if (!course.title || course.title.trim().length === 0) {
    errors.push('Titre manquant');
  }

  if (!course.sections || course.sections.length === 0) {
    errors.push('Au moins une section requise');
  }

  // Vérifier chaque section
  course.sections?.forEach((section: any, idx: number) => {
    if (!section.title) {
      errors.push(`Section ${idx + 1}: titre manquant`);
    }

    if (!section.content || section.content.length === 0) {
      errors.push(`Section ${idx + 1}: contenu manquant`);
    }

    // Vérifier qu'il n'y a pas trop de paragraphes consécutifs
    let consecutiveParagraphs = 0;
    section.content?.forEach((item: any) => {
      if (item.type === 'paragraph') {
        consecutiveParagraphs++;
        if (consecutiveParagraphs >= 3) {
          warnings.push(`Section ${idx + 1}: ${consecutiveParagraphs} paragraphes consécutifs. Variez les types de blocs!`);
        }
      } else {
        consecutiveParagraphs = 0;
      }

      // Vérifier les quiz
      if (item.type === 'quiz' || item.type === 'quickQuiz') {
        if (!item.options || item.options.length < 2) {
          errors.push(`Section ${idx + 1}: Quiz avec trop peu d'options`);
        }
        if (item.correctIndex !== undefined && item.correctIndex >= (item.options?.length || 0)) {
          errors.push(`Section ${idx + 1}: Quiz correctIndex invalide`);
        }
      }

      // Vérifier les URLs
      if ((item.type === 'image' || item.type === 'video' || item.type === 'audio' || item.type === 'pdf') && item.url) {
        if (!isValidUrl(item.url)) {
          errors.push(`Section ${idx + 1}: URL invalide pour ${item.type}`);
        }
      }

      // Vérifier les textes trop longs
      if (item.text && item.text.length > 2000) {
        warnings.push(`Section ${idx + 1}: Texte trop long (${item.text.length} chars)`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Générer des recommandations basées sur les stats
export function generateRecommendations(stats: { totalBlocks: number; totalSections: number; blockTypes: Record<string, number> }): string[] {
  const recommendations: string[] = [];

  // Trop de paragraphes ?
  const paragraphRatio = (stats.blockTypes.paragraph || 0) / stats.totalBlocks;
  if (paragraphRatio > 0.5) {
    recommendations.push('⚠️ Trop de paragraphes (>50%). Ajoute plus d\'exercices, quiz ou blocs interactifs.');
  }

  // Pas d'exercices ?
  if (!stats.blockTypes.exercice && !stats.blockTypes.exercise) {
    recommendations.push('💡 Aucun exercice détecté. Ajoute des exercices pratiques pour renforcer l\'apprentissage.');
  }

  // Pas de quiz ?
  if (!stats.blockTypes.quiz && !stats.blockTypes.quickQuiz) {
    recommendations.push('💡 Aucun quiz détecté. Ajoute des quiz pour valider la compréhension.');
  }

  // Sections trop longues ?
  const avgBlocksPerSection = stats.totalBlocks / stats.totalSections;
  if (avgBlocksPerSection > 15) {
    recommendations.push('⚠️ Sections trop longues (>15 blocs en moyenne). Découpe-les pour améliorer la lisibilité.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Structure excellente ! Le cours est bien équilibré.');
  }

  return recommendations;
}

// Export de tous les builders
export const BlockBuilders = {
  // Helpers
  richText,
  richTextArray,
  parseFormattedText,
  formattedSegmentsToRichText,
  isValidUrl,
  filterValidBlocks,
  validateCourse,
  generateRecommendations,
  
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
