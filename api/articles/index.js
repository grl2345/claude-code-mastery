const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'grl2345/claude-code-mastery';

const moduleNames = {
  'm1-basics': '基础篇',
  'm2-thinking': '思维篇',
  'm3-practice': '实战篇',
  'm4-advanced': '进阶篇',
};
const MODULES = Object.keys(moduleNames);

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!checkAuth(req)) return res.status(401).json({ error: '未授权' });

  try {
    if (req.method === 'GET') {
      const articles = [];
      for (const mod of MODULES) {
        try {
          const files = await ghFetch(`/contents/content/${mod}?ref=main`);
          for (const file of files.filter(f => f.name.endsWith('.md'))) {
            const fileData = await ghFetch(`/contents/content/${mod}/${file.name}?ref=main`);
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const { meta, body } = parseFrontmatter(content);
            articles.push({
              id: `${mod}/${file.name.replace('.md', '')}`,
              module: mod, filename: file.name, sha: fileData.sha,
              ...meta, bodyLength: body.trim().length,
            });
          }
        } catch { /* module dir not found, skip */ }
      }
      articles.sort((a, b) => {
        if (a.module !== b.module) return a.module.localeCompare(b.module);
        return (a.order || 0) - (b.order || 0);
      });
      return res.json({ articles, moduleNames });
    }

    if (req.method === 'POST') {
      const data = req.body;
      if (!data.module || !data.filename)
        return res.status(400).json({ error: '缺少 module 或 filename' });
      const filename = data.filename.replace('.md', '') + '.md';
      const path = `content/${data.module}/${filename}`;
      const meta = { ...data };
      const body = meta.body || '';
      delete meta.body; delete meta.filename;
      const fileContent = buildFrontmatter(meta) + '\n' + body;
      await ghFetch(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `新建文章: ${data.title || filename}`,
          content: Buffer.from(fileContent).toString('base64'),
          branch: 'main',
        }),
      });
      return res.json({ success: true, id: `${data.module}/${filename.replace('.md', '')}` });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
