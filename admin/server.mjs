import { createServer } from 'node:http';
import { readdir, readFile, writeFile, unlink, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';

const PORT = process.env.PORT || 4000;
const PASSWORD = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
const PROJECT_DIR = join(import.meta.dirname, '..');
const CONTENT_DIR = join(PROJECT_DIR, 'content');
const DIST_DIR = join(PROJECT_DIR, 'dist');
const ADMIN_HTML = join(import.meta.dirname, 'index.html');
const AUTO_BUILD = process.env.AUTO_BUILD !== 'false';

// MIME types for static file serving
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Token store
const tokens = new Set();

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return tokens.has(auth.slice(7));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function jsonRes(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// --- Static file serving ---
async function serveStatic(res, filePath) {
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      filePath = join(filePath, 'index.html');
      await stat(filePath); // throws if not exist
    }
    const ext = extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

// --- Frontmatter ---
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^\d+$/.test(val)) val = parseInt(val);
    meta[key] = val;
  });
  return { meta, body: match[2] };
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  const order = ['title', 'module', 'order', 'group', 'description', 'duration', 'level', 'publishedAt', 'updatedAt', 'draft'];
  for (const key of order) {
    if (meta[key] === undefined || meta[key] === '') continue;
    const val = meta[key];
    if (typeof val === 'string') {
      lines.push(`${key}: "${val}"`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// --- Article CRUD ---
async function getAllArticles() {
  const modules = ['m1-basics', 'm2-thinking', 'm3-practice', 'm4-advanced'];
  const articles = [];
  for (const mod of modules) {
    const dir = join(CONTENT_DIR, mod);
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(dir, file), 'utf-8');
      const { meta, body } = parseFrontmatter(content);
      articles.push({
        id: `${mod}/${file.replace('.md', '')}`,
        module: mod, filename: file, ...meta,
        bodyLength: body.trim().length,
      });
    }
  }
  articles.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return (a.order || 0) - (b.order || 0);
  });
  return articles;
}

async function getArticle(id) {
  const filePath = join(CONTENT_DIR, id + '.md');
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(content);
  return { id, ...meta, body };
}

async function saveArticle(id, data) {
  const filePath = join(CONTENT_DIR, id + '.md');
  const dir = join(CONTENT_DIR, id.split('/')[0]);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const meta = { ...data };
  const body = meta.body || '';
  delete meta.body;
  delete meta.id;
  const content = buildFrontmatter(meta) + '\n' + body;
  await writeFile(filePath, content, 'utf-8');
}

async function deleteArticle(id) {
  const filePath = join(CONTENT_DIR, id + '.md');
  if (!existsSync(filePath)) return false;
  await unlink(filePath);
  return true;
}

// --- Build & Deploy ---
let buildStatus = { running: false, lastBuild: null, lastError: null };

function triggerBuild() {
  if (!AUTO_BUILD || buildStatus.running) return;
  buildStatus.running = true;
  buildStatus.lastError = null;
  console.log('[build] 开始构建并发布...');

  // Build, then git commit + push
  const cmd = [
    'npx astro build',
    'git add -A',
    'git commit -m "content: update from admin" --allow-empty',
    'git push origin main',
  ].join(' && ');

  exec(cmd, { cwd: PROJECT_DIR, timeout: 180000 }, (err, stdout, stderr) => {
    buildStatus.running = false;
    if (err) {
      buildStatus.lastError = err.message.split('\n')[0];
      console.log('[build] 失败:', buildStatus.lastError);
    } else {
      buildStatus.lastBuild = new Date().toISOString();
      buildStatus.lastError = null;
      console.log('[build] 构建并推送完成');
    }
  });
}

const moduleNames = {
  'm1-basics': '基础篇',
  'm2-thinking': '思维篇',
  'm3-practice': '实战篇',
  'm4-advanced': '进阶篇',
};

