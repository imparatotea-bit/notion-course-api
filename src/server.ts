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
const DEBUG = process.env.DEBUG === 'true';

function debugLog(section: string, data: any) {
  if (DEBUG) {
    console.log(`[DEBUG ${section}]`, JSON.stringify(data, null, 2));
  }
}

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
    version: '2.1.0',
    notionApiVersion: '2025-09-03',
    features: ['validation', 'emoji-cleanup', 'url-validation'],
    timestamp: new Date().toISOString()
  });
});

// ==================== SEARCH ENDPOINTS ====================

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await notion.search(query);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/search-pages', async (req, res) => {
  try {
    const { query } = req.body;
    const pages = await notion.searchPages(query);
    res.json({ success: true, pages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

app.get('/api/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await notion.getPage(pageId);
    res.json({ success: true, page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/page/:pageId/blocks', async (req, res) => {
  try {
    const { pageId } = req.params;
    const pageBlocks = await notion.getPageBlocks(pageId);
    res.json({ success: true, blocks: pageBlocks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/database/:databaseId', async (req, res) => {
  try {
    const { databaseId } = req.params;
    const database = await notion.getDatabase(databaseId);
    res.json({ success: true, database });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// Endpoint pour ajouter du contenu formaté (même format que create-course)
app.post('/api/page/:pageId/append-content', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid content array'
      });
    }

    debugLog('APPEND_CONTENT', { pageId, contentCount: content.length });

    // Convertir le contenu en blocs Notion
    const children: any[] = [];
    for (const item of content as CourseContent[]) {
      const result = buildCourseBlock(item);
      if (result !== null) {
        if (Array.isArray(result)) {
          children.push(...blocks.filterValidBlocks(result));
        } else {
          children.push(result);
        }
      }
    }

    const validChildren = blocks.filterValidBlocks(children);
    
    if (validChildren.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid blocks generated from content'
      });
    }

    await notion.appendBlocks(pageId, validChildren);
    
    res.json({ 
      success: true, 
      message: 'Content appended successfully',
      blocksAdded: validChildren.length
    });
  } catch (error: any) {
    console.error('Error appending content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ==================== COURSE TYPES ====================

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
function buildCourseBlock(item: CourseContent): any | any[] | null {
  debugLog('BUILD_BLOCK', { type: item.type });
  
  switch (item.type) {
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

    case 'info':
      return blocks.noteImportante(item.text || '', 'info');
    case 'warning':
      return blocks.noteImportante(item.text || '', 'warning');
    case 'tip':
      return blocks.noteImportante(item.text || '', 'tip');
    case 'danger':
      return blocks.noteImportante(item.text || '', 'danger');

    case 'code':
      return blocks.code(item.code || item.text || '', (item.language || 'javascript') as any, item.caption);
    case 'equation':
      return blocks.equation(item.text || '');
    case 'codeWithExplanation':
      return blocks.codeWithExplanation(item.code || '', (item.language || 'javascript') as any, item.explanations || []);

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
      const toggleChildren = (item.children || []).flatMap(c => {
        const result = buildCourseBlock(c);
        return result ? (Array.isArray(result) ? result : [result]) : [];
      });
      return blocks.toggle(item.text || '', blocks.filterValidBlocks(toggleChildren), { color: item.color as any });

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
    case 'linkPreview':
      return blocks.bookmark(item.url || '', item.caption);

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
      console.warn(`Type de bloc non reconnu: ${item.type}`);
      return blocks.paragraph(item.text || `[Type non reconnu: ${item.type}]`);
  }
}


// ==================== VALIDATION ENDPOINT ====================

app.post('/api/validate-course', async (req, res) => {
  try {
    const courseData = req.body;
    debugLog('VALIDATE_REQUEST', courseData);
    
    const validation = blocks.validateCourse(courseData);
    
    // Compter les types de blocs
    const stats = {
      totalSections: courseData.sections?.length || 0,
      totalBlocks: 0,
      blockTypes: {} as Record<string, number>
    };
    
    courseData.sections?.forEach((section: CourseSection) => {
      section.content?.forEach((item: CourseContent) => {
        stats.totalBlocks++;
        stats.blockTypes[item.type] = (stats.blockTypes[item.type] || 0) + 1;
      });
    });
    
    const recommendations = blocks.generateRecommendations(stats);
    
    res.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      stats,
      recommendations
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DRY RUN ENDPOINT ====================

app.post('/api/dry-run', async (req, res) => {
  try {
    const courseData = req.body;
    debugLog('DRY_RUN_REQUEST', courseData);
    
    const analysis = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      stats: {
        sections: courseData.sections?.length || 0,
        totalBlocks: 0,
        blockTypes: {} as Record<string, number>
      },
      generatedBlocks: 0
    };
    
    // Analyser et tester la génération de chaque section
    courseData.sections?.forEach((section: CourseSection, idx: number) => {
      if (!section.title) {
        analysis.errors.push(`Section ${idx + 1}: Titre manquant`);
        analysis.valid = false;
      }
      
      section.content?.forEach((item: CourseContent) => {
        analysis.stats.totalBlocks++;
        analysis.stats.blockTypes[item.type] = (analysis.stats.blockTypes[item.type] || 0) + 1;
        
        // Tester la génération du bloc
        try {
          const result = buildCourseBlock(item);
          if (result) {
            analysis.generatedBlocks += Array.isArray(result) ? result.length : 1;
          }
        } catch (e: any) {
          analysis.errors.push(`Section ${idx + 1}: Erreur génération bloc ${item.type} - ${e.message}`);
          analysis.valid = false;
        }
        
        // Vérifications spécifiques
        if (item.type === 'quiz' || item.type === 'quickQuiz') {
          if (!item.options || item.options.length < 2) {
            analysis.warnings.push(`Section ${idx + 1}: Quiz avec trop peu d'options`);
          }
          if (item.correctIndex !== undefined && item.correctIndex >= (item.options?.length || 0)) {
            analysis.errors.push(`Section ${idx + 1}: Quiz correctIndex invalide`);
            analysis.valid = false;
          }
        }
        
        if ((item.type === 'image' || item.type === 'video') && item.url) {
          if (!blocks.isValidUrl(item.url)) {
            analysis.errors.push(`Section ${idx + 1}: URL invalide pour ${item.type}`);
            analysis.valid = false;
          }
        }
      });
    });
    
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// ==================== CREATE COURSE ENDPOINT ====================

app.post('/api/create-course', async (req, res) => {
  try {
    const {
      parentId, title, icon, cover, description,
      estimatedTime, prerequisites, objectives, sections
    } = req.body;

    debugLog('CREATE_COURSE_REQUEST', { parentId, title, sectionsCount: sections?.length });

    if (!parentId || !title || !sections) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: parentId, title, sections'
      });
    }

    // Valider le cours avant création
    const validation = blocks.validateCourse(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings
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
        const descBlock = blocks.paragraph(section.description, { color: 'gray' });
        if (descBlock) children.push(descBlock);
      }

      // Ajouter le contenu de la section avec filtrage des blocs null
      for (const item of section.content) {
        const result = buildCourseBlock(item);
        if (result !== null) {
          if (Array.isArray(result)) {
            children.push(...blocks.filterValidBlocks(result));
          } else {
            children.push(result);
          }
        }
      }
    }

    // Footer
    children.push(blocks.divider());
    children.push(blocks.callout('Félicitations ! Vous avez terminé ce cours.', {
      icon: '🎉',
      color: 'green_background'
    }));

    // Filtrer tous les blocs null avant envoi
    const validChildren = blocks.filterValidBlocks(children);
    debugLog('CHILDREN_COUNT', { total: children.length, valid: validChildren.length });

    const pageData: any = { parent, properties, children: validChildren };

    if (icon) {
      pageData.icon = { type: 'emoji', emoji: icon };
    }
    if (cover) {
      pageData.cover = { type: 'external', external: { url: cover } };
    }

    const page = await notion.createPageWithMeta(pageData);

    res.json({ 
      success: true, 
      page,
      stats: {
        sectionsCreated: sections.length,
        blocksCreated: validChildren.length
      }
    });
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BLOCK TYPES INFO ====================

app.get('/api/block-types', (_req, res) => {
  res.json({
    success: true,
    version: '2.1.0',
    notionApiVersion: '2025-09-03',
    features: ['validation', 'emoji-cleanup', 'url-validation'],
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
    importantNotes: {
      emojis: 'Les types info, warning, tip, danger, definition, exercice, quiz, step ajoutent automatiquement leur emoji. NE PAS en ajouter dans le texte!',
      validation: 'Utilisez /api/validate-course ou /api/dry-run avant de créer un cours',
      urls: 'Les URLs sont validées automatiquement pour image, video, audio, pdf, embed, bookmark'
    },
    examples: {
      paragraph: { type: 'paragraph', text: 'Texte du paragraphe' },
      heading1: { type: 'heading1', text: 'Titre principal', color: 'blue' },
      callout: { type: 'callout', text: 'Note importante', icon: '💡', color: 'yellow_background' },
      info: { type: 'info', text: 'Information utile (emoji ℹ️ ajouté automatiquement)' },
      warning: { type: 'warning', text: 'Attention à ceci! (emoji ⚠️ ajouté automatiquement)' },
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
        children: [{ type: 'paragraph', text: 'Contenu caché' }]
      },
      image: { type: 'image', url: 'https://example.com/image.jpg', caption: 'Description' },
      video: { type: 'video', url: 'https://youtube.com/watch?v=...', caption: 'Tutoriel vidéo' },
      table: { type: 'table', rows: [['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']] },
      comparison: {
        type: 'comparison',
        left: { title: 'Avantages', items: ['Rapide', 'Simple'] },
        right: { title: 'Inconvénients', items: ['Coûteux', 'Complexe'] }
      },
      definition: { type: 'definition', term: 'API', definition: 'Application Programming Interface (emoji 📖 ajouté automatiquement)' },
      step: { type: 'step', stepNumber: 1, text: 'Installer les dépendances', caption: 'npm install' },
      exercice: {
        type: 'exercice',
        text: 'Créer une fonction (emoji ✏️ ajouté automatiquement)',
        instructions: ['Créer une fonction add', 'Elle prend 2 paramètres', 'Elle retourne leur somme'],
        solution: 'function add(a, b) { return a + b; }'
      },
      quiz: {
        type: 'quiz',
        question: 'Quel langage est typé? (emoji 🧠 ajouté automatiquement)',
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
  console.log(`🚀 Notion Course Creator API v2.1.0 running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Block types: http://localhost:${PORT}/api/block-types`);
  console.log(`✅ Validation: POST http://localhost:${PORT}/api/validate-course`);
  console.log(`🧪 Dry run: POST http://localhost:${PORT}/api/dry-run`);
  if (DEBUG) console.log(`🐛 Debug mode: ENABLED`);
});
