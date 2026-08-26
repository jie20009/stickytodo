/**
 * pet.js - Character pack system (StickyTodo Desktop Pet, Stage 1)
 *
 * Scans ~/.stickytodo/img/ for character packs.
 *   - Each subdirectory is one character pack.
 *   - Each pack contains config.xml + PNG frame files.
 *   - config.xml format:
 *       <character name="default" emoji="\ud83d\udc31">
 *         <animation name="idle" fps="2" frames="\ud83d\udc31,\ud83d\ude3a" />
 *         <animation name="walk" fps="6" frames="\ud83d\udc31,\ud83d\udc08" />
 *         ...
 *       </character>
 *
 *   - frames can be a comma-separated list of emoji (used as-is) OR
 *     file basenames (e.g. "idle_0.png" — looked up in the pack dir).
 *
 * No npm dependencies. Uses Node fs + os + path. XML parsing is a
 * small regex-based helper because Electron's main process has no DOMParser.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const IMG_DIR  = path.join(os.homedir(), '.stickytodo', 'img');

// Built-in character packs. Each entry defines one species via emoji frames.
// `id` (the directory name under IMG_DIR) is used as the pack identifier
// across the app (createPet, getCharacterPack, UI selection).
// All 7 standard animations are defined for each species: idle, walk, happy,
// sleep, celebrate, busy, anxious. Frames are emoji strings rendered via CSS.
//
// Design rules:
//   - NO expression switching in idle/happy. Every species keeps the same
//     emoji across idle & happy frames (just repeats it) so the pet never
//     looks like it's "morphing into a smiley". Motion comes from CSS only.
//   - Only the default cat pack keeps 🐱→😺 because cat face emojis (😺😻)
//     are species-specific and look natural. All other species repeat.
//   - walk uses species + 🐾 (paw prints) to suggest movement.
//   - sleep uses 😴 💤, celebrate uses 🎉 ✨ (universal).
//   - Animals use FULL-BODY emoji where available (🐈 not 🐱, 🐕 not 🐶,
//     🐇 not 🐰) so the pet looks like a whole animal, not just a head.
//   - fox uses 🐿️ (chipmunk, full body with tail) — 🦊/🦝 render as face on Windows.
//   - hamster uses 🐁 (mouse, full body) — 🐹 is face-only, no full hamster.
//   - panda uses 🐻 (bear, full body standing) — 🐼/🐨 render as face on Windows.
//   - Human characters use person emojis that render consistently on Windows:
//       beauty = 💃 (dancing woman, full body)
//       prince = 🚶 (person walking, full body) — 👱 renders as head+shoulders
//                     on Windows Segoe UI Emoji, 🤴 renders as a king face.
//
// Species chosen by popularity (high search/social热度):
//   default  🐈 cat      — original pack, kept for backward compat
//   dog      🐕 dog      — #1 most popular pet
//   rabbit   🐇 rabbit   — popular cute pet
//   panda    🐻 panda    — national treasure vibe (bear full body on Windows)
//   fox      🐿️ fox      — trendy cute animal (chipmunk full body on Windows)
//   hamster  🐁 hamster  — internet-famous small pet (mouse full body)
//   penguin  🐧 penguin  — universally loved
//   beauty   💃 beauty   — user requested
//   prince   🚶 prince   — user requested (walking person, full body)
const BUILTIN_PACKS = [
  {
    id: 'default',
    emoji: '\ud83d\udc08',
    xml: [
      '<character name="default" emoji="\ud83d\udc08">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc08,\ud83d\udc08" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc08,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc08,\ud83d\udc08" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc08" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc08" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'dog',
    emoji: '\ud83d\udc15',
    xml: [
      '<character name="dog" emoji="\ud83d\udc15">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc15,\ud83d\udc15" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc15,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc15,\ud83d\udc15" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc15" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc15" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'rabbit',
    emoji: '\ud83d\udc07',
    xml: [
      '<character name="rabbit" emoji="\ud83d\udc07">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc07,\ud83d\udc07" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc07,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc07,\ud83d\udc07" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc07" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc07" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'panda',
    emoji: '\ud83d\udc3b',
    xml: [
      '<character name="panda" emoji="\ud83d\udc3b">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc3b,\ud83d\udc3b" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc3b,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc3b,\ud83d\udc3b" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc3b" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc3b" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'fox',
    emoji: '\ud83d\udc3f',
    xml: [
      '<character name="fox" emoji="\ud83d\udc3f">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc3f,\ud83d\udc3f" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc3f,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc3f,\ud83d\udc3f" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc3f" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc3f" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'hamster',
    emoji: '\ud83d\udc01',
    xml: [
      '<character name="hamster" emoji="\ud83d\udc01">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc01,\ud83d\udc01" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc01,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc01,\ud83d\udc01" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc01" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc01" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'penguin',
    emoji: '\ud83d\udc27',
    xml: [
      '<character name="penguin" emoji="\ud83d\udc27">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc27,\ud83d\udc27" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc27,\ud83d\udc3e" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc27,\ud83d\udc27" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc27" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc27" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'beauty',
    emoji: '\ud83d\udc83',
    xml: [
      '<character name="beauty" emoji="\ud83d\udc83">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udc83,\ud83d\udc83" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udc83,\ud83d\udc83" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udc83,\ud83d\udc83" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udc83" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udc83" />',
      '</character>',
      '',
    ].join('\n'),
  },
  {
    id: 'prince',
    emoji: '\ud83d\udeb6',
    xml: [
      '<character name="prince" emoji="\ud83d\udeb6">',
      '  <animation name="idle"      fps="2" frames="\ud83d\udeb6,\ud83d\udeb6" />',
      '  <animation name="walk"      fps="6" frames="\ud83d\udeb6,\ud83d\udeb6" />',
      '  <animation name="happy"     fps="3" frames="\ud83d\udeb6,\ud83d\udeb6" />',
      '  <animation name="sleep"     fps="1" frames="\ud83d\ude34,\ud83d\udca4" />',
      '  <animation name="celebrate" fps="4" frames="\ud83c\udf89,\u2728,\ud83c\udf89,\u2728" />',
      '  <animation name="busy"      fps="2" frames="\ud83d\ude2b,\ud83d\udeb6" />',
      '  <animation name="anxious"   fps="3" frames="\ud83d\ude1f,\ud83d\udeb6" />',
      '</character>',
      '',
    ].join('\n'),
  },
];

// Backward-compat alias: old code references DEFAULT_XML for the cat pack.
const DEFAULT_XML = BUILTIN_PACKS[0].xml;

/**
 * Parse the simple config.xml format used by StickyTodo character packs.
 *
 * Returns an object:
 *   {
 *     id: 'default',
 *     name: 'default',
 *     emoji: '\ud83d\udc31',
 *     animations: {
 *       idle:      { name: 'idle', fps: 2, frames: ['\ud83d\udc31','\ud83d\ude3a'], mode: 'emoji' },
 *       walk:      { name: 'walk', fps: 6, frames: ['\ud83d\udc31','\ud83d\udc08'], mode: 'emoji' },
 *       ...
 *     },
 *     sounds: { walk: 'walk.wav', ... },
 *     basePath: '/home/user/.stickytodo/img/default',   // absolute
 *     packDir:  'default',                              // relative to IMG_DIR
 *   }
 *
 * `mode` is 'emoji' when every frame is non-empty and not a file basename,
 * otherwise 'image' (file:// URL). Files are resolved via file:// URL.
 */
