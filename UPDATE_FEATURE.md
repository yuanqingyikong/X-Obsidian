# 更新发布功能实现文档

## 功能概述

更新发布功能允许用户在文章已经发布到Halo博客后，再次发布同一篇文章时，系统会自动：
1. 检测到文章已经发布过（通过frontmatter中的haloPostId字段）
2. 先删除Halo上的旧文章（将其移至回收站）
3. 使用新内容重新发布文章
4. 在UI和日志中区分「首次发布」和「更新发布」

## 实现细节

### 1. 添加删除文章API方法

添加了`recycleHaloPost`方法，用于将文章移至回收站：

```typescript
/**
 * 删除Halo文章（移至回收站）
 * @param name 文章名称（metadata.name）
 * @returns 删除结果
 */
private async recycleHaloPost(name: string): Promise<{success: boolean, error?: string}> {
  try {
    // 最多重试3次
    for (let i = 0; i < 3; i++) {
      try {
        const response = await this.apiClient.put(
          `/apis/api.console.halo.run/v1alpha1/posts/${name}/recycle`
        );
        return { success: true };
      } catch (error) {
        // 如果是可重试的错误，且不是最后一次尝试，则继续重试
        if (this.isRetryable(error) && i < 2) {
          await this.sleep(1000 * (i + 1)); // 指数退避
          continue;
        }
        throw error;
      }
    }
    return { success: true };
  } catch (error) {
    this.logger.error('删除Halo文章失败', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
```

### 2. 修改发布逻辑

在`publishMarkdownFile`方法中，增加了检查文章是否已发布的逻辑：

```typescript
// 检查是否为更新操作
let isUpdate = !!frontmatter.haloPostId;
if (isUpdate) {
  this.updateStatusBar('更新中...');
  notice.setMessage('正在更新 Halo 博客文章...');
}

// ...

// 从frontmatter中获取之前发布的文章ID
const previousPostId = frontmatter.haloPostId;

if (previousPostId) {
  this.logger.info(`检测到文章已发布过，ID: ${previousPostId}，准备更新`);
  
  // 先删除旧文章
  const recycleResponse = await this.recycleHaloPost(previousPostId);
  if (!recycleResponse.success) {
    this.logger.warn(`删除旧文章失败: ${recycleResponse.error}，将尝试直接创建新文章`);
    // 如果删除失败，将其视为新发布而非更新
    isUpdate = false;
  } else {
    this.logger.info(`旧文章删除成功，准备重新发布`);
    // 等待一小段时间确保删除操作完成
    await this.sleep(1000);
  }
}
```

### 3. 更新UI和通知

根据是否为更新操作，显示不同的状态栏和通知信息：

```typescript
notice.hide();
this.updateStatusBar(isUpdate ? '更新成功' : '发布成功');
new Notice(isUpdate ? '文章已成功更新到 Halo 博客！' : '文章已成功发布到 Halo 博客！');
this.logger.info(`文章${isUpdate ? '更新' : '发布'}完成: ${postName}`);
```

### 4. 更新发布历史记录

在`PublishHistory`接口中添加了`isUpdate`字段，用于区分首次发布和更新发布：

```typescript
interface PublishHistory {
  fileName: string;
  postName: string;
  publishTime: string;
  success: boolean;
  error?: string;
  isUpdate?: boolean;
}
```

在记录发布历史时，添加了`isUpdate`字段：

```typescript
// 记录发布历史
this.addToPublishHistory({
  fileName: file.name,
  postName: postName,
  publishTime: new Date().toISOString(),
  success: true,
  isUpdate: isUpdate
});
```

## 使用方法

用户无需进行任何额外操作，插件会自动检测文章是否已发布过：

1. 首次发布：正常发布文章，发布成功后frontmatter中会自动添加`haloPostId`字段
2. 再次发布：插件检测到frontmatter中有`haloPostId`字段，会先删除旧文章，再重新发布

## 注意事项

1. 如果删除旧文章失败，插件会尝试直接创建新文章，但可能会导致Halo博客中出现重复文章
2. 更新发布功能依赖于frontmatter中的`haloPostId`字段，请勿手动修改此字段
3. 删除操作是将文章移至回收站，而非永久删除，可以在Halo管理后台的回收站中找到被删除的文章