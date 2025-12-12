# 📸 Photo App

一个追求极致交互体验的现代照片管理应用，基于 React Native (Expo) 构建。

## ✨ 特性

本项目包含丰富的交互功能和视觉优化：

### 核心体验
- **多视图切换**：支持瀑布流、卡片视图、分组视图三种浏览模式
- **全屏浏览**：支持手势缩放、滑动切换、双击放大
- **沉浸式交互**：下拉刷新、长按菜单、批量选择模式

### 功能扩展
- **收藏系统**：本地收藏夹功能
- **幻灯片播放**：自动播放照片幻灯片
- **照片详情**：查看 EXIF 信息及详细数据
- **数据管理**：支持数据备份与恢复
- **隐私权限**：完善的权限申请与引导

### 性能与工程化
- **性能优化**：图片预加载、骨架屏加载状态、性能监控面板
- **主题系统**：支持明/暗色模式切换
- **健壮性**：全局错误边界 (Error Boundary)、空状态处理

## 🛠 技术栈

- **框架**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/)
- **路由**: [Expo Router](https://docs.expo.dev/router/introduction)
- **动画**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- ** UI **: Expo Blur, Linear Gradient, Vector Icons

## 🚀 快速开始

### 1. 安装依赖

推荐使用 pnpm：

```bash
pnpm install
```

### 2. 运行应用

```bash
pnpm start
```

运行后可选择：
- 按 `s` 切换到 Expo Go（推荐真机调试）
- 按 `a` 运行 Android 模拟器
- 按 `i` 运行 iOS 模拟器

## 📱 功能入口

- **视图切换**：应用底部导航栏可切换不同视图模式
- **高级设置**：点击设置图标进入，包含主题切换、幻灯片、备份导出等功能

## 📂 目录结构

- `app/`: 应用页面与路由
- `components/`: UI 组件库
- `constants/`: 常量定义
- `contexts/`: 全局状态上下文
- `hooks/`: 自定义 Hooks
- `services/`: 业务逻辑服务
- `utils/`: 工具函数
