import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, addIcon } from 'obsidian';

// 导入 Node.js 的 fs 和 path 模块
import * as fs from 'fs';
import { connect } from 'http2';
import { ServerProcessor } from './ServerProcessor';
import { PlantUMLProcessor } from './PlantUMLProcessor';
import { Replacer } from './functions';
import { LocalProcessor } from './LocalProcessor';
// import path from 'path';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	hasIcon: boolean;//false
	needImageDesc: boolean;//true
	plantUmlServerUrl: string;
	// Local UML 配置
	javaPath: string;
	dotPath: string;
	localJar: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	hasIcon: false,
	needImageDesc: true,
	plantUmlServerUrl: "https://www.plantuml.com/plantuml",
	localJar: '',
	javaPath: 'java',
	dotPath: 'dot',
}

export default class MyPlugin extends Plugin {
	//配置内容
	settings: MyPluginSettings;
	//当前处理的图片
	processingImage: String;

	// 定义一个属性，用于存储图标的元素
	ribbonIconEl: HTMLElement;

	// Server UML Processor
	serverProcessor: PlantUMLProcessor;
	// Local UML Processor
	localProcess: PlantUMLProcessor;

	replacer: Replacer;

	async onload() {
		let that = this
		await this.loadSettings();
		this.replacer = new Replacer(this);
		this.localProcess = new LocalProcessor(this);
		this.serverProcessor = new ServerProcessor(this);
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		//https://www.iconfont.cn/ 100*100
		addIcon("md-export-with-image", `<svg t="1705228466791" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5454" width="100" height="100"><path d="M313.6 801.6v-102.4L512 838.4l-198.4 139.2v-100.8C128 827.2 0 710.4 0 572.8c1.6-67.2 30.4-129.6 78.4-176 12.8-14.4 36.8-14.4 51.2-1.6 14.4 14.4 14.4 36.8 0 51.2-35.2 32-56 78.4-57.6 126.4 0 96 96 185.6 241.6 228.8zM627.2 892.8c-19.2 3.2-36.8-9.6-40-28.8-3.2-19.2 9.6-38.4 28.8-41.6h1.6c196.8-28.8 334.4-134.4 334.4-249.6-1.6-46.4-20.8-89.6-54.4-121.6-14.4-14.4-14.4-36.8 0-51.2 6.4-6.4 16-11.2 25.6-11.2 9.6 0 19.2 3.2 25.6 11.2 46.4 44.8 73.6 107.2 75.2 171.2 0 158.4-168 288-396.8 321.6z" fill="#bfbfbf" p-id="5455"></path><path d="M313.6 801.6v-102.4L512 838.4l-198.4 139.2v-100.8C128 827.2 0 710.4 0 572.8c1.6-67.2 30.4-129.6 78.4-176 12.8-14.4 36.8-14.4 51.2-1.6 14.4 14.4 14.4 36.8 0 51.2-35.2 32-56 78.4-57.6 126.4 0 96 96 185.6 241.6 228.8zM627.2 892.8c-19.2 3.2-36.8-9.6-40-28.8-3.2-19.2 9.6-38.4 28.8-41.6h1.6c196.8-28.8 334.4-134.4 334.4-249.6-1.6-46.4-20.8-89.6-54.4-121.6-14.4-14.4-14.4-36.8 0-51.2 6.4-6.4 16-11.2 25.6-11.2 9.6 0 19.2 3.2 25.6 11.2 46.4 44.8 73.6 107.2 75.2 171.2 0 158.4-168 288-396.8 321.6z" fill="#bfbfbf" p-id="5456"></path><path d="M766.4 48H257.6c-27.2 0-48 22.4-48 48v424c0 27.2 22.4 48 48 48h508.8c27.2 0 48-22.4 48-48V97.6c0-27.2-20.8-49.6-48-49.6z m0 472H257.6v-144l124.8-128 147.2 182.4c8 9.6 22.4 11.2 32 4.8l108.8-73.6 96 44.8v113.6z m0-176l-80-33.6c-8-6.4-19.2-6.4-28.8-1.6l-105.6 70.4-150.4-185.6c-4.8-4.8-11.2-8-17.6-8-6.4 0-12.8 3.2-17.6 8l-108.8 112v-208h508.8v246.4z m-128-196.8c-38.4 0-68.8 30.4-68.8 68.8s30.4 68.8 68.8 68.8 68.8-30.4 68.8-68.8c-1.6-38.4-32-68.8-68.8-68.8z m0 88c-11.2 0-19.2-9.6-19.2-19.2 0-11.2 9.6-19.2 19.2-19.2 11.2 0 19.2 8 19.2 19.2 0 9.6-9.6 19.2-19.2 19.2z m0 0" fill="currentColor" p-id="5457"></path></svg>`);

		// 调用 this.addRibbonIcon 方法，添加一个图标到侧边栏
		this.ribbonIconEl = this.addRibbonIcon(
			'md-export-with-image', // 图标的名字，你可以自己选择或使用自定义的图标文件
			'点击复制转换后的MD内容到剪切板', // 图标的提示信息，当鼠标悬停在图标上时显示
			async () => {
				log('点击导出按钮');
				this.convertAndCopyToClipboard()
			}
		);

		//按钮可用状态
		this.ribbonIconEl.classList.add('is-enabled');

		this.settings.hasIcon ? this.ribbonIconEl.show() : this.ribbonIconEl.hide();

		//开启命令
		this.addCommand({
			id: "md-export-with-image",
			name: "Copy To Clipboard MD With Image",
			callback: () => {
				//console.log("Hey, you!");
				log('command called !');
				this.convertAndCopyToClipboard()
			},
		});
	}

