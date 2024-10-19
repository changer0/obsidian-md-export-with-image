import { App, Modal } from "obsidian";
interface DialogModalOptions {
    title: string;
    content: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

export class DialogModal extends Modal {
    private options: DialogModalOptions;

    constructor(app: App, options: DialogModalOptions) {
        super(app);
        this.options = options;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.options.title });
        
        // 处理内容，支持换行
        const contentLines = this.options.content.split('\n');
        contentLines.forEach(line => {
            contentEl.createEl('p', { text: line });
        });

        // 添加按钮容器
        const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

        // 添加“确定”按钮
        // const confirmButton = buttonContainer.createEl('button', { text: '确定' });
        // confirmButton.addEventListener('click', () => {
        //     if (this.options.onConfirm) {
        //         this.options.onConfirm();
        //     }
        //     this.close();
        // });

        // 添加“取消”按钮
        const cancelButton = buttonContainer.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            if (this.options.onCancel) {
                this.options.onCancel();
            }
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
