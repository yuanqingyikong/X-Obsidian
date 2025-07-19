import { App, Modal, Plugin, PluginSettingTab, TFile, MarkdownView, MarkdownPostProcessorContext, Notice, Setting } from "obsidian";
import { createApp, type App as VueApp } from "vue";
import SettingsPage from "./ui/settings.vue";
import ModalPage from "./ui/modal.vue";
import NoteCards from "./ui/note-cards.vue";
import HeatMap from "./ui/heat-map.vue";
import Banners from "./ui/banners.vue";
import { NoteCardsProcessor } from "./processors/noteCardsProcessor";
import { createCoreApiClient, createConsoleApiClient } from '@halo-dev/api-client';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import "./styles/obsidian-overrides.css";

// Halo API 相关类型定义
interface HaloPost {
  apiVersion: string;
  kind: string;
  metadata: {
    generateName?: string;
    name?: string;
  };
  spec: {
    title: string;
    slug: string;
    template?: string;
    cover?: string;
    deleted: boolean;
    publish: boolean;
    publishTime?: string;
    pinned: boolean;
    allowComment: boolean;
    visible: 'PUBLIC' | 'INTERNAL' | 'PRIVATE';
    priority: number;
    excerpt: {
      autoGenerate: boolean;
      raw: string;
    };
    categories?: string[];
    tags?: string[];
  };
}

