import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } catch {
        return code;
      }
    },
  })
);

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(src: string): string {
  return marked.parse(src) as string;
}

const FONT_STACK_SERIF =
  "'LXGW WenKai TC','LXGW WenKai','Songti SC','STSongti',Georgia,serif";
const FONT_STACK_SANS =
  "system-ui,-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','WenQuanYi Micro Hei',sans-serif";
const FONT_STACK_MONO = "'JetBrains Mono','Menlo',monospace";

export function buildStandaloneHTML(markdown: string, title = 'Markdown'): string {
  const body = renderMarkdown(markdown);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=LXGW+WenKai+TC:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#1a1a1a;--paper:#f6f3ed;--accent:#c44b2b;--accent-glow:rgba(196,75,43,.12);
  --gray-100:#f0ede7;--gray-200:#e2ded6;--gray-400:#9e9890;--gray-500:#6b665e;--gray-600:#4a4640;
  --terminal-bg:#0d1117;--terminal-text:#c9d1d9;
  --serif:${FONT_STACK_SERIF};--sans:${FONT_STACK_SANS};--mono:${FONT_STACK_MONO};
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.prose{max-width:760px;margin:0 auto;padding:48px 24px 96px;font-size:16.5px;line-height:1.85;color:#2c2c2c}
.prose h1{font-family:var(--serif);font-size:32px;font-weight:700;margin:0 0 24px;letter-spacing:-.4px}
.prose h2{font-family:var(--serif);font-size:24px;font-weight:700;margin:56px 0 20px;padding-top:32px;border-top:1px solid var(--gray-200);letter-spacing:-.3px}
.prose h3{font-family:var(--serif);font-size:19px;font-weight:700;margin:40px 0 14px}
.prose h4{font-family:var(--serif);font-size:17px;font-weight:700;margin:28px 0 10px}
.prose p{margin:0 0 20px}
.prose strong{font-weight:600;color:var(--ink)}
.prose ul,.prose ol{margin:0 0 20px;padding-left:24px}
.prose li{margin-bottom:8px}
.prose a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.prose blockquote{border-left:3px solid var(--accent);padding:16px 24px;margin:28px 0;background:var(--accent-glow);border-radius:0 8px 8px 0;font-style:italic;color:var(--gray-600)}
.prose table{width:100%;border-collapse:collapse;margin:28px 0;font-size:15px}
.prose th{text-align:left;padding:12px 16px;background:var(--gray-100);font-weight:600;border-bottom:2px solid var(--gray-200);font-size:14px}
.prose td{padding:12px 16px;border-bottom:1px solid var(--gray-200)}
.prose img{max-width:100%;border-radius:10px;margin:28px 0}
.prose hr{border:none;height:1px;background:var(--gray-200);margin:48px 0}
.prose code{font-family:var(--mono);font-size:.88em;background:var(--gray-100);padding:2px 7px;border-radius:4px;color:var(--accent)}
.prose pre{background:var(--terminal-bg);border-radius:10px;margin:28px 0;padding:20px;font-family:var(--mono);font-size:13.5px;line-height:1.7;color:var(--terminal-text);overflow-x:auto}
.prose pre code{background:none;padding:0;border-radius:0;color:inherit;font-size:inherit}
.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:#ff7b72}
.hljs-string,.hljs-attr{color:#a5d6ff}
.hljs-number,.hljs-literal{color:#79c0ff}
.hljs-comment,.hljs-quote{color:#8b949e;font-style:italic}
.hljs-title,.hljs-function,.hljs-name{color:#d2a8ff}
.hljs-variable,.hljs-params{color:#ffa657}
.hljs-tag,.hljs-meta{color:#7ee787}
</style>
</head>
<body>
<article class="prose">
${body}
</article>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}
