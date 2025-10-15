const Mega = require('megajs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  if (process.env.USE_MEGA !== '1') return res.status(500).json([]);
  try {
    const storage = new Mega.Storage({ email: process.env.MEGA_EMAIL, password: process.env.MEGA_PASSWORD, autoload: true });
    await new Promise((resolve) => storage.on('ready', resolve));
    const submissionsName = 'submissions.json';
    const node = storage.root.children.find(c => c.name === submissionsName);
    if (!node) return res.json([]);
    const buf = await node.download();
    const data = JSON.parse(buf.toString());
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
};
