// API REST pour connecter ChatGPT à Notion via CustomGPT
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { NotionAPI } from './notion-api';
import * as blocks from './block-builders';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 3000;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN manquant dans .env');
  process.exit(1);
}

// Instance Notion globale
const notion = new NotionAPI(NOTION_TOKEN);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    notionApiVersion: '2025-09-03',
    timestamp: new Date().toISOString()
  });
});

// ==================== SEARCH ENDPOINTS ====================

// Rechercher dans Notion (pages + databases)
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await notion.search(query);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rechercher uniquement des pages
app.post('/api/search-pages', async (req, res) => {
  try {
    const { query } = req.body;
    const pages = await notion.searchPages(query);
    res.json({ success: true, pages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rechercher uniquement des databases
app.post('/api/search-databases', async (req, res) => {
  try {
    const { query } = req.body;
    const databases = await notion.searchDatabases(query);
    res.json({ success: true, databases });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAGE ENDPOINTS ====================

// Récupérer une page spécifique
app.get('/api/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await notion.getPage(pageId);
    res.json({ success: true, page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer le contenu (blocs) d'une page
app.get('/api/page/:pageId/blocks', async (req, res) => {
  try {
    const { pageId } = req.params;
    const pageBlocks = await notion.getPageBlocks(pageId);
    res.json({ success: true, blocks: pageBlocks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer une database
app.get('/api/database/:databaseId', async (req, res) => {
  try {
    const { databaseId } = req.params;
    const database = await notion.getDatabase(databaseId);
    res.json({ success: true, database });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer une nouvelle page (API raw)
app.post('/api/create-page', async (req, res) => {
  try {
    const { parent, properties, children } = req.body;
    if (!parent || !properties) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: parent and properties'
      });
    }
    const page = await notion.createPage({ parent, properties, children });
    res.json({ success: true, page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour une page
app.patch('/api/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { properties } = req.body;
    const page = await notion.updatePage(pageId, { properties });
    res.json({ success: true, page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ajouter du contenu (blocs) à une page
app.post('/api/page/:pageId/append', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { blocks: blocksData } = req.body;
    if (!blocksData || !Array.isArray(blocksData)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid blocks array'
      });
    }
    await notion.appendBlocks(pageId, blocksData);
    res.json({ success: true, message: 'Blocks appended successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HELPER ENDPOINTS ====================

// Helper: Créer une page simple avec titre et contenu texte
app.post('/api/create-simple-page', async (req, res) => {
  try {
    const { parentId, title, content } = req.body;
    if (!parentId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: parentId and title'
      });
    }

    const parent = parentId.length === 32 && !parentId.includes('-')
      ? { database_id: parentId }
      : { page_id: parentId };

    const properties: any = {
      title: { title: [{ text: { content: title } }] }
    };

    if ('database_id' in parent) {
      properties.Name = properties.title;
      delete properties.title;
    }

    const children = content ? [{
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content } }] }
    }] : undefined;

    const page = await notion.createPage({ parent, properties, children });
    res.json({ success: true, page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COURSE CREATION ENDPOINT ====================

interface CourseContent {
  type: string;
  text?: string;
  items?: string[];
  code?: string;
  language?: string;
  caption?: string;
  url?: string;
  icon?: string;
  color?: string;
  checked?: boolean;
  question?: string;
  options?: string[];
  correctIndex?: number;
  term?: string;
  definition?: string;
  stepNumber?: number;
  instructions?: string[];
  solution?: string;
  minutes?: number;
  objectives?: string[];
  left?: { title: string; items: string[] };
  right?: { title: string; items: string[] };
  explanations?: { line: string; explanation: string }[];
  headers?: string[];
  rows?: string[][];
  toggleable?: boolean;
  children?: CourseContent[];
}

interface CourseSection {
  title: string;
  description?: string;
  color?: string;
  toggleable?: boolean;
  content: CourseContent[];
}

// Fonction pour convertir le contenu du cours en blocs Notion
function buildCourseBlock(item: CourseContent): any | any[] {
  switch (item.type) {
    // Text blocks
    case 'paragraph':
      return blocks.paragraph(item.text || '');
    case 'heading1':
      return blocks.heading1(item.text || '', { color: item.color as any, toggleable: item.toggleable });
    case 'heading2':
      return blocks.heading2(item.text || '', { color: item.color as any, toggleable: item.toggleable });
    case 'heading3':
      return blocks.heading3(item.text || '', { color: item.color as any, toggleable: item.toggleable });
    case 'quote':
      return blocks.quote(item.text || '', { color: item.color as any });
    case 'callout':
      return blocks.callout(item.text || '', { icon: item.icon, color: item.color as any });

    // Notes spéciales
    case 'info':
      return blocks.noteImportante(item.text || '', 'info');
    case 'warning':
      return blocks.noteImportante(item.text || '', 'warning');
    case 'tip':
      return blocks.noteImportante(item.text || '', 'tip');
    case 'danger':
      return blocks.noteImportante(item.text || '', 'danger');

    // Code
    case 'code':
      return blocks.code(item.code || item.text || '', (item.language || 'javascript') as any, item.caption);
    case 'equation':
      return blocks.equation(item.text || '');
    case 'codeWithExplanation':
      return blocks.codeWithExplanation(item.code || '', (item.language || 'javascript') as any, item.explanations || []);

    // Lists
    case 'bullet':
    case 'bulletedListItem':
      return blocks.bulletedListItem(item.text || '');
    case 'bullets':
      return (item.items || []).map(i => blocks.bulletedListItem(i));
    case 'numbered':
    case 'numberedListItem':
      return blocks.numberedListItem(item.text || '');
    case 'numberedList':
      return (item.items || []).map(i => blocks.numberedListItem(i));
    case 'todo':
      return blocks.todo(item.text || '', item.checked || false);
    case 'todoList':
      return (item.items || []).map(i => blocks.todo(i, false));
    case 'toggle':
      const toggleChildren = (item.children || []).flatMap(c => buildCourseBlock(c));
      return blocks.toggle(item.text || '', toggleChildren, { color: item.color as any });

    // Media
    case 'image':
      return blocks.image(item.url || '', item.caption);
    case 'video':
      return blocks.video(item.url || '', item.caption);
    case 'audio':
      return blocks.audio(item.url || '', item.caption);
    case 'pdf':
      return blocks.pdf(item.url || '', item.caption);
    case 'embed':
      return blocks.embed(item.url || '');
    case 'bookmark':
      return blocks.bookmark(item.url || '', item.caption);
    case 'linkPreview':
      // L'API ne supporte pas link_preview en création, on utilise bookmark
      return blocks.bookmark(item.url || '');

    // Layout
    case 'divider':
      return blocks.divider();
    case 'tableOfContents':
      return blocks.tableOfContents(item.color as any);
    case 'breadcrumb':
      return blocks.breadcrumb();
    case 'table':
      return blocks.table(item.rows || [], { hasColumnHeader: true });
    case 'columns':
    case 'comparison':
      if (item.left && item.right) {
        return blocks.comparison(
          { title: item.left.title, content: item.left.items.map(i => blocks.bulletedListItem(i)) },
          { title: item.right.title, content: item.right.items.map(i => blocks.bulletedListItem(i)) }
        );
      }
      return blocks.divider();

    // Course templates
    case 'definition':
      return blocks.definition(item.term || '', item.definition || item.text || '');
    case 'step':
      return blocks.step(item.stepNumber || 1, item.text || '', item.caption);
    case 'exercice':
    case 'exercise':
      return blocks.exercice(item.text || 'Exercice', item.instructions || item.items || [], item.solution);
    case 'quiz':
    case 'quickQuiz':
      return blocks.quickQuiz(item.question || item.text || '', item.options || [], item.correctIndex || 0);
    case 'summary':
    case 'chapterSummary':
      return blocks.chapterSummary(item.items || []);
    case 'objectives':
    case 'learningObjectives':
      return blocks.learningObjectives(item.objectives || item.items || []);
    case 'prerequisites':
      return blocks.prerequisites(item.items || []);
    case 'estimatedTime':
      return blocks.estimatedTime(item.minutes || 30);

    default:
      return blocks.paragraph(item.text || `[Type non reconnu: ${item.type}]`);
  }
}

// Créer un cours complet avec structure riche
app.post('/api/create-course', async (req, res) => {
  try {
    const {
      parentId, title, icon, cover, description,
      estimatedTime, prerequisites, objectives, sections
    } = req.body;

    if (!parentId || !title || !sections) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: parentId, title, sections'
      });
    }

    const parent = parentId.length === 32 && !parentId.includes('-')
      ? { database_id: parentId }
      : { page_id: parentId };

    const properties: any = {
      title: { title: [{ text: { content: title } }] }
    };

    if ('database_id' in parent) {
      properties.Name = properties.title;
      delete properties.title;
    }

    // Construire le contenu du cours
    const children: any[] = [];

    // Header du cours
    children.push(blocks.breadcrumb());
    children.push(blocks.tableOfContents('gray'));
    children.push(blocks.divider());

    // Description
    if (description) {
      children.push(blocks.callout(description, { icon: '📖', color: 'blue_background' }));
    }

    // Métadonnées du cours en colonnes
    const metaColumns: any[][] = [];

    if (estimatedTime) {
      metaColumns.push([blocks.estimatedTime(estimatedTime)]);
    }

    if (prerequisites && prerequisites.length > 0) {
      metaColumns.push([blocks.prerequisites(prerequisites)]);
    }

    if (objectives && objectives.length > 0) {
      metaColumns.push([blocks.learningObjectives(objectives)]);
    }

    if (metaColumns.length > 0) {
      if (metaColumns.length === 1) {
        children.push(...metaColumns[0]);
      } else {
        children.push(blocks.columnList(metaColumns));
      }
      children.push(blocks.divider());
    }

    // Ajouter chaque section
    for (const section of sections as CourseSection[]) {
      children.push(blocks.divider());
      children.push(blocks.heading1(section.title, {
        color: (section.color || 'blue') as any,
        toggleable: section.toggleable
      }));

      if (section.description) {
        children.push(blocks.paragraph(section.description, { color: 'gray' }));
      }

      // Ajouter le contenu de la section
      for (const item of section.content) {
        const result = buildCourseBlock(item);
        if (Array.isArray(result)) {
          children.push(...result);
        } else {
          children.push(result);
        }
      }
    }

    // Footer
    children.push(blocks.divider());
    children.push(blocks.callout('🎉 Félicitations ! Vous avez terminé ce cours.', {
      icon: '🎉',
      color: 'green_background'
    }));

    const pageData: any = { parent, properties, children };

    // Ajouter icon et cover si fournis
    if (icon) {
      pageData.icon = { type: 'emoji', emoji: icon };
    }
    if (cover) {
      pageData.cover = { type: 'external', external: { url: cover } };
    }

    // Utiliser directement l'API pour supporter icon/cover
    const page = await notion.createPageWithMeta(pageData);

    res.json({ success: true, page });
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BLOCK TYPES INFO ====================

// Helper: Obtenir les block builders disponibles
app.get('/api/block-types', (_req, res) => {
  res.json({
    success: true,
    version: '2.0.0',
    notionApiVersion: '2025-09-03',
    blockTypes: {
      text: ['paragraph', 'heading1', 'heading2', 'heading3', 'quote', 'callout'],
      notes: ['info', 'warning', 'tip', 'danger'],
      lists: ['bullet', 'bullets', 'numbered', 'numberedList', 'todo', 'todoList', 'toggle'],
      media: ['image', 'video', 'audio', 'pdf', 'embed', 'bookmark'],
      code: ['code', 'equation', 'codeWithExplanation'],
      layout: ['divider', 'table', 'columns', 'comparison', 'tableOfContents', 'breadcrumb'],
      courseTemplates: [
        'definition',
        'step',
        'exercice',
        'quiz',
        'summary',
        'objectives',
        'prerequisites',
        'estimatedTime'
      ]
    },
    examples: {
      paragraph: { type: 'paragraph', text: 'Texte du paragraphe' },
      heading1: { type: 'heading1', text: 'Titre principal', color: 'blue' },
      callout: { type: 'callout', text: 'Note importante', icon: '💡', color: 'yellow_background' },
      info: { type: 'info', text: 'Information utile' },
      warning: { type: 'warning', text: 'Attention à ceci!' },
      code: { type: 'code', code: 'console.log("Hello")', language: 'javascript', caption: 'Exemple' },
      codeWithExplanation: {
        type: 'codeWithExplanation',
        code: 'const x = 5;\nconsole.log(x);',
        language: 'javascript',
        explanations: [
          { line: 'const x = 5', explanation: 'Déclare une variable x' },
          { line: 'console.log(x)', explanation: 'Affiche x dans la console' }
        ]
      },
      bullets: { type: 'bullets', items: ['Point 1', 'Point 2', 'Point 3'] },
      toggle: {
        type: 'toggle',
        text: 'Cliquez pour voir plus',
        children: [
          { type: 'paragraph', text: 'Contenu caché' }
        ]
      },
      image: { type: 'image', url: 'https://example.com/image.jpg', caption: 'Description' },
      video: { type: 'video', url: 'https://youtube.com/watch?v=...', caption: 'Tutoriel vidéo' },
      table: { type: 'table', rows: [['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']] },
      comparison: {
        type: 'comparison',
        left: { title: 'Avantages', items: ['Rapide', 'Simple'] },
        right: { title: 'Inconvénients', items: ['Coûteux', 'Complexe'] }
      },
      definition: { type: 'definition', term: 'API', definition: 'Application Programming Interface' },
      step: { type: 'step', stepNumber: 1, text: 'Installer les dépendances', caption: 'npm install' },
      exercice: {
        type: 'exercice',
        text: 'Créer une fonction',
        instructions: ['Créer une fonction add', 'Elle prend 2 paramètres', 'Elle retourne leur somme'],
        solution: 'function add(a, b) { return a + b; }'
      },
      quiz: {
        type: 'quiz',
        question: 'Quel langage est typé?',
        options: ['JavaScript', 'TypeScript', 'Python'],
        correctIndex: 1
      },
      summary: { type: 'summary', items: ['Point clé 1', 'Point clé 2', 'Point clé 3'] },
      objectives: { type: 'objectives', items: ['Comprendre X', 'Maîtriser Y', 'Appliquer Z'] },
      prerequisites: { type: 'prerequisites', items: ['Connaître HTML', 'Bases de JavaScript'] },
      estimatedTime: { type: 'estimatedTime', minutes: 45 }
    },
    courseExample: {
      parentId: 'your-page-or-database-id',
      title: 'Introduction à TypeScript',
      icon: '📘',
      description: 'Apprenez TypeScript de zéro à héros!',
      estimatedTime: 60,
      prerequisites: ['JavaScript ES6', 'Node.js installé'],
      objectives: ['Comprendre les types', 'Créer des interfaces', 'Compiler du TypeScript'],
      sections: [
        {
          title: 'Chapitre 1: Les bases',
          description: 'Découvrez les fondamentaux de TypeScript',
          color: 'blue',
          content: [
            { type: 'info', text: 'TypeScript est un sur-ensemble de JavaScript' },
            { type: 'heading2', text: 'Installation' },
            { type: 'code', code: 'npm install -g typescript', language: 'bash' },
            { type: 'definition', term: 'Type', definition: 'Une annotation qui décrit la forme des données' },
            { type: 'quiz', question: 'TypeScript compile vers?', options: ['Java', 'JavaScript', 'Python'], correctIndex: 1 }
          ]
        }
      ]
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Notion Course Creator API running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Block types: http://localhost:${PORT}/api/block-types`);
});
