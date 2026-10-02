import { PageSize } from "../constant";
/** Collect one hop of links, preserving source/link order and avoiding duplicates. */
export function appendLinkedFiles<T extends { path: string }>(
  sources: T[],
  getLinks: (file: T) => string[],
  resolve: (link: string, source: T) => T | null,
): T[] {
  const result = [...sources];
  const seen = new Set(sources.map((file) => file.path));
  for (const source of sources) {
    for (const link of getLinks(source)) {
      const target = resolve(link, source);
      if (target && !seen.has(target.path)) {
        seen.add(target.path);
        result.push(target);
      }
    }
  }
  return result;
}

export function getConcurrency(value?: string): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 5;
}

export function validateExportConfig(config: {
  pageSize: unknown;
  pageWidth?: string;
  pageHeight?: string;
  marginType: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  landscape?: boolean;
  displayHeader?: boolean;
  displayFooter?: boolean;
  footerLeftEnabled?: boolean;
  footerRightEnabled?: boolean;
  footerLeftText?: string;
  footerRightText?: string;
}): "invalidPageSize" | "invalidMargins" | undefined {
  const validNumber = (value: string | undefined, allowZero: boolean) => {
    if (!value?.trim()) return false;
    const number = Number(value);
    return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0);
  };
  if (config.pageSize === "Custom" &&
      (!validNumber(config.pageWidth, false) || !validNumber(config.pageHeight, false))) {
    return "invalidPageSize";
  }
  if (config.marginType === "3" &&
      [config.marginTop, config.marginBottom, config.marginLeft, config.marginRight]
        .some((value) => !validNumber(value, true))) {
    return "invalidMargins";
  }
  const size = config.pageSize === "Custom" ? [Number(config.pageWidth), Number(config.pageHeight)]
    : PageSize[config.pageSize as string] ?? PageSize.A4;
  const [width, height] = config.landscape ? [size[1], size[0]] : size;
  const margin = config.marginType === "3" ? [Number(config.marginTop), Number(config.marginRight), Number(config.marginBottom), Number(config.marginLeft)]
    : config.marginType === "0" ? [0, 0, 0, 0] : config.marginType === "2" ? [2.54, 2.54, 2.54, 2.54] : [10, 10, 10, 10];
  if (config.displayHeader) margin[0] = Math.max(12, margin[0]);
  if (config.displayFooter || (config.footerLeftEnabled && config.footerLeftText?.trim()) || (config.footerRightEnabled && config.footerRightText?.trim())) {
    margin[2] = Math.max(12, margin[2]);
  }
  if (margin[0] + margin[2] >= height || margin[1] + margin[3] >= width) return "invalidMargins";

}

export function markdownWithTitle(source: string, title: string, enabled: boolean): string {
  if (!enabled) return source;
  const escaped = title.replace(/[\\`*_\[\]#]/g, "\\$&");
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(source)?.[0] ?? "";
  return `${frontmatter}${frontmatter ? "\n" : ""}# ${escaped}\n\n${source.slice(frontmatter.length)}`;
}
