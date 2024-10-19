import { PlantUMLProcessor } from "./PlantUMLProcessor";
import MyPlugin, { DEFAULT_SETTINGS } from "./main";
import * as plantuml from "plantuml-encoder";
import * as localforage from "localforage";
import {OutputType} from "./const";
/**
 * /Users/lemon/soft/plantuml/plantuml.jar
 */
export class LocalProcessor implements PlantUMLProcessor {

    plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    //SVG 格式
    svg = async(source: string): Promise<string> => {
        const encodedDiagram = plantuml.encode(source);
        const item: string | null = await localforage.getItem('svg-' + encodedDiagram);
        if(item) {
            return item;
        }
        const path = this.plugin.replacer.getPath(null);
        const image = await this.generateLocalImage(source, OutputType.SVG, path);
        //保存缓存
        await localforage.setItem('svg-' + encodedDiagram, image);
     
        // console.log("LocalProcessor png: " + image)
        return image
    }
    //PNG 格式
    png = async(source: string): Promise<string> => {

        // console.log("LocalProcessor png: " + source)
        const encodedDiagram = plantuml.encode(source);
        // 先从缓存中取
        const item: string | null = await localforage.getItem('png-' + encodedDiagram);
        if(item) {
            return `data:image/png;base64,${item}`;
        }
        const path = this.plugin.replacer.getPath(null);
        const image = await this.generateLocalImage(source, OutputType.PNG, path);
        //保存缓存
        await localforage.setItem('png-' + encodedDiagram, image);
     
        // console.log("LocalProcessor png: " + image)
        return `data:image/png;base64,${image}`;
    }


    /**
     * 生成本地的 Image
     * @param source 
     * @param type 
     * @param path 
     * @returns 
     */
    async generateLocalImage(source: string, type: OutputType, path: string): Promise<string> {
        const {ChildProcess, exec} = require('child_process');
        const args = this.resolveLocalJarCmd().concat(['-t' + type, '-pipe']);
        //console.log("这里面：LocalProcessor: " + JSON.stringify(args));
        let child: typeof ChildProcess;
        if (type === OutputType.PNG) {
            child = exec(args.join(" "), {encoding: 'binary', cwd: path});
        } else {
            child = exec(args.join(" "), {encoding: 'utf-8', cwd: path});
        }

        let stdout: any;
        let stderr: any;

        if (child.stdout) {
            child.stdout.on("data", (data: any) => {
                if (stdout === undefined) {
                    stdout = data;
                } else stdout += data;
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data: any) => {
                if (stderr === undefined) {
                    stderr = data;
                } else stderr += data;
            });
        }

        return new Promise((resolve, reject) => {
            child.on("error", reject);

            child.on("close", (code: any) => {
                if(stdout === undefined) {
                    return;
                }
                if (code === 0) {
                    if (type === OutputType.PNG) {
                        const buf = new Buffer(stdout, 'binary');
                        resolve(buf.toString('base64'));
                        return;
                    }
                    resolve(stdout);
                    return;
                } else if (code === 1) {
                    console.error(stdout);
                    reject(new Error(stderr));
                } else {
                    if (type === OutputType.PNG) {
                        const buf = new Buffer(stdout, 'binary');
                        resolve(buf.toString('base64'));
                        return;
                    }
                    resolve(stdout);
                    return;
                }
            });
            child.stdin.write(source, "utf-8");
            child.stdin.end();
        });
    }

    /**
     * To support local jar settings with unix-like style, and search local jar file
     * from current vault path.
     */
      private resolveLocalJarCmd(): string[] {
        const jarFromSettings = this.plugin.settings.localJar;
        const {isAbsolute, resolve} = require('path');
        const {userInfo} = require('os');
        let jarFullPath: string;
        const path = this.plugin.replacer.getFullPath("");

        if (jarFromSettings[0] === '~') {
            // As a workaround, I'm not sure what would isAbsolute() return with unix-like path
            jarFullPath = userInfo().homedir + jarFromSettings.slice(1);
        }
        else {
            if (isAbsolute(jarFromSettings)) {
                jarFullPath = jarFromSettings;
            }
            else {
                // the default search path is current vault
                jarFullPath = resolve(path, jarFromSettings);
            }
        }

        if (jarFullPath.length == 0) {
            throw Error('Invalid local jar file');
        }

        if(jarFullPath.endsWith('.jar')) {
            return [
                this.plugin.settings.javaPath, '-jar', '-Djava.awt.headless=true', '"' + jarFullPath + '"', '-charset', 'utf-8', '-graphvizdot', '"' + this.plugin.settings.dotPath + '"'
            ];
        }
        return [
            jarFullPath, '-Djava.awt.headless=true', '-charset', 'utf-8', '-graphvizdot', '"' + this.plugin.settings.dotPath + '"'
        ];
    }
   
}

