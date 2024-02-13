import { PlantUMLProcessor } from "./PlantUMLProcessor";
import MyPlugin, { DEFAULT_SETTINGS } from "./main";
import * as plantuml from "plantuml-encoder";

export class ServerProcessor implements PlantUMLProcessor {

    plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    //SVG 格式
    svg = async(source: string): Promise<string> => {

        let url = this.plugin.settings.plantUmlServerUrl;
        if (url.length == 0) {
            url = DEFAULT_SETTINGS.plantUmlServerUrl;
        }
        const imageUrlBase = url + "/svg/";
        const encodedDiagram = plantuml.encode(source);
        const image = imageUrlBase + encodedDiagram;
        console.log("ServerProcessor, url: " + image)
        return image
    }
    //PNG 格式
    png = async(source: string): Promise<string> => {

        let url = this.plugin.settings.plantUmlServerUrl;
        if (url.length == 0) {
            url = DEFAULT_SETTINGS.plantUmlServerUrl;
        }
        const imageUrlBase = url + "/png/";
        const encodedDiagram = plantuml.encode(source);
        const image = imageUrlBase + encodedDiagram;
        console.log("ServerProcessor, url: " + image)
        return image
    }
}