	// 转换MD文件并复制到剪切板
	async convertAndCopyToClipboard() {
		new Notice('正在转码中，请稍等...');

		// 获取当前激活的文件的视图
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);


		// 如果没有激活的文件，或者激活的文件不是 Markdown 格式，直接返回
		if (!view) {
			log('当前文件不是 Markdown 文件')
			new Notice("前在 Markdown 文件下执行！")
			return;
		}

		// 获取当前激活的文件的内容，你可以选择使用 Markdown 源码或渲染后的文本
		let content = view.data; // Markdown 源码

		//正则
		let match;

		const regex = /```(puml|plantuml|puml-svg)\n([\s\S]*?)\n```/g;

		// 先经过 PlantUML 处理一遍
		while ((match = regex.exec(content)) !== null) {
			content = await this.replacePlantUML(
				view,
				content,
				match
			)
		}


		//这是针对非标准的 Wiki 形式的图片
		// 使用正则表达式，匹配文件内容中的 [[xxx.png]] 格式的内容
		const regex1 = /!\[\[(.+?\.(png|jpg|jpeg))\]\]/g;

		// 对于每一个匹配的结果 进行处理
		while ((match = regex1.exec(content)) !== null) {
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

	// 获取当前的 UML 处理器
	getPlantUmlProcessor(): PlantUMLProcessor {
		if (this.settings.localJar.length > 0) {
			return this.localProcess;
		}
		return this.serverProcessor;
	}

	/**
	 * 替换 PlantUML 的内容
	 * 
	 * @param view 
	 * @param content 
	 * @param match 
	 */
	async replacePlantUML(view: MarkdownView, content: string, match: RegExpExecArray): Promise<string> {
		// console.log("match[0]: " + match[0]);
		// console.log("match[1]: " + match[1]);
		// console.log("match[2]: " + match[2]);
		let plantumlContent = match[2];
		log("replacePlantUML plantumlContent: \n" + plantumlContent);
		// console.log("match[2]: " + match[2]);
		let convertContent = await this.getPlantUmlProcessor().png(plantumlContent);

		let image = `![](${convertContent})`;

		content = content.replace(
			match[0],
			image // 注意这里的反引号，它是字符串模板的标志
		);
		//替换时使用 match[0]
		return content;
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
		//图片描述
		const desc = this.settings.needImageDesc ? match[1] : ""
		// 将文件内容中的 ![[xxx.png]] 替换为 !xxx.png
		content = content.replace(
			match[0],
			`![${desc}](data:image/png;base64,${base64})` // 注意这里的反引号，它是字符串模板的标志
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
		//图片描述
		const desc = this.settings.needImageDesc ? filename : ""
		// 将文件内容中的 ![[xxx.png]] 替换为 !xxx.png
		content = content.replace(
			match[0],
			`![${desc}](data:image/png;base64,${base64})` // 注意这里的反引号，它是字符串模板的标志
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


		new Setting(containerEl)
			.setName('展示图标')
			.setDesc('是否展示复制到Markdown文件到剪切板的图标')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hasIcon)
				.onChange(async (value) => {
					this.plugin.settings.hasIcon = value;
					value ? this.plugin.ribbonIconEl.show() : this.plugin.ribbonIconEl.hide()
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('是否需要图片描述')
			.setDesc('如果需要则使用原描述，针对Wiki模式则使用文件名作为描述')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.needImageDesc)
				.onChange(async (value) => {
					this.plugin.settings.needImageDesc = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('PlantUML Local Jar')
			.setDesc('本地 PlantUML Jar 包路径。')
			.addText(text => text
				.setValue(this.plugin.settings.localJar)
				.onChange(async (value) => {
					this.plugin.settings.localJar = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('PlantUML Server Url')
			.setDesc('服务端 PlantUML URL 地址。')
			.addText(text => text
				.setValue(this.plugin.settings.plantUmlServerUrl)
				.onChange(async (value) => {
					this.plugin.settings.plantUmlServerUrl = value;
					await this.plugin.saveSettings();
				}));

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