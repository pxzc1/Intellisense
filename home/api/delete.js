const Mega = require('megajs');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).end();
  if (process.env.USE_MEGA !== '1') return res.status(500).json({ status: 'error' });
  try {
    const storage = new Mega.Storage({ email: process.env.MEGA_EMAIL, password: process.env.MEGA_PASSWORD, autoload: true });
    await new Promise((resolve) => storage.on('ready', resolve));
    const submissionsName = 'submissions.json';
    const node = storage.root.children.find(c => c.name === submissionsName);
    const id = req.query.filename || req.url.split('/').pop();
    let data = [];
    if (node) {
      const buf = await node.download();
      data = JSON.parse(buf.toString());
    }
    const target = data.find(s => s.filename === id);
    if (target && target.megaLink) {
      // best-effort: find node by name and remove
      const fileNode = storage.root.children.find(c => c.name === target.filename || c.name === (target.url && target.url.split('/').pop()));
      if (fileNode && typeof fileNode.remove === 'function') {
        await new Promise((resolve) => fileNode.remove(resolve));
      }
    }
    data = data.filter(s => s.filename !== id);
    // remove old submissions.json
    if (node && typeof node.remove === 'function') await new Promise((resolve) => node.remove(resolve));
    // upload new submissions.json
    const { Readable } = require('stream');
    const sstream = new Readable(); sstream._read = () => {}; sstream.push(Buffer.from(JSON.stringify(data, null, 2))); sstream.push(null);
    await new Promise((resolve, reject) => {
      const n = storage.upload({ name: submissionsName }, sstream);
      n.on('complete', resolve);
      n.on('error', reject);
    });
    res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
};