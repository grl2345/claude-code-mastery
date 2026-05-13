import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown, buildStandaloneHTML } from './utils/markdown';
import { SAMPLE_MD } from './utils/sample';

type Theme = 'light' | 'dark';
type Tab = 'edit' | 'preview';

const STORAGE_KEY = 'markdown-ai:doc';
const THEME_KEY = 'markdown-ai:theme';

export default function App() {
  const [src, setSrc] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? SAMPLE_MD);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [tab, setTab] = useState<Tab>('edit');
  const [toast, setToast] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number>();

  const html = useMemo(() => renderMarkdown(src), [src]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const id = window.setTimeout(() => localStorage.setItem(STORAGE_KEY, src), 200);
    return () => window.clearTimeout(id);
  }, [src]);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  }

  async function handleCopyRich() {
    const node = previewRef.current;
    if (!node) return;
    const htmlContent = node.innerHTML;
    const plain = node.innerText;
    try {
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
        showToast('已复制富文本，可粘贴到公众号 / 飞书 / Notion');
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(plain);
      showToast('当前浏览器不支持富文本，已复制纯文本');
    } catch {
      showToast('复制失败，请手动选择');
    }
  }

  function handleExportHTML() {
    const titleMatch = src.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'markdown';
    const blob = new Blob([buildStandaloneHTML(src, title)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(title)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('HTML 已下载');
  }

  async function handleCopyMarkdown() {
    try {
      await navigator.clipboard.writeText(src);
      showToast('Markdown 源码已复制');
    } catch {
      showToast('复制失败');
    }
  }

  function handleClear() {
    if (src.trim() && !confirm('清空当前内容？')) return;
    setSrc('');
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">M</div>
          <div className="brand-text">Markdown AI</div>
          <div className="brand-sub">在线渲染</div>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={handleClear} title="清空">
            <span className="txt">清空</span>
          </button>
          <button className="btn ghost" onClick={handleCopyMarkdown} title="复制源码">
            <span className="txt">复制源码</span>
          </button>
          <button className="btn" onClick={handleCopyRich} title="复制为富文本，可贴到公众号">
            <span className="txt">复制富文本</span>
          </button>
          <button className="btn primary" onClick={handleExportHTML} title="导出独立 HTML">
            <span className="txt">导出 HTML</span>
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title={theme === 'light' ? '切换深色' : '切换浅色'}
            aria-label="toggle theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      <div className="mobile-tabs" role="tablist">
        <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>
          编辑
        </button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          预览
        </button>
      </div>

      <main className="panes">
        <section className={`pane ${tab === 'edit' ? 'active' : ''}`}>
          <div className="pane-head">
            <span className="pane-tag">Markdown</span>
            <span>{src.length} 字</span>
          </div>
          <textarea
            className="editor"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            spellCheck={false}
            placeholder="在这里写 Markdown…"
          />
        </section>
        <section className={`pane ${tab === 'preview' ? 'active' : ''}`}>
          <div className="pane-head">
            <span className="pane-tag">Preview</span>
          </div>
          <div className="preview-scroll">
            <article className="preview-inner prose" ref={previewRef} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </section>
      </main>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function sanitizeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60) || 'markdown';
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
