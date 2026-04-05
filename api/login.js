module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const password = process.env.ADMIN_PASSWORD || 'cc-admin-2026';
    const { password: inputPw } = req.body || {};

    if (!inputPw) {
      return res.status(400).json({ error: '请输入密码' });
    }
    if (inputPw !== password) {
      return res.status(401).json({ error: '密码错误' });
    }
    return res.status(200).json({ token: password });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
