# X-Obsidian Plugin

一个功能强大的 Obsidian 插件，支持将 Markdown 文档发布到 Halo 博客系统，并提供多种实用功能。

## 🚀 主要功能

- **Halo 博客发布**: 一键将 Obsidian 笔记发布到 Halo 博客
- **Vue 组件支持**: 基于 Vue 3 的现代化用户界面
- **热力图可视化**: 显示笔记活动热力图
- **卡片式笔记**: 美观的笔记卡片展示
- **智能缓存**: 避免重复发布，提升性能

## 📦 安装

1. 下载插件文件到 Obsidian 插件目录
2. 在 Obsidian 设置中启用插件
3. 配置 Halo 博客连接信息

## ⚙️ 配置

在插件设置中配置以下信息：
- **Halo 博客地址**: 完整的博客 URL（如：`https://blog.example.com`）
- **访问令牌**: 有效的 Halo API 访问令牌
- **自动发布**: 是否自动发布文章（默认为草稿）

## 📚 开发历史与修改记录

### 🔄 版本演进时间线

#### 第一阶段：基础功能开发 (2024年初)
**初始版本 - Vue 模板搭建**
- 基于 `obsidian-vue-starter` 模板创建项目
- 集成 Vue 3 + TypeScript 开发环境
- 建立基础的插件架构和构建流程

#### 第二阶段：Halo 集成开发 (2024年中期)
**v1.0 - 手动 API 调用实现**
- 实现基础的 Halo 博客发布功能
- 使用原生 `fetch` API 进行网络请求
- 基本的错误处理和用户反馈

#### 第三阶段：API 客户端升级 (2024年下半年)
**v2.0 - 官方 API 客户端集成** 📋 [详见 HALO_API_CLIENT_UPGRADE.md]

**主要改进：**
- 🔧 **依赖升级**: 集成 `@halo-dev/api-client` 和 `axios`
- 🛡️ **类型安全**: 使用官方 TypeScript 类型定义
- 🔄 **错误处理**: 统一的错误响应格式和智能重试机制
- 🚀 **性能优化**: 连接复用、请求超时、指数退避重试
- 🔐 **安全增强**: 安全的 Token 传递和用户代理标识

**技术实现：**
```typescript
// API 客户端初始化
this.axiosInstance = axios.create({
  baseURL: this.settings.haloUrl,
  headers: {
    'Authorization': `Bearer ${this.settings.haloToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Obsidian-Halo-Plugin/2.0.0'
  },
  timeout: 30000
});
```

#### 第四阶段：功能完善与优化 (2024年末)
**v3.0 - 全面功能改进** 📋 [详见 HALO_IMPROVEMENTS.md]

**核心改进：**
- 📝 **类型安全**: 完整的 TypeScript 类型定义体系
- 🔄 **智能重试**: 基于错误类型的重试策略（最大3次，指数退避）
- 📊 **缓存机制**: 基于内容哈希的变更检测，避免重复发布
- 📈 **日志系统**: 结构化日志记录，便于调试和监控
- 🎯 **用户体验**: 状态栏指示、发布进度通知、并发控制

**新增功能：**
- 发布历史记录管理
- 强制重新发布选项
- 智能 Slug 生成（支持中文）
- 可见性标准化处理

#### 第五阶段：发布流程重构 (最近)
**v4.0 - 发布机制优化** 📋 [详见 HALO_FIX_NOTES.md]

**问题解决：**
- 🐛 **内容丢失**: 修复文章发布后无内容的问题
- 🔧 **API 格式**: 修正 `draftPost` API 参数格式错误
- ⚡ **流程优化**: 从三步流程简化为一步完成

**发布流程演进：**

1. **第一版修复 - 三步流程**:
   ```
   创建草稿 → 上传内容 → 发布文章 (3个API调用)
   ```

2. **第二版优化 - 一步流程**:
   ```
   一次API调用完成所有操作 (1个API调用)
   ```

3. **第三版修复 - API格式修正**:
   ```typescript
   // 修复前（错误）
   const requestData = { post: postData, content: contentData };
   
   // 修复后（正确）
   const requestData = {
     postRequest: { post: postData, content: contentData }
   };
   ```

**性能提升对比：**
| 指标 | v1.0 | v2.0 | v3.0 | v4.0 |
|------|------|------|------|------|
| API调用次数 | 不确定 | 3次 | 3次 | 1次 |
| 网络延迟影响 | 高 | 中等 | 中等 | 低 |
| 失败概率 | 高 | 中等 | 低 | 极低 |
| 发布速度 | 慢 | 中等 | 快 | 快 |
| 错误处理 | 差 | 好 | 优秀 | 优秀 |

### 🛠️ 技术栈演进

**前端技术：**
- Vue 3 + TypeScript
- Vite 构建工具
- ESLint + Prettier 代码规范

**后端集成：**
- Halo API v1alpha1
- @halo-dev/api-client 官方客户端
- Axios HTTP 客户端

**开发工具：**
- TypeScript 严格模式
- Vue TSC 类型检查
- 自动化构建流程

## 🔧 开发指南

### 环境要求
- Node.js 18+
- pnpm 8.15.4+
- Obsidian 最新版本

### 本地开发
```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm run dev

# 构建生产版本
pnpm run build

# 类型检查
pnpm run type-check

# 代码格式化
pnpm run format
```

### 项目结构
```
src/
├── starterIndex.ts          # 主插件文件
├── ui/                      # Vue 组件
│   ├── settings.vue         # 设置界面
│   ├── modal.vue           # 模态框组件
│   └── ...
├── processors/             # 内容处理器
│   ├── heatMapProcessor.ts  # 热力图处理
│   └── noteCardsProcessor.ts # 卡片处理
└── styles/                 # 样式文件
```

## 📖 使用说明

### 基本发布
1. 打开要发布的 Markdown 文件
2. 使用命令面板执行 `发布到 Halo 博客`
3. 插件自动检查内容变更，避免重复发布

### 强制发布
1. 使用命令 `强制重新发布到 Halo 博客`
2. 忽略缓存检查，强制重新发布

### 状态监控
- 查看状态栏的发布状态指示
- 观察通知消息了解发布进度
- 检查控制台日志获取详细信息

## 🐛 故障排除

### 常见问题
1. **发布失败**: 检查 Halo URL 和 Token 配置
2. **内容为空**: 确保使用最新版本（已修复）
3. **网络错误**: 检查网络连接和防火墙设置
4. **权限错误**: 确保 Token 具有发布文章的权限

### 调试方法
1. 开启开发者工具查看控制台日志
2. 检查插件设置中的配置信息
3. 尝试使用强制发布功能
4. 查看 Halo 后台的错误日志

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发规范
- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 格式化代码
- 编写清晰的提交信息
- 添加必要的测试用例

## 📄 许可证

MIT License

## 🙏 致谢

- 感谢 Obsidian 社区的支持
- 感谢 Halo 团队提供的优秀博客系统
- 感谢所有贡献者和用户的反馈

---

**最后更新**: 2024年12月
**当前版本**: v4.0
**维护状态**: 积极维护中 ✅
