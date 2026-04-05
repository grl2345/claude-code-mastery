const { checkAuth, unauthorized, githubFetch, parseFrontmatter, buildFrontmatter } = require('../_utils');

async function getArticle(id) {
  const path = `content/${id}.md`;
  const fileData = await githubFetch(`/contents/${path}?ref=main`);
  const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
  const { meta, body } = parseFrontmatter(content);
  return { id, sha: fileData.sha, ...meta, body };
}

async function updateArticle(id, data) {
  const path = `content/${id}.md`;

  // Get current file SHA (required for update)
  const current = await githubFetch(`/contents/${path}?ref=main`);

  const meta = { ...data };
  const body = meta.body || '';
  delete meta.body;
  delete meta.id;
  delete meta.sha;
  const fileContent = buildFrontmatter(meta) + '\n' + body;

  await githubFetch(`/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `更新文章: ${data.title || id}`,
      content: Buffer.from(fileContent).toString('base64'),
      sha: current.sha,
      branch: 'main',
    }),
  });
}

async function deleteArticle(id, title) {
  const path = `content/${id}.md`;
  const current = await githubFetch(`/contents/${path}?ref=main`);

  await githubFetch(`/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message: `删除文章: ${title || id}`,
      sha: current.sha,
      branch: 'main',
    }),
  });
}

module.exports = async function handler(req, res) {
  if (!checkAuth(req)) return unauthorized(res);

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: '缺少文章 ID' });

  // Vercel catch-all gives array, join it back
  const articleId = Array.isArray(id) ? id.join('/') : id;

  try {
    if (req.method === 'GET') {
      const article = await getArticle(articleId);
      return res.json(article);
    }

    if (req.method === 'PUT') {
      await updateArticle(articleId, req.body);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      await deleteArticle(articleId, req.body?.title);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const status = e.message.includes('404') ? 404 : 500;
    return res.status(status).json({ error: e.message });
  }
};
