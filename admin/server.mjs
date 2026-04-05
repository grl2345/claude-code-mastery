import { createServer } from 'node:http';
import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

const PORT = process.env.ADMIN_PORT || 4000;
const PASSWORD = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
const CONTENT_DIR = join(import.meta.dirname, '..', 'content');
const ADMIN_HTML = join(import.meta.dirname, 'index.html');

// Simple token store (in-memory, resets on restart)
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

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Remove surrounding quotes
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
    if (typeof val === 'string' && (val.includes(':') || val.includes('"') || val.includes("'") || val.includes('#'))) {
      lines.push(`${key}: "${val}"`);
    } else if (typeof val === 'string' && key !== 'draft' && key !== 'order') {
      lines.push(`${key}: "${val}"`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

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
        module: mod,
        filename: file,
        ...meta,
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

const moduleNames = {
  'm1-basics': '基础篇',
  'm2-thinking': '思维篇',
  'm3-practice': '实战篇',
  'm4-advanced': '进阶篇',
};

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

  // Serve admin HTML
  if (path === '/' || path === '/admin') {
    const html = await readFile(ADMIN_HTML, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // Login
  if (path === '/api/login' && req.method === 'POST') {
    try {
      const { password } = await parseBody(req);
      if (password !== PASSWORD) return json(res, { error: '密码错误' }, 401);
      const token = generateToken();
      tokens.add(token);
      return json(res, { token });
    } catch {
      return json(res, { error: '请求格式错误' }, 400);
    }
  }

  // All other API routes require auth
  if (path.startsWith('/api/')) {
    if (!checkAuth(req)) return json(res, { error: '未授权' }, 401);

    // List articles
    if (path === '/api/articles' && req.method === 'GET') {
      const articles = await getAllArticles();
      return json(res, { articles, moduleNames });
    }

    // Get single article
    const articleMatch = path.match(/^\/api\/articles\/(.+)$/);
    if (articleMatch && req.method === 'GET') {
      const article = await getArticle(decodeURIComponent(articleMatch[1]));
      if (!article) return json(res, { error: '文章不存在' }, 404);
      return json(res, article);
    }

    // Update article
    if (articleMatch && req.method === 'PUT') {
      try {
        const data = await parseBody(req);
        await saveArticle(decodeURIComponent(articleMatch[1]), data);
        return json(res, { success: true });
      } catch (e) {
        return json(res, { error: e.message }, 500);
      }
    }

    // Delete article
    if (articleMatch && req.method === 'DELETE') {
      const ok = await deleteArticle(decodeURIComponent(articleMatch[1]));
      if (!ok) return json(res, { error: '文章不存在' }, 404);
      return json(res, { success: true });
    }

    // Create article
    if (path === '/api/articles' && req.method === 'POST') {
      try {
        const data = await parseBody(req);
        if (!data.module || !data.filename) {
          return json(res, { error: '缺少 module 或 filename' }, 400);
        }
        const id = `${data.module}/${data.filename.replace('.md', '')}`;
        const existing = await getArticle(id);
        if (existing) return json(res, { error: '文件已存在' }, 409);
        delete data.filename;
        await saveArticle(id, data);
        return json(res, { success: true, id });
      } catch (e) {
        return json(res, { error: e.message }, 500);
      }
    }
  }

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`\n  后台管理系统已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  默认密码: ${PASSWORD}`);
  console.log(`  内容目录: ${CONTENT_DIR}\n`);
});
