// Read GLB animation clip names
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'assets');
const files = ['Soldier.glb','Xbot.glb','Michelle.glb','Flamingo.glb','Parrot.glb','Stork.glb','Horse.glb'];
files.forEach(f => {
  const fp = path.join(dir, f);
  if (!fs.existsSync(fp)) { console.log(f + ': NOT FOUND'); return; }
  const buf = fs.readFileSync(fp);
  // GLB format: 12-byte header (magic, version, length) + JSON chunk (length, type, data) + BIN chunk
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.slice(20, 20 + jsonChunkLen).toString('utf-8');
  try {
    const gltf = JSON.parse(jsonStr);
    const anims = (gltf.animations || []).map(a => a.name || '(unnamed)');
    console.log(f + ': ' + anims.join(', '));
  } catch (e) {
    console.log(f + ': parse err - ' + e.message);
  }
});
