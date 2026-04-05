const { checkAuth, unauthorized, githubFetch, parseFrontmatter, buildFrontmatter } = require('../_utils');

const moduleNames = {
  'm1-basics': '基础篇',
  'm2-thinking': '思维篇',
  'm3-practice': '实战篇',
  'm4-advanced': '进阶篇',
};

const MODULES = Object.keys(moduleNames);

async function listArticles() {
  const articles = [];
  for (const mod of MODULES) {
    try {
      const files = await githubFetch(`/contents/content/${mod}?ref=main`);
      for (const file of files.filter(f => f.name.endsWith('.md'))) {
        const fileData = await githubFetch(`/contents/content/${mod}/${file.name}?ref=main`);
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const { meta, body } = parseFrontmatter(content);
        articles.push({
          id: `${mod}/${file.name.replace('.md', '')}`,
          module: mod,
          filename: file.name,
          sha: fileData.sha,
          ...meta,
          bodyLength: body.trim().length,
        });
      }
    } catch {
      // Module directory doesn't exist yet, skip
    }
  }
  articles.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return (a.order || 0) - (b.order || 0);
  });
  return articles;
}

async function createArticle(data) {
  if (!data.module || !data.filename) {
    throw new Error('缺少 module 或 filename');
  }
  const filename = data.filename.replace('.md', '') + '.md';
  const path = `content/${data.module}/${filename}`;

  const meta = { ...data };
  const body = meta.body || '';
  delete meta.body;
  delete meta.filename;
  const fileContent = buildFrontmatter(meta) + '\n' + body;

  await githubFetch(`/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `新建文章: ${data.title || filename}`,
      content: Buffer.from(fileContent).toString('base64'),
      branch: 'main',
    }),
  });

  return { id: `${data.module}/${filename.replace('.md', '')}` };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!checkAuth(req)) return unauthorized(res);

  try {
    if (req.method === 'GET') {
      const articles = await listArticles();
      return res.json({ articles, moduleNames });
    }

    if (req.method === 'POST') {
      const result = await createArticle(req.body);
      return res.json({ success: true, ...result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
