export interface PlantUMLProcessor {
    svg: (source: string) => Promise<string>;
    png: (source: string) => Promise<string>;
}