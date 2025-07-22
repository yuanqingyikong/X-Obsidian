# X-Obsidian

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> 一个功能丰富的 Obsidian 插件，集成了多种实用工具，帮助您更好地管理和展示笔记内容。

## 目录

- [背景](#背景)
- [安装](#安装)
- [使用方法](#使用方法)
  - [Halo 博客发布](#halo-博客发布)
  - [Banner 头图管理](#banner-头图管理)
  - [数据可视化](#数据可视化)
  - [图片上传](#图片上传)
- [配置](#配置)
- [维护者](#维护者)
- [贡献者](#贡献者)
- [鸣谢](#鸣谢)
- [许可证](#许可证)

## 背景

X-Obsidian是一个为 Obsidian 用户设计的多功能插件，旨在提供更丰富的笔记管理和展示功能。它集成了博客发布、头图管理、数据可视化和图片上传等多种实用工具，让您的笔记体验更加完善。

## 安装

1. 下载插件文件到 Obsidian 插件目录
2. 在 Obsidian 设置中启用「X-Obsidian」插件
3. 重启 Obsidian

## 使用方法

### Halo 博客发布

#### 基本发布
1. 打开要发布的 Markdown 文件
2. 使用命令面板（Ctrl/Cmd + P）搜索「发布到 Halo 博客」
3. 插件会自动解析文件内容并发布到您的博客

### Banner 头图管理

#### 添加头图
1. 在 frontmatter 中添加 `banner` 字段：
```yaml
---
banner: https://example.com/your-image.jpg
banner_x: 0.5  # 水平位置 (0-1)
banner_y: 0.3  # 垂直位置 (0-1)
banner_lock: false  # 是否锁定位置
---
```

2. 或使用命令「添加/更改 Banner」打开设置对话框

#### 移除头图
使用命令「移除 Banner」可快速移除当前文件的头图设置

### 数据可视化

#### 笔记卡片
在文档中插入代码块：
````markdown
```notecards
```
````

#### 活跃度热力图
在文档中插入代码块：
````markdown
```heatmap
```
````

### 图片上传

插件支持自动上传本地图片到又拍云存储，并替换文档中的本地图片链接为云存储链接。

1. 在插件设置中配置又拍云存储信息
2. 发布文章时，插件会自动上传文章中的本地图片

## 配置

### 笔记卡片设置
- **封面图片来源**：选择笔记卡片中封面显示的图片来源
- **封面图片尺寸**：设置笔记卡片中显示的封面图片尺寸
- **附件文件夹路径**：指定包含图片的附件文件夹路径

### 热力图设置
- **活跃度阈值**：设置不同活跃度等级的阈值
- **活跃度颜色**：设置不同活跃度等级的颜色

### Halo 博客设置
- **博客地址**：Halo 博客的完整 URL
- **访问令牌**：API 访问令牌
- **默认分类**：新文章的默认分类
- **默认标签**：新文章的默认标签
- **自动发布**：是否在上传后立即发布

### 图片上传设置
- **又拍云存储**：配置又拍云存储用于上传图片

### 高级设置
- **调试模式**：启用详细的调试信息输出
- **启用日志**：控制是否在控制台输出插件日志信息
- **日志级别**：设置日志输出的详细程度

## 维护者

[@yuanqingyikong](https://github.com/yuanqingyikong/)

## 贡献者

[@yuanqingyikong](https://github.com/yuanqingyikong)

## 鸣谢

- [Obsidian-Vue-Starter](https://github.com/Otto-J/Obsidian-Vue-Starter) - 基于 Vue 的 Obsidian 插件开发模板
- [纯前端实现又拍云文件上传-保姆级教程](https://juejin.cn/post/7276830135617601548) - 又拍云上传实现参考

## 许可证

[MIT](LICENSE) © yuanqingyikong
