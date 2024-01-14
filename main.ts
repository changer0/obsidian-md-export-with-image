import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// 导入 Node.js 的 fs 和 path 模块
import * as fs from 'fs';
import { connect } from 'http2';
// import path from 'path';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	quality: number | undefined;//undefined
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	quality: 0.5
}

export default class MyPlugin extends Plugin {
	//配置内容
	settings: MyPluginSettings;
	//当前处理的图片
	processingImage: String;

	// 定义一个属性，用于存储图标的元素
	ribbonIconEl: HTMLElement;

	async onload() {
		let that = this
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		//this.addSettingTab(new SettingTab(this.app, this));

		// 调用 this.addRibbonIcon 方法，添加一个图标到侧边栏
		this.ribbonIconEl = this.addRibbonIcon(
			'dice', // 图标的名字，你可以自己选择或使用自定义的图标文件
			'点击复制转换后的MD内容到剪切板', // 图标的提示信息，当鼠标悬停在图标上时显示
			async () => {
				log('点击导出按钮');
				this.convertAndCopyToClipboard()
			}
		);

		//按钮可用状态
		this.ribbonIconEl.classList.add('is-enabled');

		//this.addCommand())
	}

	// 转换MD文件并复制到剪切板
	async convertAndCopyToClipboard() {
		// 获取当前激活的文件的视图
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);


		// 如果没有激活的文件，或者激活的文件不是 Markdown 格式，直接返回
		if (!view) {
			log('当前文件不是 Markdown 文件')
			return;
		}

		// 获取当前激活的文件的内容，你可以选择使用 Markdown 源码或渲染后的文本
		let content = view.data; // Markdown 源码
		//正则
		let match;


		//这是针对非标准的 Wiki 形式的图片
		// 使用正则表达式，匹配文件内容中的 [[xxx.png]] 格式的内容
		const regex = /!\[\[(.+?\.(png|jpg|jpeg))\]\]/g;

		// 对于每一个匹配的结果 进行处理
		while ((match = regex.exec(content)) !== null) {
			content = this.replaceMDConentWiki(
				view,
				content,
				match
			)
		}

		//针对标准的 MD 格式
		// 使用正则表达式，匹配文件内容中的 ! 格式的内容
		//const regex2 = /!\[\]\((.+?\.(png|jpg|jpeg))\)/g; // 注意这里的括号和或运算符
		const regex2 = /\!\[(.*?)\]\((.+?\.(jpg|png|jpeg))\)/g;
		while ((match = regex2.exec(content)) !== null) {
			content = this.replaceMDConentNormal(
				view,
				content,
				match,
			)
		}
		// 将替换后的文件内容复制到粘贴板中
		await navigator.clipboard.writeText(content);
		// 弹出一个通知，提示用户已经复制成功
		new Notice('已复制到剪切板🍺🍺🍺');
	}

	/**
	 * 替换 MD 内容 - 标准模式
	 * @param content 
	 * @param match 
	 * @param adapter 
	 * @returns 
	 */
	replaceMDConentNormal(view: MarkdownView, content: string, match: RegExpExecArray): string {
		//log('正在读取标准模式')
		// 获取图片文件名
		let filename = match[2];
		//针对空格的场景
		filename = decodeURIComponent(filename)
		log('正在读取标准模式:' + filename)
		//const filepath = adapter.getFullPath(filename);
		//log('view.file?.path: ' + view.file?.path)
		//getFirstLinkpathDest 获取引用相对路径
		let filepath = this.app.metadataCache.getFirstLinkpathDest(filename, view.file?.path ?? "")?.path ?? "";
		log('getFirstLinkpathDest path: ' + filepath)
		//获取系统路径
		let adapter = this.app.vault.adapter as FileSystemAdapter
		filepath = adapter.getFullPath(filepath)

		log('file path: ' + filepath);
		//这个地方需要判断是否是文件夹
		// 读取图片文件的内容
		const buffer = fs.readFileSync(filepath);
		// 将图片文件的内容转换为 Base64 编码
		const base64 = buffer.toString('base64');
		// 将文件内容中的 ![[xxx.png]] 替换为 !xxx.png
		content = content.replace(
			match[0],
			`![${match[1]}](data:image/png;base64,${base64})` // 注意这里的反引号，它是字符串模板的标志
		);
		log('图片完成 Base64 转换，length: ' + base64.length);
		return content
	}

	/**
	 * 替换 MD 内容 Wiki格式
	 * @param content 
	 * @param match 
	 * @param adapter 
	 * @returns 
	 */
	replaceMDConentWiki(view: MarkdownView, content: string, match: RegExpExecArray): string {
		//log('正在读取Wiki模式')
		// 获取图片文件名
		let filename = match[1];
		//const filepath = adapter.getFullPath(filename);
		//getFirstLinkpathDest 获取引用相对路径
		filename = decodeURIComponent(filename)
		log('正在读取Wiki模式:' + filename)
		let filepath = this.app.metadataCache.getFirstLinkpathDest(filename, view.file?.path ?? "")?.path ?? "";
		//log('工程相对路径：' + filename)
		let adapter = this.app.vault.adapter as FileSystemAdapter
		filepath = adapter.getFullPath(filepath)

		log('file path: ' + filepath);
		// 读取图片文件的内容
		const buffer = fs.readFileSync(filepath);
		// 将图片文件的内容转换为 Base64 编码
		const base64 = buffer.toString('base64');
		// 将文件内容中的 ![[xxx.png]] 替换为 !xxx.png
		content = content.replace(
			match[0],
			`![${filename}](data:image/png;base64,${base64})` // 注意这里的反引号，它是字符串模板的标志
		);
		log('图片完成 Base64 转换，length: ' + base64.length);
		return content
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

	}

	async saveSettings() {
		await this.saveData(this.settings);
		log("保存的 Setting 文件：" + JSON.stringify(this.settings))
	}


}

/// 设置页面
class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName('压缩最小值')
		// 	.setDesc('只有超过压缩最小值才会进行压缩，注意，PNG文件超过此值将被转换为JPEG格式。')
		// 	.addText(text => text
		// 		.setPlaceholder('输入压缩最小值')
		// 		.setValue(this.plugin.settings.convertSize.toString())
		// 		.onChange(async (value) => {
		// 			let tempValue = parseFloat(value)
		// 			if (value !== "" && isNaN(tempValue)) {
		// 				new Notice("参数类型不合法！")
		// 				return;
		// 			}

		// 			this.plugin.settings.convertSize = value === "" ? DEFAULT_SETTINGS.convertSize : tempValue;
		// 			await this.plugin.saveSettings();
		// 		}));
	}
}

//当前日志
function log(msg: string) {
	console.log("MD_EXPORT: " + msg)
}
//获取Byte
function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}