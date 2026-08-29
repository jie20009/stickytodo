const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DB = path.join(os.homedir(), '.stickytodo', 'data.db');
(async () => {
  const SQL = await initSqlJs({ locateFile: f => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) });
  const db = new SQL.Database(fs.readFileSync(DB));
  var s = db.prepare("SELECT key, value FROM sidebar_state WHERE key IN ('pet3DEnabled','petEnabled')");
  while (s.step()) {
    var r = s.getAsObject();
    console.log(r.key + '=' + r.value);
  }
  s.free();
  db.close();
})().catch(e => { console.error(e); process.exit(1); });
