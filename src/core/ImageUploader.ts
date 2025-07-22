import * as crypto from 'crypto';
import { VaultAdapter } from 'obsidian';

// 日志接口定义
export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

// 图片对象接口
export interface ImageObject {
  buffer?: Buffer;
  base64Image?: string;
  fileName?: string;
  width?: number;
  height?: number;
  extname?: string;
  imgUrl?: string;
}

// 图片输入类型
export type ImageInput = string | Buffer | ImageObject;

// 上传器配置接口
export interface UploaderConfig {
  bucket: string;
  operator: string;
  password: string;
  domain: string;
  path?: string;
}

// 上传结果接口
export interface UploadResult {
  fileName: string;
  imgUrl: string;
  success: boolean;
  message?: string;
}

// 又拍云Policy接口
interface UpyunPolicy {
  bucket: string;
  'save-key': string;
  expiration: number;
}

// 图片上传核心类
export class ImageUploadCore {
  private config: UploaderConfig;
  private hooks: { [key: string]: Function[] } = {};
  private logger: Logger;

  constructor(config: UploaderConfig, logger?: Logger) {
    this.config = config;
    // 如果没有提供logger，使用默认的控制台日志
    this.logger = logger || {
      debug: (message: string, ...args: any[]) => console.debug(`[ImageUploader] ${message}`, ...args),
      info: (message: string, ...args: any[]) => console.log(`[ImageUploader] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[ImageUploader] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[ImageUploader] ${message}`, ...args)
    };
  }

  // 添加生命周期钩子
  addHook(event: string, callback: Function): void {
    if (!this.hooks[event]) {
      this.hooks[event] = [];
    }
    this.hooks[event].push(callback);
  }

  // 执行钩子
  private async executeHooks(event: string, data: any): Promise<any> {
    if (this.hooks[event]) {
      for (const hook of this.hooks[event]) {
        data = await hook(data);
      }
    }
    return data;
  }

  // 处理输入
  handleInput(input: ImageInput): ImageObject {
    if (typeof input === 'string') {
      return { base64Image: input };
    } else if (Buffer.isBuffer(input)) {
      return { buffer: input };
    } else {
      return input;
    }
  }

  // 转换图片对象
  transform(imageObj: ImageObject): ImageObject {
    if (imageObj.base64Image && !imageObj.buffer) {
      const base64Data = imageObj.base64Image.replace(/^data:image\/\w+;base64,/, '');
      imageObj.buffer = Buffer.from(base64Data, 'base64');
    }
    
    if (!imageObj.fileName) {
      imageObj.fileName = this.generateFileName();
    }
    
    return imageObj;
  }

  // 生成文件名
  generateFileName(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `image_${timestamp}_${random}.png`;
  }

