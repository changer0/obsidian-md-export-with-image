import { App, Modal } from "obsidian";

/**
 * Modal to show progress during conversion
 */
export class LoadingModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    private _progress: HTMLElement;

    get progress() {
        return this._progress;
    }

    onOpen() {
        let { titleEl, contentEl } = this;
        titleEl.setText('Copying to clipboard');
        this._progress = contentEl.createEl('progress');
        this._progress.style.width = '100%';
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
