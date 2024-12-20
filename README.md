# Obsidian Markdown Export

> [!tip]
> 解决 Obsidian 中的 Markdown 文件如果要复制出去图片展示问题，自动转换为标准的 Markdown 语法，自动将图片转为 Base64 格式，无需图床！

### 1.6.1

优化 SVG 转 Base64 的方法

- 使用 Blob 对象和 FileReader 替代直接使用 btoa 方法
- 改为异步方法，使用 Promise 处理结果
- 增加错误处理机制

### 1.6.0

- 支持 Mermaid 格式

### 1.5.0

- 支持检查 Markdown 文件格式是否标准，现增加了加粗符号的检查

### 1.4.0

- PlantUML 支持动态配置 Dot 路径

### 1.3.0

- 支持 Gif 图

### 1.2.1

- Bugfix 针对行内代码块出现undefined的现象

### 1.2.0

- 重大升级，支持 Excalidraw 格式，注意需要调整Excalidraw的设置：嵌入到Markdown文档中的绘图 -> 预览图格式 -> 调节为 PNG 格式，否则 copy 出来的文件非常大！

### 1.1.0

- 重大升级，支持 PlantUML 格式

### 1.0.0

- 完成基本功能

## 贡献

如果你发现问题或有改进建议，欢迎随时提 issue。

## 许可证

本插件采用 [MIT 许可证](LICENSE)。