  // MD5加密
  private md5(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  // HMAC-SHA1签名
  private hmacSha1(key: string, data: string): string {
    return crypto.createHmac('sha1', key).update(data).digest('base64');
  }

  // 生成Policy
  private generatePolicy(fileName: string): string {
    const saveKey = this.config.path ? `/${this.config.path}/${fileName}` : `/${fileName}`;
    
    const policyObj: UpyunPolicy = {
      bucket: this.config.bucket,
      'save-key': saveKey,
      expiration: Math.floor(Date.now() / 1000) + 600 // 10分钟过期
    };

    return Buffer.from(JSON.stringify(policyObj)).toString('base64');
  }

  // 生成Authorization签名
  private generateAuthorization(policy: string): string {
    // 密码转MD5
    const passwordMd5 = this.md5(this.config.password);
    
    // 构建签名字符串: Method&URI&Policy
    const method = 'POST';
    const uri = `/${this.config.bucket}`;
    const signString = [method, uri, policy].join('&');
    
    // HMAC-SHA1签名
    const signature = this.hmacSha1(passwordMd5, signString);
    
    return `UPYUN ${this.config.operator}:${signature}`;
  }

  // 使用FORM API上传到又拍云
  async uploadToUpyun(imageObj: ImageObject): Promise<UploadResult> {
    try {
      if (!imageObj.buffer) {
        throw new Error('No image buffer provided');
      }

      const fileName = imageObj.fileName!;
      
      // 生成policy和authorization
      const policy = this.generatePolicy(fileName);
      const authorization = this.generateAuthorization(policy);
      
      // 构建FormData
      const formData = new FormData();
      
      // 创建Blob对象
      const blob = new Blob([imageObj.buffer], { type: 'image/png' });
      formData.append('file', blob, fileName);
      formData.append('policy', policy);
      formData.append('authorization', authorization);

      this.logger.info('开始上传文件:', fileName);
      this.logger.debug('上传到bucket:', this.config.bucket);

      // 发送请求
      const response = await fetch(`https://v0.api.upyun.com/${this.config.bucket}`, {
        method: 'POST',
        body: formData,
        mode: 'cors' // 明确指定CORS模式
      });

      if (response.ok) {
        const result = await response.text();
        this.logger.debug('Upload response:', result);
        
        // 构建图片URL
        const uploadPath = this.config.path ? `/${this.config.path}/${fileName}` : `/${fileName}`;
        // 对文件名中的空格进行URL编码
        const encodedPath = uploadPath.replace(/ /g, '%20');
        const imgUrl = `${this.config.domain}${encodedPath}`;
        
        this.logger.info('上传成功，图片URL:', imgUrl);
        
        return {
          fileName: fileName,
          imgUrl: imgUrl,
          success: true
        };
      } else {
        const errorText = await response.text();
        this.logger.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      this.logger.error('Upload to Upyun failed:', error);
      
      // 如果是CORS错误，提供更友好的错误信息
      if (error instanceof Error && error.message.includes('CORS')) {
        return {
          fileName: imageObj.fileName || 'unknown',
          imgUrl: '',
          success: false,
          message: 'CORS错误：请检查又拍云配置或网络环境'
        };
      }
      
      return {
        fileName: imageObj.fileName || 'unknown',
        imgUrl: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 单个上传
  async upload(input: ImageInput): Promise<UploadResult> {
    let imageObj = this.handleInput(input);
    imageObj = await this.executeHooks('beforeTransform', imageObj);
    imageObj = this.transform(imageObj);
    imageObj = await this.executeHooks('beforeUpload', imageObj);
    
    const result = await this.uploadToUpyun(imageObj);
    
    await this.executeHooks('afterUpload', result);
    return result;
  }

  // 批量上传
  async uploadMultiple(inputs: ImageInput[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const input of inputs) {
      const result = await this.upload(input);
      results.push(result);
    }
    
    return results;
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      // 简单的配置验证
      if (!this.config.bucket || !this.config.operator || !this.config.password || !this.config.domain) {
        this.logger.error('又拍云配置不完整');
        return false;
      }

      // 创建一个小的测试图片进行实际上传测试
      const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      const testImage: ImageObject = {
        buffer: testBuffer,
        fileName: `test_${Date.now()}.png`,
        extname: '.png'
      };

      const result = await this.uploadToUpyun(testImage);
      
      if (result.success) {
        this.logger.info('又拍云连接测试成功，文件已经上传成功，不需要删除图片的方法');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }
  
  // 更新配置
  updateConfig(newConfig: UploaderConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

}


// 又拍云上传器类
export class UpyunUploader {
  private core: ImageUploadCore;
  private logger: Logger;

  constructor(config: UploaderConfig, logger?: Logger) {
    this.logger = logger || {
      debug: (message: string, ...args: any[]) => console.debug(`[UpyunUploader] ${message}`, ...args),
      info: (message: string, ...args: any[]) => console.log(`[UpyunUploader] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[UpyunUploader] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[UpyunUploader] ${message}`, ...args)
    };
    this.core = new ImageUploadCore(config, this.logger);
    this.setupHooks();
  }

  // 设置钩子
  private setupHooks(): void {
    this.core.addHook('beforeTransform', (imageObj: ImageObject) => {
      this.logger.debug('Before transform:', imageObj.fileName);
      return imageObj;
    });

    this.core.addHook('beforeUpload', (imageObj: ImageObject) => {
      this.logger.debug('Before upload:', imageObj.fileName);
      return imageObj;
    });

    this.core.addHook('afterUpload', (result: UploadResult) => {
      this.logger.info('After upload:', result.success ? 'Success' : 'Failed');
      return result;
    });
  }

  // 上传单个图片
  async upload(input: ImageInput): Promise<UploadResult> {
    return this.core.upload(input);
  }

  // 批量上传
  async uploadMultiple(inputs: ImageInput[]): Promise<UploadResult[]> {
    return this.core.uploadMultiple(inputs);
  }

  // 从路径上传
  async uploadFromPath(filePath: string, adapter: VaultAdapter): Promise<UploadResult> {
    try {
      // 检查路径是否包含重复的基础路径
      const basePath = adapter.getBasePath();
      let normalizedPath = filePath;
      
      // 如果路径中包含重复的基础路径，则移除一个
      if (normalizedPath.includes(basePath + basePath.substring(basePath.indexOf(':'), basePath.length))) {
        this.logger.debug('检测到路径重复，正在修正...');
        normalizedPath = normalizedPath.replace(basePath, '');
        this.logger.debug('修正后的路径:', normalizedPath);
      }
      
      // 使用 Node.js 的 fs 模块直接读取文件
      const fs = require('fs');
      const buffer = await fs.promises.readFile(normalizedPath);
      const fileName = normalizedPath.split(/[\\/]/).pop() || 'unknown';
      
      return this.upload({
        buffer: Buffer.from(buffer),
        fileName
      });
    } catch (error) {
      this.logger.error('Upload from path failed:', error);
      return {
        fileName: filePath,
        imgUrl: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 从Base64上传
  async uploadFromBase64(base64: string, fileName?: string): Promise<UploadResult> {
    return this.upload({
      base64Image: base64,
      fileName: fileName || this.core.generateFileName()
    });
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    return this.core.testConnection();
  }

  // 获取核心实例
  getClient(): ImageUploadCore {
    return this.core;
  }
  
  // 更新配置
  updateConfig(newConfig: UploaderConfig): void {
    this.core.updateConfig(newConfig);
  }

}