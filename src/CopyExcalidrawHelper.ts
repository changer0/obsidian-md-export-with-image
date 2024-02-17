import {
    App,
    arrayBufferToBase64, Component,
    FileSystemAdapter,
    MarkdownRenderer,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting, TAbstractFile,
    TFile
} from 'obsidian';


/** Don't allow multiple copy processes to run at the same time */
let copyIsRunning = false;

/** true while a block is being processed by MarkDownPostProcessor instances */
let ppIsProcessing = false;

/** moment at which the last block finished post-processing */
let ppLastBlockDate = Date.now();

/**
 * 文档渲染器
 */
export class CopyExcalidrawHelper {
    private view: Component;

    // time required after last block was rendered before we decide that rendering a view is completed
    private optionRenderSettlingDelay: number = 100;

    // only those which are different from image/${extension}
    private readonly mimeMap = new Map([
        ['svg', 'image/svg+xml'],
        ['jpg', 'image/jpeg'],
    ]);

    private readonly externalSchemes = ['http', 'https'];

    private readonly vaultPath: string;
    private readonly vaultUriPrefix: string;
    private app: App;

    constructor(
        private plugin: Plugin) {
        this.app = plugin.app;
        this.vaultPath = (this.app.vault.getRoot().vault.adapter as FileSystemAdapter).getBasePath()
            .replace(/\\/g, '/');

        this.vaultUriPrefix = `app://local/${this.vaultPath}`;

        this.view = new Component();


        ppLastBlockDate = Date.now();
        ppIsProcessing = true;

        const beforeAllPostProcessor = this.plugin.registerMarkdownPostProcessor(async () => {
            ppIsProcessing = true;
        });
        beforeAllPostProcessor.sortOrder = -10000;

        const afterAllPostProcessor = this.plugin.registerMarkdownPostProcessor(async () => {
            ppLastBlockDate = Date.now();
            ppIsProcessing = false;
        });
        afterAllPostProcessor.sortOrder = 10000;

    }

    /**
     * Render document into detached HTMLElement
     */
    public async handleDocument(markdown: string, path: string): Promise<string> {
        const topNode = await this.renderMarkdown(markdown, path);
        return await this.transformHTML(markdown, topNode!);

    }

    /**
     * Render current view into HTMLElement, expanding embedded links
     */
    private async renderMarkdown(markdown: string, path: string): Promise<HTMLElement> {

        const wrapper = document.createElement('div');
        wrapper.style.display = 'hidden';
        document.body.appendChild(wrapper);
        await MarkdownRenderer.render(this.app, markdown, wrapper, path, this.view);
        await this.untilRendered();

        const result = wrapper.cloneNode(true) as HTMLElement;
        document.body.removeChild(wrapper);

        this.view.unload();
        return result;
    }

    /**
     * Wait until the view has finished rendering
     *
     * Beware, this is a dirty hack...
     *
     * We have no reliable way to know if the document finished rendering. For instance dataviews or task blocks
     * may not have been post processed.
     * MarkdownPostProcessors are called on all the "blocks" in the HTML view. So we register one post-processor
     * with high-priority (low-number to mark the block as being processed), and another one with low-priority that
     * runs after all other post-processors.
     * Now if we see that no blocks are being post-processed, it can mean 2 things :
     *  - either we are between blocks
     *  - or we finished rendering the view
     * On the premise that the time that elapses between the post-processing of consecutive blocks is always very
     * short (just iteration, no work is done), we conclude that the render is finished if no block has been
     * rendered for enough time.
     */
    private async untilRendered() {
        while (ppIsProcessing || Date.now() - ppLastBlockDate < this.optionRenderSettlingDelay) {
            if (ppLastBlockDate === 0) {
                break;
            }
            await delay(20);
        }
    }



    /**
     * Transform rendered markdown to clean it up and embed images
     */
    private async transformHTML(markdown: string, element: HTMLElement): Promise<string> {
        // Remove styling which forces the preview to fill the window vertically
        // @ts-ignore
        const node: HTMLElement = element.cloneNode(true);

        //遍历所有 img
        let imgs = node.querySelectorAll('img');
        console.log("imgs length " + imgs.length)

        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            if (!img.src) {
                //log("img src 路径为空！")
                continue;
            }
            if (!img.hasClass("excalidraw-svg")) {
                // console.log("非excalidraw文件！")
                continue;
            }
            let blobUrl = img.src
            console.log("img src 路径: " + blobUrl)
            if (!img.hasAttribute('filesource')) {
                continue;
            }
            let filesource = img.getAttribute('filesource') as string
            console.log("img 文件路径：" + filesource)

            let respone = await fetch(blobUrl);
            let blob = await respone.blob();
            // console.log((blob).text())
            let imgContent = await this.readBold(blob);
            markdown = this.replaceMarkdownLinksExcludingCode(markdown, filesource, `<img src="${imgContent}"/>`)
        }
        return markdown;
    }



    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private replaceMarkdownLinksExcludingCode(markdown: string, fullPath: string, replacement: string): string {
        // // 1. 标记代码块和行内代码
        // const codeBlocks: string[] = [];
        // const inlineCodes: string[] = [];
        // let counter = 0;

        // // 替换代码块
        // markdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
        //     const placeholder = `<<codeblock_${counter++}>>`;
        //     codeBlocks.push(match);
        //     return placeholder;
        // });

        // // 替换行内代码
        // markdown = markdown.replace(/`.*?`/g, (match) => {
        //     const placeholder = `<<inlinecode_${counter++}>>`;
        //     inlineCodes.push(match);
        //     return placeholder;
        // });

        // 2. 替换链接
        const [path, filename] = fullPath.split(/\/(?=[^\/]+$)/);
        const basename = filename.replace(/\.md$/, '');
        const escapedPath = this.escapeRegExp(fullPath);
        const escapedBasename = this.escapeRegExp(basename);
        const regexPattern = `!\\[\\[((?:${escapedPath}|${escapedBasename}|${path}\/${escapedBasename})(?:\\.md)?)(?:\\|[^\\]]+)?\\]\\]`;
        const regex = new RegExp(regexPattern, 'g');
        markdown = markdown.replace(regex, replacement);

        // // 3. 恢复代码块和行内代码
        // markdown = markdown.replace(/<<codeblock_(\d+)>>/g, (match, number) => codeBlocks[number]);
        // markdown = markdown.replace(/<<inlinecode_(\d+)>>/g, (match, number) => inlineCodes[number]);

        return markdown;
    }

    private async readBold(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (event) {
                // 确保事件和目标存在
                if (!event || !event.target || !event.target.result) {
                    reject("File read error.");
                    return;
                }
                // 读取成功，解析结果
                let result = event.target.result;
                //console.log(result); // 打印结果，根据需要可移除
                resolve(result as string); // 将结果作为字符串解析并返回
            };

            reader.onerror = function (error) {
                // 处理读取过程中可能发生的错误
                console.error("Error reading file:", error);
                reject("Error reading file.");
            };

            // 开始读取blob内容
            reader.readAsDataURL(blob);
        });
    }


    private isSvg(mimeType: string): boolean {
        return mimeType === 'image/svg+xml';
    }

}


/**
 * Do nothing for a while
 */
async function delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

