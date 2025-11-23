# 正则调试器 (Tavern Regex Debugger)

一个强大的正则表达式调试和测试工具，帮助开发者快速验证和优化正则表达式。

## 功能特性

- **AI 辅助调试**: 集成 AI 聊天功能，提供智能建议和解释
- **实时编辑**: 使用 Monaco 编辑器进行正则表达式和测试文本的编辑
- **规则可视化**: 显示正则表达式的解析规则和匹配结果
- **预览面板**: 实时预览匹配结果和分组信息
- **用户友好界面**: 现代化的 React 界面，支持拖拽和响应式设计

## 技术栈

- **前端框架**: React 19
- **构建工具**: Vite
- **语言**: TypeScript
- **编辑器**: Monaco Editor
- **AI 集成**: Google Generative AI
- **UI 组件**: Lucide React 图标

## 安装

确保你已经安装了 Node.js (版本 16 或更高)。

```bash
npm install
```

## 运行

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问。

## 构建

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 使用说明

1. 在编辑器中输入你的正则表达式
2. 在测试文本区域输入要匹配的文本
3. 查看预览面板中的匹配结果
4. 使用 AI 聊天获取调试建议

## 项目结构

```
src/
├── components/
│   ├── AIChat/          # AI 聊天组件
│   ├── Editor/          # 编辑器组件
│   │   ├── CodeEditor.tsx
│   │   └── RuleList.tsx
│   ├── Preview/         # 预览组件
│   └── UI/              # 通用 UI 组件
├── services/
│   └── aiApiService.ts  # AI API 服务
├── utils/
│   └── regexHelpers.ts  # 正则表达式辅助函数
├── App.tsx
├── index.tsx
└── ...
```