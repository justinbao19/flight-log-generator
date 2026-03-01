declare module "bwip-js" {
  interface RenderOptions {
    bcid: string;
    text: string;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    backgroundcolor?: string;
    barcolor?: string;
    [key: string]: unknown;
  }
  export function toCanvas(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    opts: RenderOptions,
  ): HTMLCanvasElement | OffscreenCanvas;
  export function toSVG(opts: RenderOptions): string;
}
