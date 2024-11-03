import mermaid from 'mermaid';

/**
 * Mermaid 处理器
 */
export class MermaidProcessor {
    constructor() {
        // 初始化 Mermaid
        mermaid.initialize({
            startOnLoad: false, // 不自动加载
            theme: 'default', // 设置主题
        });
    }

    async svgToBase64(mermaidContent: string): Promise<string> {
        // 渲染 Mermaid 图
        try {
            const svg = await this.renderMermaid(mermaidContent);
            return this.convertSvgToBase64(svg);
        } catch (error) {
            console.error("Error generating Mermaid SVG:", error);
            throw error;
        }
    }

    private async renderMermaid(content: string): Promise<string> {
        const elementId = 'mermaidGraph';
        const div = document.createElement('div');
        div.id = elementId;
        document.body.appendChild(div); // 将元素添加到文档中

        try {
            // 使用 Mermaid API 渲染
            const renderResult = await mermaid.render(elementId, content);
            return renderResult.svg; // 提取 SVG 代码
        } catch (error) {
            throw error; // 直接抛出错误
        } finally {
            // 确保移除临时元素前检查
            const parentNode = div.parentNode;
            if (parentNode) {
                parentNode.removeChild(div);
            }
        }
    }

    private convertSvgToBase64(svg: string): string {
        // 将 SVG 字符串转换为 Base64
        const base64 = btoa(svg);
        return `data:image/svg+xml;base64,${base64}`;
    }
}
