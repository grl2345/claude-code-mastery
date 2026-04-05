const { ADMIN_PASSWORD } = require('./_utils');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  // Use password as token (HTTPS on Vercel, safe enough)
  return res.json({ token: ADMIN_PASSWORD });
};
