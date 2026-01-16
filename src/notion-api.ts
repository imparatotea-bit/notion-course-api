// Notion API Adapter - Extrait de NotionClipper
import { Client } from '@notionhq/client';

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: any;
  cover?: any;
  parent: any;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  in_trash: boolean;
}

export interface NotionDatabase {
  id: string;
  title: string;
  description?: string;
  icon?: any;
  cover?: any;
  properties: Record<string, any>;
  parent: any;
  url: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  in_trash: boolean;
  data_sources?: Array<{ id: string; name: string }>;
  default_data_source_id?: string;
}

export interface NotionBlock {
  type: string;
  [key: string]: any;
}

export class NotionAPI {
  private client: Client | null = null;

  constructor(token?: string) {
    if (token) {
      this.setToken(token);
    }
  }

  setToken(token: string): void {
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }

    // Tokens Notion: ntn_ (nouveaux) ou secret_ (legacy)
    if (!token.startsWith('ntn_') && !token.startsWith('secret_')) {
      throw new Error('Token invalide. Les tokens Notion commencent par "ntn_" ou "secret_"');
    }

    this.client = new Client({
      auth: token,
      notionVersion: '2025-09-03'
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.users.me({});
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async search(query?: string): Promise<(NotionPage | NotionDatabase)[]> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.search({
      query,
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    });

    return response.results.map(item => this.formatPageOrDatabase(item));
  }

  async searchPages(query?: string): Promise<NotionPage[]> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.search({
      query,
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    });

    return response.results
      .filter(item => item.object === 'page')
      .map(item => this.formatPage(item));
  }

  async searchDatabases(query?: string): Promise<NotionDatabase[]> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.search({
      query,
      filter: { property: 'object', value: 'database' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    });

    return response.results
      .filter(item => item.object === 'database')
      .map(item => this.formatDatabase(item));
  }

  async getPage(pageId: string): Promise<NotionPage> {
    if (!this.client) throw new Error('Client not initialized');
    const response = await this.client.pages.retrieve({ page_id: pageId });
    return this.formatPage(response);
  }

  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    if (!this.client) throw new Error('Client not initialized');
    const response = await this.client.databases.retrieve({ database_id: databaseId });
    const database = this.formatDatabase(response);

    // Support API 2025-09-03: data sources
    const responseWithDataSources = response as any;
    if (responseWithDataSources.data_sources && responseWithDataSources.data_sources.length > 0) {
      database.data_sources = responseWithDataSources.data_sources;
      database.default_data_source_id = responseWithDataSources.data_sources[0].id;
    }

    return database;
  }

  async getDataSource(dataSourceId: string): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await (this.client as any).request({
      path: `data_sources/${dataSourceId}`,
      method: 'GET'
    });

    return response;
  }

  async listDataSources(databaseId: string): Promise<Array<{ id: string, name: string }>> {
    const database = await this.getDatabase(databaseId);
    return database.data_sources || [];
  }

  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    if (!this.client) throw new Error('Client not initialized');

    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      blocks.push(...response.results as NotionBlock[]);
      cursor = response.has_more ? response.next_cursor || undefined : undefined;
    } while (cursor);

    return blocks;
  }

  async createPage(data: {
    parent: { page_id: string } | { database_id: string } | { data_source_id: string };
    properties: Record<string, any>;
    children?: NotionBlock[];
  }): Promise<NotionPage> {
    if (!this.client) throw new Error('Client not initialized');

    // Support API 2025-09-03: data_source_id parent
    let parentForSDK = data.parent;
    if ('data_source_id' in data.parent) {
      console.warn('Using data_source_id parent (API 2025-09-03)');
      parentForSDK = data.parent as any;
    }

    const response = await this.client.pages.create({
      parent: parentForSDK as any,
      properties: data.properties,
      children: (data.children || []) as any
    });

    return this.formatPage(response);
  }

  async createPageWithMeta(data: {
    parent: { page_id: string } | { database_id: string } | { data_source_id: string };
    properties: Record<string, any>;
    children?: any[];
    icon?: { type: 'emoji'; emoji: string } | { type: 'external'; external: { url: string } };
    cover?: { type: 'external'; external: { url: string } };
  }): Promise<NotionPage> {
    if (!this.client) throw new Error('Client not initialized');

    let parentForSDK = data.parent;
    if ('data_source_id' in data.parent) {
      console.warn('Using data_source_id parent (API 2025-09-03)');
      parentForSDK = data.parent as any;
    }

    const requestData: any = {
      parent: parentForSDK as any,
      properties: data.properties,
      children: (data.children || []) as any
    };

    if (data.icon) {
      requestData.icon = data.icon;
    }
    if (data.cover) {
      requestData.cover = data.cover;
    }

    const response = await this.client.pages.create(requestData);
    return this.formatPage(response);
  }

  async updatePage(pageId: string, data: { properties?: Record<string, any> }): Promise<NotionPage> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.pages.update({
      page_id: pageId,
      properties: data.properties || {}
    });

    return this.formatPage(response);
  }

  async appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const chunkSize = 100;
    const chunks = this.chunkArray(blocks, chunkSize);

    for (const chunk of chunks) {
      await this.client.blocks.children.append({
        block_id: pageId,
        children: chunk as any
      });
    }
  }

  private formatPageOrDatabase(item: any): NotionPage | NotionDatabase {
    if (item.object === 'database') {
      return this.formatDatabase(item);
    }
    return this.formatPage(item);
  }

  private formatPage(page: any): NotionPage {
    return {
      id: page.id,
      title: this.extractTitle(page.properties),
      url: page.url,
      icon: page.icon,
      cover: page.cover,
      parent: page.parent,
      properties: page.properties || {},
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived || false,
      in_trash: page.in_trash || false
    };
  }

  private formatDatabase(database: any): NotionDatabase {
    return {
      id: database.id,
      title: this.extractTitle(database.title),
      description: database.description || '',
      icon: database.icon,
      cover: database.cover,
      properties: database.properties || {},
      parent: database.parent,
      url: database.url,
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
      archived: database.archived || false,
      in_trash: database.in_trash || false
    };
  }

  private extractTitle(properties: any): string {
    if (Array.isArray(properties)) {
      return properties.map(item => item.plain_text).join('');
    }

    for (const value of Object.values(properties)) {
      const prop = value as any;
      if (prop.type === 'title' && prop.title) {
        return prop.title.map((item: any) => item.plain_text).join('');
      }
    }

    return 'Untitled';
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
