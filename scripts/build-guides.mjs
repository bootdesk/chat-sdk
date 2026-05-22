import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";

marked.use(gfmHeadingId());

const SRC = new URL("../docs/guide", import.meta.url).pathname;
const OUT = new URL("../docs/_build/guides", import.meta.url).pathname;

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

copyFileSync(join(SRC, "guides.css"), join(OUT, "guides.css"));
copyFileSync(join(SRC, "guides.js"), join(OUT, "guides.js"));

const template = readFileSync(join(SRC, "template.html"), "utf-8");
const indexTemplate = readFileSync(join(SRC, "index-template.html"), "utf-8");

const files = readdirSync(SRC).filter((f) => f.endsWith(".md") && f !== "index.md").sort();

function linkName(file) {
  return basename(file, ".md") + ".html";
}

function labelOf(file) {
  return basename(file, ".md")
    .replace(/^\d+-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const navItems = files.map((f) => ({
  file: f,
  href: linkName(f),
  label: labelOf(f),
}));

function extractToc(bodyHtml) {
  const headings = [];
  const re = /<h([1-6])\s+id="([^"]+)">([^<]+)<\/h[1-6]>/gi;
  let m;
  while ((m = re.exec(bodyHtml)) !== null) {
    headings.push({ level: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, "") });
  }
  return headings;
}

function addAnchorLinks(bodyHtml) {
  return bodyHtml.replace(
    /<h([1-6])\s+id="([^"]+)"[^>]*>(.+?)<\/h[1-6]>/gi,
    (_, level, id, content) =>
      `<h${level} id="${id}"><a href="#${id}" class="anchor-link">#</a>${content}</h${level}>`
  );
}

for (const file of files) {
  const md = readFileSync(join(SRC, file), "utf-8");
  const rawHtml = marked(md);
  const body = addAnchorLinks(rawHtml);
  const toc = extractToc(rawHtml).filter((h) => h.level <= 3);
  const currentLabel = labelOf(file);

  const idx = navItems.findIndex((n) => n.file === file);
  const prev = idx > 0 ? navItems[idx - 1] : null;
  const next = idx < navItems.length - 1 ? navItems[idx + 1] : null;

  const tocHtml = toc.length > 1
    ? `<div class="toc-section">\n        <p class="toc-label">On this page</p>\n        ${toc.map((h) =>
        `<a href="#${h.id}" class="toc-link${h.level === 3 ? " h3" : ""}">${h.text}</a>`
      ).join("\n        ")}\n      </div>`
    : "";

  const sidebarLinks = navItems
    .map((n) => {
      const active = n.file === file;
      return `<a href="${n.href}" class="nav-link${active ? " active" : ""}">${n.label}</a>`;
    })
    .join("\n              ");

  const prevLink = prev ? `<a href="${prev.href}" class="nav-btn">&larr; ${prev.label}</a>` : "";
  const nextLink = next ? `<a href="${next.href}" class="nav-btn next">${next.label} &rarr;</a>` : "";

  const html = template
    .replaceAll("{{TITLE}}", currentLabel)
    .replace("{{BODY}}", body)
    .replace("{{SIDEBAR_LINKS}}", sidebarLinks)
    .replace("{{TOC}}", tocHtml)
    .replace("{{PREV_LINK}}", prevLink)
    .replace("{{NEXT_LINK}}", nextLink);

  writeFileSync(join(OUT, linkName(file)), html, "utf-8");
  console.log("  ✓", linkName(file));
}

// index guide
const indexMd = readFileSync(join(SRC, "index.md"), "utf-8");
const indexRawHtml = marked(indexMd);
const indexBody = addAnchorLinks(indexRawHtml);
const indexToc = extractToc(indexRawHtml).filter((h) => h.level <= 3);

const indexTocHtml = indexToc.length > 1
  ? `<div class="toc-section">\n        <p class="toc-label">On this page</p>\n        ${indexToc.map((h) =>
      `<a href="#${h.id}" class="toc-link${h.level === 3 ? " h3" : ""}">${h.text}</a>`
    ).join("\n        ")}\n      </div>`
  : "";

const indexSidebarLinks = navItems
  .map((n) => `<a href="${n.href}" class="nav-link">${n.label}</a>`)
  .join("\n              ");

const indexHtml = indexTemplate
  .replace("{{BODY}}", indexBody)
  .replace("{{SIDEBAR_LINKS}}", indexSidebarLinks)
  .replace("{{TOC}}", indexTocHtml);

writeFileSync(join(OUT, "index.html"), indexHtml, "utf-8");
console.log("  ✓ index.html");

console.log("Done —", files.length + 1, "guides");
