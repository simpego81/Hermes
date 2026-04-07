/* Hermes Markdown metadata parsing helpers. */
export interface ParsedDocument {
  metadata: Record<string, string | string[]>;
  body: string;
  links: string[];
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

function parseScalar(value: string): string | string[] {
  const linkMatches = [...value.matchAll(WIKI_LINK_PATTERN)].map((match) =>
    match[1].trim(),
  );

  if (linkMatches.length > 0) {
    return linkMatches;
  }

  return value.trim();
}

export function parseMarkdownDocument(source: string): ParsedDocument {
  const frontmatterMatch = source.match(FRONTMATTER_PATTERN);
  const metadata: Record<string, string | string[]> = {};
  const body = frontmatterMatch ? frontmatterMatch[2].trim() : source.trim();

  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split(/\r?\n/)) {
      const separatorIndex = line.indexOf(':');

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      metadata[key] = parseScalar(rawValue);
    }
  }

  const links = [...body.matchAll(WIKI_LINK_PATTERN)].map((match) =>
    match[1].trim(),
  );

  // Also collect wiki-links from frontmatter values (e.g. owner: [[Luca]])
  for (const val of Object.values(metadata)) {
    if (Array.isArray(val)) {
      links.push(...val);
    }
  }

  return {
    metadata,
    body,
    links,
  };
}
