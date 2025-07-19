import { App, TFile } from 'obsidian';

interface NoteInfo {
  path: string;
  basename: string;
  excerpt: string;
  stat: {
    mtime: number;
  };
  frontmatter?: {
    tags?: string[];
  };
}

interface NoteCardsSettings {
  imageSource: string;
  attachmentFolderPath: string;
  imageApiUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export class NoteCardsProcessor {
  private app: App;
  private settings: NoteCardsSettings;
  private codeBlockRegex = /```notecards\n([\s\S]*?)\n```/g;
  private queryRegex = /query\s*:\s*(.+)/i;
  private sortRegex = /sort\s*:\s*(.+)/i;
  private limitRegex = /limit\s*:\s*(\d+)/i;
  private excludeRegex = /exclude\s*:\s*(.+)/i;

  constructor(app: App, settings: NoteCardsSettings) {
    this.app = app;
    this.settings = settings;
  }

  async processFile(file: TFile): Promise<{ notes: NoteInfo[]; settings: NoteCardsSettings }> {
    const content = await this.app.vault.read(file);
    const matches = Array.from(content.matchAll(this.codeBlockRegex));

    if (!matches.length) return { notes: [], settings: this.settings };

    // 处理第一个代码块
    const codeBlock = matches[0][1];
    const query = this.queryRegex.exec(codeBlock)?.[1] || '';
    const sort = this.sortRegex.exec(codeBlock)?.[1] || 'mtime desc';
    const limit = parseInt(this.limitRegex.exec(codeBlock)?.[1] || '50');
    const exclude = this.excludeRegex.exec(codeBlock)?.[1] || '';

    const notes = await this.queryNotes(query, sort, limit, exclude);
    return { notes, settings: this.settings };
  }

  private async queryNotes(query: string, sort: string, limit: number, exclude: string): Promise<NoteInfo[]> {
    const files = this.app.vault.getMarkdownFiles();
    const notePromises = files.map(async (file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const excerpt = await this.getExcerpt(file);
      
      return {
        path: file.path,
        basename: file.basename,
        excerpt,
        stat: file.stat,
        frontmatter
      };
    });

    let notes = await Promise.all(notePromises);

    // 应用排除过滤
    if (exclude) {
      const excludeLower = exclude.toLowerCase();
      notes = notes.filter(note => {
        const matchesExclude = 
          note.basename.toLowerCase().includes(excludeLower) ||
          note.excerpt.toLowerCase().includes(excludeLower) ||
          note.frontmatter?.tags?.some(tag => tag.toLowerCase().includes(excludeLower));
        return !matchesExclude;
      });
    }

    // 应用查询过滤
    if (query) {
      const queryLower = query.toLowerCase();
      notes = notes.filter(note => 
        note.basename.toLowerCase().includes(queryLower) ||
        note.excerpt.toLowerCase().includes(queryLower) ||
        note.frontmatter?.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // 应用排序
    const [field, order] = sort.toLowerCase().split(' ');
    notes.sort((a: any, b: any) => {
      let aVal = field === 'mtime' ? a.stat.mtime : a[field];
      let bVal = field === 'mtime' ? b.stat.mtime : b[field];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (order === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    // 应用限制
    return notes.slice(0, limit);
  }

  private async getExcerpt(file: TFile): Promise<string> {
    const content = await this.app.vault.read(file);
    const excerpt = content.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .slice(0, 2)
      .join('\n');
    return excerpt.length > 100 ? excerpt.slice(0, 100) + '...' : excerpt;
  }
}