// --- HTTP Server ---
const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // --- Admin UI ---
  if (path === '/admin' || path === '/admin/') {
    const html = await readFile(ADMIN_HTML, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // --- Admin API ---
  if (path === '/api/login' && req.method === 'POST') {
    try {
      const { password } = await parseBody(req);
      if (password !== PASSWORD) return jsonRes(res, { error: '密码错误' }, 401);
      const token = generateToken();
      tokens.add(token);
      return jsonRes(res, { token });
    } catch {
      return jsonRes(res, { error: '请求格式错误' }, 400);
    }
  }

  if (path.startsWith('/api/')) {
    if (!checkAuth(req)) return jsonRes(res, { error: '未授权' }, 401);

    if (path === '/api/articles' && req.method === 'GET') {
      const articles = await getAllArticles();
      return jsonRes(res, { articles, moduleNames });
    }

    if (path === '/api/build-status' && req.method === 'GET') {
      return jsonRes(res, buildStatus);
    }

    if (path === '/api/rebuild' && req.method === 'POST') {
      if (buildStatus.running) return jsonRes(res, { error: '正在构建中' }, 409);
      triggerBuild();
      return jsonRes(res, { success: true, message: '构建已触发' });
    }

    const articleMatch = path.match(/^\/api\/articles\/(.+)$/);

    if (articleMatch && req.method === 'GET') {
      const article = await getArticle(decodeURIComponent(articleMatch[1]));
      if (!article) return jsonRes(res, { error: '文章不存在' }, 404);
      return jsonRes(res, article);
    }

    if (articleMatch && req.method === 'PUT') {
      try {
        const data = await parseBody(req);
        await saveArticle(decodeURIComponent(articleMatch[1]), data);
        triggerBuild();
        return jsonRes(res, { success: true });
      } catch (e) {
        return jsonRes(res, { error: e.message }, 500);
      }
    }

    if (articleMatch && req.method === 'DELETE') {
      const ok = await deleteArticle(decodeURIComponent(articleMatch[1]));
      if (!ok) return jsonRes(res, { error: '文章不存在' }, 404);
      triggerBuild();
      return jsonRes(res, { success: true });
    }

    if (path === '/api/articles' && req.method === 'POST') {
      try {
        const data = await parseBody(req);
        if (!data.module || !data.filename) {
          return jsonRes(res, { error: '缺少 module 或 filename' }, 400);
        }
        const id = `${data.module}/${data.filename.replace('.md', '')}`;
        const existing = await getArticle(id);
        if (existing) return jsonRes(res, { error: '文件已存在' }, 409);
        delete data.filename;
        await saveArticle(id, data);
        triggerBuild();
        return jsonRes(res, { success: true, id });
      } catch (e) {
        return jsonRes(res, { error: e.message }, 500);
      }
    }

    return jsonRes(res, { error: 'Not found' }, 404);
  }

  // --- Serve static site from dist/ ---
  if (req.method === 'GET') {
    // Try exact path
    let filePath = join(DIST_DIR, path);
    if (await serveStatic(res, filePath)) return;

    // Try with .html extension (Astro clean URLs)
    if (!extname(path)) {
      filePath = join(DIST_DIR, path + '.html');
      if (await serveStatic(res, filePath)) return;

      // Try as directory with index.html
      filePath = join(DIST_DIR, path, 'index.html');
      if (await serveStatic(res, filePath)) return;
    }

    // 404 - serve custom 404 or fallback
    const notFoundPath = join(DIST_DIR, '404.html');
    if (existsSync(notFoundPath)) {
      const html = await readFile(notFoundPath, 'utf-8');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  jsonRes(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   Claude Code 精通之路 - 服务已启动  ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  网站地址:   http://localhost:${PORT}`);
  console.log(`  管理后台:   http://localhost:${PORT}/admin`);
  console.log(`  管理密码:   ${PASSWORD}`);
  console.log(`  静态目录:   ${DIST_DIR}`);
  console.log(`  内容目录:   ${CONTENT_DIR}`);
  console.log(`  自动发布:   ${AUTO_BUILD ? '开启（保存后自动 build + git push）' : '关闭'}`);
  console.log('');
});
