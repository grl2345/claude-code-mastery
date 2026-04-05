const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'grl2345/claude-code-mastery';

function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === ADMIN_PASSWORD;
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^\d+$/.test(val)) val = parseInt(val);
    meta[key] = val;
  });
  return { meta, body: match[2] };
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  const order = ['title','module','order','group','description','duration','level','publishedAt','updatedAt','draft'];
  for (const key of order) {
    if (meta[key] === undefined || meta[key] === '') continue;
    const val = meta[key];
    lines.push(typeof val === 'string' ? `${key}: "${val}"` : `${key}: ${val}`);
  }
  lines.push('---');
  return lines.join('\n');
}

async function ghFetch(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'claude-code-mastery-admin',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub ${res.status}: ${err}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!checkAuth(req)) return res.status(401).json({ error: '未授权' });

  // Parse article ID from URL path (fallback from req.query for rewrite compatibility)
  let articleId = Array.isArray(req.query.id) ? req.query.id.join('/') : req.query.id;
  if (!articleId) {
    const urlPath = req.url.split('?')[0];
    const match = urlPath.match(/\/api\/articles\/(.+)/);
    if (match) articleId = decodeURIComponent(match[1]);
  }
  if (!articleId) return res.status(400).json({ error: '缺少文章 ID' });

  const path = `content/${articleId}.md`;

  try {
    if (req.method === 'GET') {
      const fileData = await ghFetch(`/contents/${path}?ref=main`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      const { meta, body } = parseFrontmatter(content);
      return res.json({ id: articleId, sha: fileData.sha, ...meta, body });
    }

    if (req.method === 'PUT') {
      const data = req.body;
      const current = await ghFetch(`/contents/${path}?ref=main`);
      const meta = { ...data };
      const body = meta.body || '';
      delete meta.body; delete meta.id; delete meta.sha;
      const fileContent = buildFrontmatter(meta) + '\n' + body;
      await ghFetch(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新文章: ${data.title || articleId}`,
          content: Buffer.from(fileContent).toString('base64'),
          sha: current.sha,
          branch: 'main',
        }),
      });
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const current = await ghFetch(`/contents/${path}?ref=main`);
      const title = req.body?.title || articleId;
      await ghFetch(`/contents/${path}`, {
        method: 'DELETE',
        body: JSON.stringify({
          message: `删除文章: ${title}`,
          sha: current.sha,
          branch: 'main',
        }),
      });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const status = e.message.includes('404') ? 404 : 500;
    return res.status(status).json({ error: e.message });
  }
};