function parseConfigXml(xml, packDirAbs, packDirRel) {
  const out = {
    id: packDirRel,
    name: packDirRel,
    emoji: '\ud83d\udc31',
    animations: {},
    sounds: {},
    basePath: packDirAbs,
    packDir:  packDirRel,
  };

  // <character name="..." emoji="...">
  const charMatch = xml.match(/<character\b([^>]*)>/i);
  if (charMatch) {
    const attrStr = charMatch[1];
    const nameM  = attrStr.match(/\bname\s*=\s*"([^"]*)"/i);
    const emojiM = attrStr.match(/\bemoji\s*=\s*"([^"]*)"/i);
    if (nameM)  out.name  = nameM[1];
    if (emojiM) out.emoji = emojiM[1];
  }

  // <animation name="..." fps="..." frames="..." />
  const animRe = /<animation\b([^/>]*)\/?>(?:\s*<\/animation>)?/gi;
  let m;
  while ((m = animRe.exec(xml)) !== null) {
    const attrs = m[1];
    const nameM = attrs.match(/\bname\s*=\s*"([^"]*)"/i);
    const fpsM  = attrs.match(/\bfps\s*=\s*"([^"]*)"/i);
    const frM   = attrs.match(/\bframes\s*=\s*"([^"]*)"/i);
    if (!nameM || !frM) continue;

    const name = nameM[1];
    const fps  = fpsM ? Math.max(1, Math.min(60, parseInt(fpsM[1], 10) || 1)) : 2;
    const rawFrames = frM[1].split(',').map((s) => s.trim()).filter(Boolean);

    // Decide mode: if any frame ends with .png/.jpg/.gif/.webp/.jpeg, treat all
    // as file paths (missing ones stay emoji). Mixed-mode is fine for forward
    // compatibility but in practice packs will be uniform.
    const looksLikeImage = (s) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(s);

    const frames = rawFrames.map((s) => {
      if (looksLikeImage(s)) {
        const abs = path.join(packDirAbs, s);
        // Use ASCII file URL to be safe across platforms
        return 'file:///' + abs.replace(/\\/g, '/');
      }
      return s;
    });

    out.animations[name] = {
      name,
      fps,
      frames,
      mode: frames.some((f) => f.startsWith('file:')) ? 'image' : 'emoji',
    };
  }

  // <sound name="..." file="..." /> AND <sound event="walk">walk.wav</sound>
  // Stage 6.1: support both attribute-style (name= + file=) and child-text-style
  // (event= attribute + WAV path as the element's body). Both formats are
  // resolved to absolute file:// URLs so the renderer can play them via
  // HTML5 Audio.
  const soundAttrRe = /<sound\b([^/>]*)\/?>(?:\s*<\/sound>)?/gi;
  while ((m = soundAttrRe.exec(xml)) !== null) {
    const attrs = m[1];
    // Key: prefer `event=`, fall back to `name=` for legacy packs.
    const evtM = attrs.match(/\bevent\s*=\s*"([^"]*)"/i);
    const nameM = attrs.match(/\bname\s*=\s*"([^"]*)"/i);
    const key = (evtM && evtM[1]) || (nameM && nameM[1]);
    if (!key) continue;

    // Path: prefer `file=` attribute, fall back to element body (text content).
    let filePath = null;
    const fileM = attrs.match(/\bfile\s*=\s*"([^"]*)"/i);
    if (fileM) {
      filePath = fileM[1];
    } else {
      // Capture the body text between <sound ...> and </sound>.
      const startIdx = m.index + m[0].indexOf('>') + 1;
      const endIdx = xml.indexOf('</sound>', startIdx);
      if (endIdx > startIdx) {
        const body = xml.slice(startIdx, endIdx).trim();
        if (body) filePath = body;
      }
    }
    if (!filePath) continue;
    const abs = path.join(packDirAbs, filePath);
    out.sounds[key] = 'file:///' + abs.replace(/\\/g, '/');
  }

  // Guarantee at least the 'idle' animation exists; if config.xml lacks it,
  // synthesize one from the pack's emoji so the pet never goes blank.
  if (!out.animations.idle) {
    out.animations.idle = {
      name: 'idle',
      fps: 2,
      frames: [out.emoji, out.emoji],
      mode: 'emoji',
    };
  }

  return out;
}