interface HaloContent {
  raw: string;
  content: string;
  rawType: 'markdown' | 'html' | 'RICHTEXT';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PublishHistory {
  fileName: string;
  postName: string;
  publishTime: string;
  success: boolean;
  error?: string;
}

interface MyPluginSettings {
  imageSource: string;
  attachmentFolderPath: string;
  imageApiUrl: string;
  imageWidth: number;
  imageHeight: number;
  // 热力图设置
  heatMapThresholds: number[];
  heatMapColors: string[];
  // Halo博客设置
  haloUrl: string;
  haloToken: string;
  haloDefaultCategory: string;
  haloDefaultTags: string[];
  haloAutoPublish: boolean;
  // 发布历史
  publishHistory: PublishHistory[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  imageSource: 'none',
  attachmentFolderPath: '',
  imageApiUrl: '',
  imageWidth: 200,
  imageHeight: 200,
  // 热力图默认设置
  heatMapThresholds: [0, 2, 4, 6, 8], // 活跃度阈值：0次、1-2次、3-4次、5-6次、7-8次、9次以上
  heatMapColors: [
    '#ebedf0', // level-0 (浅灰色，替代CSS变量)
    '#9be9a8', // level-1
    '#40c463', // level-2
    '#30a14e', // level-3
    '#216e39'  // level-4
  ],
  // Halo博客默认设置
  haloUrl: '',
  haloToken: '',
  haloDefaultCategory: '',
  haloDefaultTags: [],
  haloAutoPublish: false,
  publishHistory: []
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  private statusBarItemEl: HTMLElement;
  processor: NoteCardsProcessor;
  private logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
  private publishCache: Map<string, { hash: string; timestamp: number }> = new Map();
  private isPublishing: boolean = false;
  private coreApiClient: any = null;
  private consoleApiClient: any = null;

  async onload() {
    // 初始化日志系统
    this.logger = {
      info: (message: string, ...args: any[]) => console.log(`[Halo Plugin] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[Halo Plugin] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[Halo Plugin] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[Halo Plugin] ${message}`, ...args)
    };
    
    await this.loadSettings();
    
    // 初始化API客户端
    this.initializeApiClients();
    
    // 添加状态栏项目
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar('Ready');
    
    // 将 HaloConfigModal 暴露到全局对象，供 Vue 组件使用
    (window as any).HaloConfigModal = HaloConfigModal;
    
    this.addSettingTab(new SampleSettingTab(this.app, this));
    this.processor = new NoteCardsProcessor(this.app, this.settings);

    // 注册笔记卡片代码块处理器
    this.registerMarkdownCodeBlockProcessor('notecards', async (source, el, ctx) => {
      const file = this.app.workspace.getActiveFile();
      if (!file) return;

      const _app = createApp(NoteCards, {
        app: this.app,
        file: file,
        settings: this.settings
      });
      _app.mount(el);

      ctx.addChild({
        onunload: () => {
          _app.unmount();
        }
      });
    });

    // 注册热力图代码块处理器
    this.registerMarkdownCodeBlockProcessor('heatmap', async (source, el, ctx) => {
      const _app = createApp(HeatMap, {
        app: this.app,
        settings: this.settings
      });
      _app.mount(el);

      ctx.addChild({
        onunload: () => {
          _app.unmount();
        }
      });
    });

    // 注册头图后处理器 - 在每个笔记顶部添加banner
    this.registerMarkdownPostProcessor((el, ctx) => {
      const file = ctx.sourcePath ? this.app.vault.getAbstractFileByPath(ctx.sourcePath) : null;
      if (!file || !(file instanceof TFile)) return;

      // 只在第一个处理器调用时处理banner，避免重复
      if (el.parentElement && !el.parentElement.classList.contains('markdown-preview-view')) return;
      
      // 查找或获取markdown预览容器
      let previewContainer = el.closest('.markdown-preview-view');
      if (!previewContainer) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file === file) {
          previewContainer = activeView.previewMode.containerEl.querySelector('.markdown-preview-view');
        }
      }
      if (!previewContainer) return;

      // 使用更严格的重复检查
      const existingBanner = previewContainer.querySelector('.pixel-banner-container');
      if (existingBanner) return;

      // 获取文件的frontmatter
      this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (frontmatter.banner) {
          // 再次检查，防止异步处理时的竞态条件
          if (previewContainer.querySelector('.pixel-banner-container')) return;
          
          // 创建banner容器
          const bannerContainer = previewContainer.createDiv({ cls: 'pixel-banner-container' });
          
          // 将banner容器插入到预览容器的最前面
          previewContainer.insertBefore(bannerContainer, previewContainer.firstChild);

          const _app = createApp(Banners, {
            app: this.app,
            file: file,
            plugin: this,
            bannerData: {
              banner: frontmatter.banner,
              banner_x: frontmatter.banner_x || 0.5,
              banner_y: frontmatter.banner_y || 0.5,
              banner_lock: frontmatter.banner_lock || false
            }
          });
          _app.mount(bannerContainer);

          ctx.addChild({
            onunload: () => {
              _app.unmount();
            }
          });
        }
      });
    });

    // 添加命令：添加/更改banner
    this.addCommand({
      id: 'add-change-banner',
      name: '添加/更改 Banner',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          new BannerModal(this.app, this, activeFile).open();
        }
      }
    });

    // 添加命令：移除banner
    this.addCommand({
      id: 'remove-banner',
      name: '移除 Banner',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          this.removeBanner(activeFile);
        }
      }
    });

    // 添加命令：发布到Halo
    this.addCommand({
      id: 'publish-to-halo',
      name: '发布到 Halo 博客',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          this.publishToHalo(activeFile);
        } else {
          new Notice('请选择一个 Markdown 文件');
        }
      }
    });

    this.addCommand({
      id: 'force-publish-to-halo',
      name: '强制重新发布到 Halo 博客',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          this.publishToHalo(activeFile, true); // 强制发布
        } else {
          new Notice('请选择一个 Markdown 文件');
        }
      }
    });
  }

  onunload() {}

  async removeBanner(file: TFile) {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      delete frontmatter.banner;
      delete frontmatter.banner_x;
      delete frontmatter.banner_y;
      delete frontmatter.banner_lock;
    });
    
    // 刷新当前视图
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.file === file) {
      activeView.previewMode.rerender(true);
    }
  }

  async publishToHalo(file: TFile, forcePublish: boolean = false) {
    // 验证Halo配置
    const configValidation = this.validateHaloConfig();
    if (!configValidation.valid) {
      new Notice(`配置错误: ${configValidation.errors.join(', ')}`);
      new HaloConfigModal(this.app, this).open();
      return;
    }

    try {
      // 读取文件内容
      const content = await this.app.vault.read(file);
      
      // 检查是否需要重新发布（除非强制发布）
      if (!forcePublish && !this.shouldRepublish(file, content)) {
        new Notice('文章内容未发生变化，跳过发布。使用"强制重新发布"命令可忽略此检查。');
        return;
      }

      // 检查是否正在发布
      if (this.isPublishing) {
        new Notice('正在发布中，请稍候...');
        return;
      }

      // 显示发布进度
      this.isPublishing = true;
      this.updateStatusBar('发布中...');
      this.logger.info(`开始发布文章: ${file.name}`);
      
      let notice: Notice;
      
      try {
        notice = new Notice('正在发布到 Halo 博客...', 0);
        
        const { frontmatter, content: markdownContent } = this.parseFrontmatter(content);
      
        // 准备文章数据 - 符合 Halo API 规范
      const postData: HaloPost = {
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Post',
        metadata: {
          generateName: 'post-',
          annotations: {
            'content.halo.run/preferred-editor': 'bytemd'
          }
        },
        spec: {
          title: frontmatter.title || file.basename,
          slug: frontmatter.slug || this.generateSlug(file.basename),
          template: '',
          cover: frontmatter.banner || '',
          deleted: false,
          publish: this.settings.haloAutoPublish,
          publishTime: frontmatter.publishTime || new Date().toISOString(),
          pinned: frontmatter.pinned || false,
          allowComment: frontmatter.allowComment !== false,
          visible: this.normalizeVisibility(frontmatter.visible),
          priority: frontmatter.priority || 0,
          excerpt: {
            autoGenerate: true,
            raw: frontmatter.excerpt || ''
          },
          categories: this.getCategories(frontmatter),
          tags: this.getTags(frontmatter)
        }
      };

      // 发送到Halo
      const response = await this.sendToHalo(postData);
      
      if (response.success && response.data?.metadata?.name) {
        // 创建文章内容
        const contentData: HaloContent = {
          raw: markdownContent,
          content: markdownContent,
          rawType: 'markdown'
        };
        
        const contentResponse = await this.sendContentToHalo(response.data.metadata.name, contentData);
        if (!contentResponse.success) {
          this.logger.error('内容上传失败:', contentResponse.error);
          throw new Error(`内容上传失败: ${contentResponse.error}`);
        }
        
        // 如果设置了自动发布且当前是草稿状态，则发布文章
        if (this.settings.haloAutoPublish && !postData.spec.publish) {
          const publishResponse = await this.consoleApiClient.content.post.publishPost({
            name: response.data.metadata.name
          });
          if (!publishResponse?.data) {
            this.logger.warn('文章发布失败，但内容已保存');
          } else {
            this.logger.info(`文章发布成功: ${publishResponse.data.metadata?.name}`);
            // 更新response为发布后的数据
            response.data = publishResponse.data;
          }
        }
      }
      
      if (response.success) {
        // 更新发布缓存
        this.updatePublishCache(file, content);
        
        // 记录发布历史
        this.addToPublishHistory({
          fileName: file.name,
          postName: response.data?.metadata?.name || '',
          publishTime: new Date().toISOString(),
          success: true
        });
        
        // 更新frontmatter，记录发布信息
        await this.app.fileManager.processFrontMatter(file, (fm) => {
          fm.haloPublished = true;
          fm.haloPublishTime = new Date().toISOString();
          if (response.data?.metadata?.name) {
            fm.haloPostId = response.data.metadata.name;
            fm.haloPostUrl = `${this.settings.haloUrl}/archives/${response.data.spec?.slug || response.data.metadata.name}`;
          }
        });
        
        notice.hide();
        this.updateStatusBar('发布成功');
        new Notice('文章已成功发布到 Halo 博客！');
        this.logger.info(`文章发布成功: ${response.data?.metadata?.name}`);
        
        // 3秒后清除状态
        setTimeout(() => this.updateStatusBar(''), 3000);
      } else {
        throw new Error(response.error || '发布失败');
      }
    } catch (error) {
        this.logger.error('发布到Halo失败:', error);
        if (notice) {
          notice.hide();
        }
        this.updateStatusBar('发布失败');
        new Notice(`发布失败: ${error.message}`);
        
        // 记录失败的发布历史
        this.addToPublishHistory({
          fileName: file.name,
          postName: '',
          publishTime: new Date().toISOString(),
          success: false,
          error: error.message
        });
        
        // 3秒后清除状态
        setTimeout(() => this.updateStatusBar(''), 3000);
      } finally {
        this.isPublishing = false;
      }
    } catch (error) {
      this.logger.error('发布过程中发生错误:', error);
      this.isPublishing = false;
      this.updateStatusBar('发布失败');
      new Notice(`发布失败: ${error.message}`);
    }
  }

  private parseFrontmatter(content: string): { frontmatter: any, content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        // 简单的YAML解析（仅支持基本格式）
        const frontmatterText = match[1];
        const frontmatter: any = {};
        
        frontmatterText.split('\n').forEach(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            // 处理不同类型的值
            if (value === 'true') {
              frontmatter[key] = true;
            } else if (value === 'false') {
              frontmatter[key] = false;
            } else if (!isNaN(Number(value)) && value !== '') {
              frontmatter[key] = Number(value);
            } else {
              frontmatter[key] = value.replace(/^["']|["']$/g, ''); // 移除引号
            }
          }
        });
        
        return { frontmatter, content: match[2] };
      } catch (error) {
        console.warn('解析frontmatter失败:', error);
      }
    }
    
    return { frontmatter: {}, content };
  }

  private getCategories(frontmatter: any): string[] {
    if (frontmatter.categories) {
      return Array.isArray(frontmatter.categories) ? frontmatter.categories : [frontmatter.categories];
    }
    if (frontmatter.category) {
      return [frontmatter.category];
    }
    return this.settings.haloDefaultCategory ? [this.settings.haloDefaultCategory] : [];
  }

  private getTags(frontmatter: any): string[] {
    if (frontmatter.tags) {
      return Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
    }
    if (frontmatter.tag) {
      return Array.isArray(frontmatter.tag) ? frontmatter.tag : [frontmatter.tag];
    }
    return this.settings.haloDefaultTags || [];
  }

  private async sendToHalo(postData: HaloPost): Promise<ApiResponse> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1秒基础延迟
    
    this.logger.debug(`开始发送文章到Halo: ${postData.spec.title}`);
    
    if (!this.consoleApiClient) {
      this.logger.error('Console API客户端未初始化');
      return { success: false, error: 'API客户端未初始化' };
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.info(`重试发送文章 (第${attempt}次尝试)`);
        }
        
        // 创建草稿文章（不立即发布）
        const draftPostData = { ...postData };
        draftPostData.spec.publish = false; // 强制创建为草稿
        
        const draftData = await this.consoleApiClient.content.post.draftPost({
          postRequest: {
            post: draftPostData
          }
        });

        this.logger.info(`草稿创建成功: ${draftData?.data?.metadata?.name}`);
        
        return { success: true, data: draftData?.data };
      } catch (error) {
        this.logger.error(`文章创建异常 (尝试 ${attempt}/${maxRetries}):`, error);
        
        // 如果是网络错误且未达到最大重试次数，继续重试
        if (attempt < maxRetries && this.isNetworkError(error)) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`等待 ${delay}ms 后重试`);
          await this.sleep(delay);
          continue;
        }
        
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: '达到最大重试次数' };
  }

  private async sendContentToHalo(postName: string, contentData: HaloContent): Promise<ApiResponse> {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    this.logger.debug(`开始发送文章内容: ${postName}`);
    
    if (!this.consoleApiClient) {
      this.logger.error('Console API客户端未初始化');
      return { success: false, error: 'API客户端未初始化' };
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.info(`重试发送内容 (第${attempt}次尝试)`);
        }
        
        // 使用官方API客户端更新文章内容
        const data = await this.consoleApiClient.content.post.updatePostContent({
          name: postName,
          content: contentData
        });

        this.logger.info(`内容上传成功: ${postName}`);
        return { success: true, data };
      } catch (error) {
        this.logger.error(`内容上传异常 (尝试 ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries && this.isNetworkError(error)) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`等待 ${delay}ms 后重试内容发送`);
          await this.sleep(delay);
          continue;
        }
        
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: '达到最大重试次数' };
  }

  // 辅助方法：判断是否为可重试的HTTP错误
  private isRetryableError(status: number): boolean {
    // 5xx 服务器错误通常可以重试
    // 429 速率限制可以重试
    // 408 请求超时可以重试
    return status >= 500 || status === 429 || status === 408;
  }

  // 辅助方法：判断是否为网络错误
  private isNetworkError(error: any): boolean {
    return error instanceof TypeError && 
           (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('Failed to fetch'));
  }

  // 辅助方法：延迟执行
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 验证 Halo 配置
  private validateHaloConfig(): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    if (!this.settings.haloUrl) {
      errors.push('Halo 博客地址不能为空');
    } else if (!this.isValidUrl(this.settings.haloUrl)) {
      errors.push('Halo 博客地址格式不正确');
    }
    
    if (!this.settings.haloToken) {
      errors.push('访问令牌不能为空');
    } else if (this.settings.haloToken.length < 10) {
      errors.push('访问令牌格式可能无效（长度过短）');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // 生成文件内容哈希
  private generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 检查是否需要重新发布
  private shouldRepublish(file: TFile, content: string): boolean {
    const cacheKey = file.path;
    const contentHash = this.generateContentHash(content);
    const cached = this.publishCache.get(cacheKey);
    
    if (!cached) {
      return true; // 首次发布
    }
    
    // 检查内容是否有变化
    if (cached.hash !== contentHash) {
      return true; // 内容已更改
    }
    
    // 检查是否超过缓存时间（24小时）
    const cacheExpiry = 24 * 60 * 60 * 1000; // 24小时
    if (Date.now() - cached.timestamp > cacheExpiry) {
      return true; // 缓存过期
    }
    
    return false; // 无需重新发布
  }

  // 更新发布缓存
  private updatePublishCache(file: TFile, content: string): void {
    const cacheKey = file.path;
    const contentHash = this.generateContentHash(content);
    this.publishCache.set(cacheKey, {
      hash: contentHash,
      timestamp: Date.now()
    });
  }

  // 更新状态栏
  private updateStatusBar(text: string): void {
    if (this.statusBarItemEl) {
      this.statusBarItemEl.setText(text ? `Halo: ${text}` : 'Halo: Ready');
    }
  }

  // 添加发布历史记录
  private addToPublishHistory(record: PublishHistory): void {
    this.settings.publishHistory.unshift(record);
    // 只保留最近50条记录
    if (this.settings.publishHistory.length > 50) {
      this.settings.publishHistory = this.settings.publishHistory.slice(0, 50);
    }
    this.saveSettings();
  }

  // 获取发布历史
   getPublishHistory(): PublishHistory[] {
     return this.settings.publishHistory || [];
   }

   // 初始化API客户端
   private initializeApiClients(): void {
     if (!this.settings.haloUrl || !this.settings.haloToken) {
       this.logger.warn('Halo配置不完整，跳过API客户端初始化');
       return;
     }

     try {
       // 创建axios实例
       const axiosInstance = axios.create({
         baseURL: this.settings.haloUrl.replace(/\/$/, ''),
         headers: {
           'Authorization': `Bearer ${this.settings.haloToken}`,
           'Content-Type': 'application/json'
         },
         timeout: 30000
       });

       // 创建API客户端
       this.coreApiClient = createCoreApiClient(axiosInstance);
       this.consoleApiClient = createConsoleApiClient(axiosInstance);
       
       this.logger.info('API客户端初始化成功');
     } catch (error) {
       this.logger.error('API客户端初始化失败:', error);
     }
   }

  // 验证URL格式
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // 生成URL友好的slug
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // 支持中文字符
      .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
      .substring(0, 50); // 限制长度
  }

  // 标准化可见性设置
  private normalizeVisibility(visibility?: string): 'PUBLIC' | 'INTERNAL' | 'PRIVATE' {
    const normalized = (visibility || 'PUBLIC').toUpperCase();
    if (normalized === 'INTERNAL' || normalized === 'PRIVATE') {
      return normalized as 'INTERNAL' | 'PRIVATE';
    }
    return 'PUBLIC';
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
     await this.saveData(this.settings);
     // 重新初始化API客户端
     this.initializeApiClients();
   }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;
  private vueApp: VueApp | null = null;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    
    // 清理之前的Vue应用
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }
    
    // 清空容器
    containerEl.empty();
    
    // 创建新的Vue应用
    this.vueApp = createApp(SettingsPage, {
      plugin: this.plugin
    });
    this.vueApp.mount(containerEl);
  }

  hide(): void {
    // 清理Vue应用
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }
  }
}

class SampleModal extends Modal {
  plugin: Plugin;
  file: TFile;

  constructor(app: App, plugin: Plugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    const _app = createApp(ModalPage, {
      plugin: this.plugin,
      modal: this,
      file: this.file,
    });
    _app.mount(this.containerEl);
  }
}

class BannerModal extends Modal {
  plugin: MyPlugin;
  file: TFile;
  private vueApp: VueApp | null = null;

  constructor(app: App, plugin: MyPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    this.titleEl.setText('Banner 设置');
    
    this.vueApp = createApp(Banners, {
      app: this.app,
      file: this.file,
      plugin: this.plugin,
      modal: this,
      isModal: true
    });
    this.vueApp.mount(this.contentEl);
  }

  onClose() {
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }
  }

  async updateBanner(bannerData: any) {
    await this.plugin.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
      if (bannerData.banner) {
        frontmatter.banner = bannerData.banner;
        frontmatter.banner_x = bannerData.banner_x || 0.5;
        frontmatter.banner_y = bannerData.banner_y || 0.5;
        frontmatter.banner_lock = bannerData.banner_lock || false;
      }
    });
    
    // 刷新当前视图
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.file === this.file) {
      activeView.previewMode.rerender(true);
    }
    
    this.close();
  }
}

export class HaloConfigModal extends Modal {
  plugin: MyPlugin;
  private tempSettings: {
    haloUrl: string;
    haloToken: string;
    haloDefaultCategory: string;
    haloDefaultTags: string;
    haloAutoPublish: boolean;
  };

  constructor(app: App, plugin: MyPlugin) {
    super(app);
    this.plugin = plugin;
    this.tempSettings = {
      haloUrl: plugin.settings.haloUrl,
      haloToken: plugin.settings.haloToken,
      haloDefaultCategory: plugin.settings.haloDefaultCategory,
      haloDefaultTags: plugin.settings.haloDefaultTags.join(', '),
      haloAutoPublish: plugin.settings.haloAutoPublish
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Halo 博客配置' });
    contentEl.createEl('p', { 
      text: '请配置您的 Halo 博客连接信息。如果您还没有配置，请先在 Halo 后台开启 API 并获取访问令牌。',
      cls: 'setting-item-description'
    });

    // Halo URL 设置
    new Setting(contentEl)
      .setName('Halo 博客地址')
      .setDesc('您的 Halo 博客完整地址，例如：https://your-blog.com')
      .addText(text => text
        .setPlaceholder('https://your-blog.com')
        .setValue(this.tempSettings.haloUrl)
        .onChange(async (value) => {
          this.tempSettings.haloUrl = value.trim();
        }));

    // Halo Token 设置
    new Setting(contentEl)
      .setName('访问令牌')
      .setDesc('在 Halo 后台个人中心 > 个人令牌中创建的访问令牌')
      .addText(text => text
        .setPlaceholder('pat_xxxxxxxxxx')
        .setValue(this.tempSettings.haloToken)
        .onChange(async (value) => {
          this.tempSettings.haloToken = value.trim();
        }));

    // 默认分类设置
    new Setting(contentEl)
      .setName('默认分类')
      .setDesc('发布文章时的默认分类（可选）')
      .addText(text => text
        .setPlaceholder('技术分享')
        .setValue(this.tempSettings.haloDefaultCategory)
        .onChange(async (value) => {
          this.tempSettings.haloDefaultCategory = value.trim();
        }));

    // 默认标签设置
    new Setting(contentEl)
      .setName('默认标签')
      .setDesc('发布文章时的默认标签，多个标签用逗号分隔（可选）')
      .addText(text => text
        .setPlaceholder('Obsidian, 笔记')
        .setValue(this.tempSettings.haloDefaultTags)
        .onChange(async (value) => {
          this.tempSettings.haloDefaultTags = value;
        }));

    // 自动发布设置
    new Setting(contentEl)
      .setName('自动发布')
      .setDesc('是否在发布到 Halo 时自动公开文章')
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.haloAutoPublish)
        .onChange(async (value) => {
          this.tempSettings.haloAutoPublish = value;
        }));

    // 按钮区域
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    // 测试连接按钮
    const testButton = buttonContainer.createEl('button', { text: '测试连接' });
    testButton.onclick = async () => {
      await this.testConnection();
    };

    // 取消按钮
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.onclick = () => {
      this.close();
    };

    // 保存按钮
    const saveButton = buttonContainer.createEl('button', { text: '保存', cls: 'mod-cta' });
    saveButton.onclick = async () => {
      await this.saveSettings();
    };
  }

  async testConnection() {
    if (!this.tempSettings.haloUrl || !this.tempSettings.haloToken) {
      new Notice('请先填写 Halo 地址和访问令牌');
      return;
    }

    try {
      const url = `${this.tempSettings.haloUrl.replace(/\/$/, '')}/apis/content.halo.run/v1alpha1/posts?page=1&size=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tempSettings.haloToken}`
        }
      });

      if (response.ok) {
        new Notice('连接测试成功！');
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      new Notice(`连接测试失败: ${error.message}`);
    }
  }

  async saveSettings() {
    // 验证必填字段
    if (!this.tempSettings.haloUrl || !this.tempSettings.haloToken) {
      new Notice('请填写 Halo 地址和访问令牌');
      return;
    }

    // 保存设置
    this.plugin.settings.haloUrl = this.tempSettings.haloUrl;
    this.plugin.settings.haloToken = this.tempSettings.haloToken;
    this.plugin.settings.haloDefaultCategory = this.tempSettings.haloDefaultCategory;
    this.plugin.settings.haloDefaultTags = this.tempSettings.haloDefaultTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    this.plugin.settings.haloAutoPublish = this.tempSettings.haloAutoPublish;

    await this.plugin.saveSettings();
    new Notice('Halo 配置已保存');
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
