# Halo API客户端升级说明

## 概述

本次更新将Obsidian Halo插件从手动`fetch`请求升级为使用官方的`@halo-dev/api-client`库，提供更好的类型安全、错误处理和API兼容性。

## 主要改进

### 1. 官方API客户端集成

- **新增依赖**: `@halo-dev/api-client` 和 `axios`
- **类型安全**: 使用官方提供的TypeScript类型定义
- **API兼容性**: 确保与Halo博客系统的完全兼容
- **自动化处理**: 自动处理请求头、认证和错误响应

### 2. 改进的错误处理

- **统一错误格式**: 所有API响应使用`{success: boolean, data?: any, error?: string}`格式
- **详细错误日志**: 包含HTTP状态码、URL和详细错误信息
- **智能重试机制**: 基于错误类型的智能重试策略

### 3. 增强的请求/响应拦截

- **请求拦截器**: 自动添加认证头和用户代理
- **响应拦截器**: 统一处理API响应和错误
- **调试日志**: 详细的API请求和响应日志

### 4. 配置管理优化

- **动态初始化**: 设置更新时自动重新初始化API客户端
- **配置验证**: 增强的Halo配置验证
- **超时设置**: 30秒请求超时，避免长时间等待

## 技术实现

### API客户端初始化

```typescript
// 创建axios实例
this.axiosInstance = axios.create({
  baseURL: this.settings.haloUrl.replace(/\/$/, ''),
  headers: {
    'Authorization': `Bearer ${this.settings.haloToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Obsidian-Halo-Plugin/2.0.0'
  },
  timeout: 30000
});

// 创建API客户端
this.coreApiClient = createCoreApiClient(this.axiosInstance);
this.consoleApiClient = createConsoleApiClient(this.axiosInstance);
```

### 文章发布流程

1. **创建文章**: 使用`consoleApiClient.post.createPost()`
2. **上传内容**: 使用`consoleApiClient.post.updatePostContent()`
3. **错误处理**: 自动重试和详细错误报告

### 请求拦截器

- 自动添加认证头
- 记录API请求日志
- 统一错误处理

### 响应拦截器

- 记录API响应状态
- 解析错误信息
- 提供详细的调试信息

## 兼容性说明

### 向后兼容

- 保持原有的插件配置格式
- 保持原有的用户界面
- 保持原有的发布流程

### API变更

- 内部API调用方式完全重构
- 使用官方API端点和数据格式
- 改进的错误响应格式

## 性能优化

### 网络请求

- **连接复用**: axios实例复用HTTP连接
- **请求超时**: 30秒超时避免无限等待
- **智能重试**: 仅对可重试错误进行重试

### 错误处理

- **指数退避**: 重试间隔逐渐增加
- **错误分类**: 区分网络错误和业务错误
- **详细日志**: 便于问题诊断和调试

## 安全性改进

### 认证处理

- **安全的Token传递**: 通过HTTP头传递认证信息
- **用户代理标识**: 明确标识请求来源
- **配置验证**: 增强的Token格式验证

### 错误信息

- **敏感信息保护**: 避免在日志中暴露敏感信息
- **详细调试**: 开发模式下提供详细错误信息
- **用户友好**: 向用户显示简化的错误信息

## 使用说明

### 配置要求

1. **Halo博客地址**: 完整的博客URL（如：`https://blog.example.com`）
2. **访问令牌**: 有效的Halo API访问令牌
3. **网络连接**: 确保能够访问Halo博客API

### 发布流程

1. 在Obsidian中打开Markdown文件
2. 使用命令面板执行"发布到Halo博客"
3. 插件自动处理文章创建和内容上传
4. 查看状态栏获取发布状态

### 故障排除

1. **检查配置**: 确保Halo URL和Token正确
2. **查看日志**: 开启调试模式查看详细日志
3. **网络连接**: 确保能够访问Halo博客
4. **API权限**: 确保Token具有发布文章的权限

## 未来规划

### 功能扩展

- 支持更多Halo API功能
- 文章编辑和删除功能
- 批量发布功能
- 媒体文件上传支持

### 性能优化

- 请求缓存机制
- 并发请求控制
- 离线模式支持

### 用户体验

- 可视化发布进度
- 更丰富的错误提示
- 发布历史管理界面

---

**注意**: 本次升级需要重新安装依赖包。如果遇到问题，请检查网络连接和Halo博客配置。