/**
 * Scan the IMG_DIR for character packs. Returns an array of parsed packs.
 *
 * Always includes all built-in packs (cat, dog, rabbit, panda, fox, hamster,
 * penguin), even if no on-disk pack exists. If a directory with the same id
 * exists on disk, its config.xml takes precedence over the built-in.
 */
function listCharacterPacks() {
  // Built-in packs — always present, parsed from BUILTIN_PACKS.
  const result = BUILTIN_PACKS.map((p) =>
    parseConfigXml(p.xml, path.join(IMG_DIR, p.id), p.id)
  );

  let entries = [];
  try {
    if (fs.existsSync(IMG_DIR)) {
      entries = fs.readdirSync(IMG_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    }
  } catch (_) {
    entries = [];
  }

  for (const name of entries) {
    const dir = path.join(IMG_DIR, name);
    const cfg = path.join(dir, 'config.xml');
    if (!fs.existsSync(cfg)) continue; // skip dirs without config
    try {
      const xml = fs.readFileSync(cfg, 'utf-8');
      const parsed = parseConfigXml(xml, dir, name);
      // Skip if it parsed to zero usable animations
      if (parsed.animations && Object.keys(parsed.animations).length > 0) {
        // If a built-in has the same id, replace it; otherwise append.
        const idx = result.findIndex((p) => p.id === name);
        if (idx >= 0) {
          result[idx] = parsed;
        } else {
          result.push(parsed);
        }
      }
    } catch (_) {
      // ignore unreadable packs
    }
  }

  return result;
}

/**
 * Look up a single pack by id (= directory name under IMG_DIR).
 * Falls back to the built-in default if not found.
 */
function getCharacterPack(id) {
  const packs = listCharacterPacks();
  return packs.find((p) => p.id === id) || packs[0];
}

/**
 * Ensure ~/.stickytodo/img/<packId>/config.xml exists for every built-in
 * pack. Creates the directory + config.xml from BUILTIN_PACKS if missing.
 * Returns the default pack's absolute directory path (backward compat).
 *
 * Stage 1 ships emoji-only frames (no PNGs) so we do NOT create PNG files —
 * the renderer renders emoji via CSS, which avoids bundling binary assets.
 */
function ensureDefaultCharacter() {
  let defaultDir = path.join(IMG_DIR, 'default');
  try {
    if (!fs.existsSync(IMG_DIR)) {
      fs.mkdirSync(IMG_DIR, { recursive: true });
    }
    for (const p of BUILTIN_PACKS) {
      const dir = path.join(IMG_DIR, p.id);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const cfgPath = path.join(dir, 'config.xml');
      if (!fs.existsSync(cfgPath)) {
        fs.writeFileSync(cfgPath, p.xml, 'utf-8');
      }
      if (p.id === 'default') defaultDir = dir;
    }
  } catch (err) {
    // If we can't create the dir (permissions, etc.) just return the path —
    // the in-memory BUILTIN_PACKS still works via parseConfigXml.
  }
  return defaultDir;
}

/**
 * Rescan packs and return them. Convenience wrapper.
 */
function refreshCharacterPacks() {
  return listCharacterPacks();
}

/**
 * Initialize the pet system: make sure the default pack exists on disk
 * and warm the in-memory pack list. Call once at app startup.
 */
function initPetSystem() {
  const dir = ensureDefaultCharacter();
  // Warm list (also validates default by parsing DEFAULT_XML).
  const packs = listCharacterPacks();
  return { imgDir: IMG_DIR, defaultDir: dir, packs };
}

module.exports = {
  initPetSystem,
  listCharacterPacks,
  getCharacterPack,
  ensureDefaultCharacter,
  refreshCharacterPacks,
  // exposed for tests
  parseConfigXml,
  IMG_DIR,
};
