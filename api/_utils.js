// Shared utilities for Vercel serverless functions
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'grl2345/claude-code-mastery';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

function unauthorized(res) {
  return res.status(401).json({ error: '未授权' });
}

function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === ADMIN_PASSWORD;
}

async function githubFetch(path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
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

module.exports = { checkAuth, unauthorized, githubFetch, parseFrontmatter, buildFrontmatter, ADMIN_PASSWORD };
