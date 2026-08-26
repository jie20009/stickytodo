/**
 * pet-window.js - Renderer logic for StickyTodo Desktop Pet window
 *
 * Loaded by pet.html. Responsibilities:
 *   - Resolve petId from --stickytodo-pet-id= additionalArguments
 *   - Load the character pack via pet:* IPC channels
 *   - Initialize PetRenderer.createPetRenderer()
 *   - Implement drag + throw physics (pure JS, no library)
 *   - Provide a right-click context menu
 *   - Persist window position to DB (debounced)
 *   - Listen for pet:changed events to update expression/state
 *   - Handle level-up animation, dialogue bubbles, click/pet/feed interactions
 *
 * Drag/throw model:
 *   - On mousedown: record start position + time
 *   - On mousemove: compute cursor delta, move window by that delta,
 *                   record (timestamp, x, y) sample for velocity calc
 *   - On mouseup: if |velocity| > threshold, enter throw mode
 *   - Throw: per-frame integrate velocity, apply friction (0.95),
 *            bounce off screen edges (factor 0.6), stop when |v| < epsilon
 */

(function () {
  'use strict';

  var api = window.electronAPI || {};
  var petId = (api.petId != null && api.petId !== '') ? String(api.petId) : 'default';
  var screenW = Number(api.petScreenW) || 1024;
  var screenH = Number(api.petScreenH) || 768;
  var workY   = Number(api.petWorkY)   || 0;   // taskbar / menu offset

  // ---------------------------------------------------------------------------
  // Intimacy-tier dialogue (Stage 4)
  //   cold        <100, friendly 100-299, passionate 300-599,
  //   intimate    600-899, philosophical 900+
  //   Each tier has 10 lines. Speaker language: Chinese only (no i18n) —
  //   this is the pet's personal voice, distinct from app strings.
  // ---------------------------------------------------------------------------
  var DIALOGUE = {
    cold: [
      '...你在干嘛？', '别一直盯着我看。', '...嗯。', '你好。', '今天也是普通的一天。',
      '...什么事？', '哦，是你啊。', '...知道了。', '...嗯，还行吧。', '没什么想说。'
    ],
    friendly: [
      '今天也要加油哦！', '做得不错呢~', '需要帮忙吗？', '最近怎么样？', '天气不错呢。',
      '一起努力吧！', '你来了，真好。', '今天的计划是什么？', '嗯，我在听。', '别太累了。'
    ],
    passionate: [
      '最喜欢你了！', '今天也辛苦啦~', '抱抱~', '你在想什么？', '一起吃点什么吧！',
      '好开心见到你！', '今天的你很棒！', '别走嘛~', '摸摸头~', '今天也要一起哦！'
    ],
    intimate: [
      '一直陪着你。', '有你在真好。', '安静的时光也不错。', '谢谢你一直在。', '想永远这样。',
      '你的笑容很珍贵。', '安心地休息吧。', '我会守护你的。', '你是我最重要的存在。', '慢慢来，不着急。'
    ],
    philosophical: [
      '时间是不断流逝的，但记忆是永恒的。', '每一个待办都是一次承诺。', '完成的不是任务，是成长。',
      '过去无法改变，未来由现在开始。', '坚持比完美更重要。', '今天的事今天做，明天有新的可能。',
      '生活不是待办清单，但待办让生活有序。', '每一笔记录都是你存在的证明。', '珍惜当下，期待未来。',
      '你比你想象中更坚强。'
    ]
  };

  // Outfit unlock levels — used by settings UI. Kept in sync with app.js.
  var OUTFIT_UNLOCKS = {
    hat:     5,
    glasses: 6,
    crown:   9,
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var PET_W = 64;
  var PET_H = 64;

  var drag = {
    active: false,
    startMouseX: 0,
    startMouseY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    startWinX: 0,
    startWinY: 0,
    samples: [],   // [{t, x, y}, ...] recent mouse positions for velocity
    pointerId: null,
    downAt: 0,     // for double-click detection
    lastDownAt: 0, // for double-click detection (timestamp of last tap-down)
    pendingTapTimer: null, // setTimeout handle for tap-vs-double-click resolution
  };

  // Stage 5: tracking flags reflecting the chase mouse state (driven from
  // pet:changed events whose event is 'chasing' or 'chaseStop'). Used by
  // the right-click menu to show a checked toggle.
  var isChasing = false;
  var currentPack = null;        // Stage 5.3: morph needs to know current pack
  var currentTheme = 'dark';     // Stage 6.2: data-theme applied to container

  var throwState = {
    active: false,
    vx: 0,
    vy: 0,
    rafId: 0,
  };

  var pet = null;
  var container = null;       // pet container DOM (for outfit overlay)
  var lastState = null;
  var lastLevel = 1;
  var lastOutfit = null;
  var lastIntimacy = 0;
  var posSaveTimer = null;
  var dialogueTimer = null;
  var dialogueHideTimer = null;
  var dialogueEl = null;
  var lastEventAppliedAt = 0;     // dedup pet:changed events within 250ms
  var lastEventKey = '';

  // ── Window resize state ──
  // Tracks which sources need the window expanded (dialogue, level-up).
  // Only shrink to 64×64 when ALL sources are done.
  var resizeState = { dialogue: false, levelUp: false };

  function updateWindowSize() {
    if (resizeState.dialogue || resizeState.levelUp) {
      // At least one source needs expanded window — use the larger width.
      var w = resizeState._dialogueW || 140;
      if (resizeState.levelUp && !resizeState.dialogue) w = 140;
      var h = 64 + 50;
      if (api.pet && api.pet._resizeWindow) api.pet._resizeWindow(w, h);
    } else {
      if (api.pet && api.pet._resizeWindow) api.pet._resizeWindow(64, 64);
    }
  }

  // ── Click-through hit-test state (shared across functions) ──
  // The pet window is click-through by default. When the cursor is over the
  // .pet-frame emoji we tell main to capture; when it leaves we tell main to
  // pass through. This state must be shared so onPointerUp can reset it.
  var hitStateActive = false; // false = click-through, true = capturing
  var petFrameEl = null;

  // Hit-test rect cache. Must be at IIFE scope (not inside bindEvents) so
  // onPointerUp and stopThrow can invalidate it after the window moves.
  var cachedHitRect = null;
  var cachedHitRectTime = 0;

  function invalidateHitRect() {
    cachedHitRect = null;
    cachedHitRectTime = 0;
  }

  function setHit(active) {
    if (active === hitStateActive) return;
    hitStateActive = active;
    if (api.pet && api.pet.setHitRegion) {
      api.pet.setHitRegion(active);
    }
  }

  // ── rAF-throttled window move ──
  // Avoids redundant IPC calls on every pointermove (~60Hz). Coalesces
  // multiple move requests into one per animation frame.
  var moveRAF = false;
  var pendingMoveX = 0;
  var pendingMoveY = 0;

  function moveWindowRAF(x, y) {
    pendingMoveX = x;
    pendingMoveY = y;
    if (moveRAF) return;
    moveRAF = true;
    requestAnimationFrame(function () {
      moveRAF = false;
      if (api.pet && api.pet._moveWindow) api.pet._moveWindow(pendingMoveX, pendingMoveY);
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function now() { return performance.now ? performance.now() : Date.now(); }

  function savePositionDebounced() {
    if (posSaveTimer) clearTimeout(posSaveTimer);
    posSaveTimer = setTimeout(function () {
      posSaveTimer = null;
      var x = window.screenX || window.screenLeft || 0;
      var y = window.screenY || window.screenTop  || 0;
      if (api.pet && api.pet.setPosition) {
        // HIGH-2 fix: include petId so multi-pet positions don't collide.
        api.pet.setPosition({ petId: petId, x: x, y: y }).catch(function () {});
      }
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Stage 6.1: Sound playback with 3-second throttle per event name
  // ---------------------------------------------------------------------------
  // The current character pack carries a `sounds` object keyed by event name
  // (e.g. { walk: 'file:///.../walk.wav', click: '...', feed: '...' }). We
  // throttle identical events to once every 3s so a long chase doesn't fire
  // the walk SFX in a stuttering loop.
  var lastSoundPlayedAt = Object.create(null);   // eventName -> timestamp
  var SOUND_THROTTLE_MS = 3000;

  function playSound(eventName) {
    if (!currentPack || !currentPack.sounds) return;
    var url = currentPack.sounds[eventName];
    if (!url) return;
    var nowMs = now();
    var last = lastSoundPlayedAt[eventName] || 0;
    if (nowMs - last < SOUND_THROTTLE_MS) return;
    lastSoundPlayedAt[eventName] = nowMs;
    try {
      var audio = new Audio(url);
      audio.volume = 0.6;
      // Best-effort play; user gestures are required by some browsers,
      // but Electron's permission policy treats file:// as safe enough.
      var p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* silently ignore autoplay rejection */ });
      }
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Drag handling
  // ---------------------------------------------------------------------------

  function onPointerDown(e) {
    // Only primary button starts drag; right click is reserved for context menu.
    if (e.button !== 0) return;
    // Hide any active dialogue and shrink window before dragging.
    hideDialogue();
    // Ignore drags that originate on UI controls (none yet, but future-proof).
    drag.active = true;
    drag.downAt = now();
    drag.pointerId = e.pointerId;
    drag.startMouseX = e.clientX;
    drag.startMouseY = e.clientY;
    drag.lastMouseX = e.clientX;
    drag.lastMouseY = e.clientY;
    drag.startWinX = window.screenX || window.screenLeft || 0;
    drag.startWinY = window.screenY || window.screenTop  || 0;
    drag.samples = [{ t: now(), x: e.clientX, y: e.clientY }];
    document.body.classList.add('is-dragging');
    if (pet) pet.onDragStart();
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (_) {}
    // Stop any in-flight throw — user is taking control.
    stopThrow();
  }

  function onPointerMove(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    var dx = e.screenX - (drag.startWinX + drag.startMouseX);
    var dy = e.screenY - (drag.startWinY + drag.startMouseY);
    // moveTo uses absolute screen coordinates — avoids the cumulative-offset
    // bug that window.moveBy would introduce (moveBy is incremental, but dx
    // here is an absolute offset from the drag origin).
    // HIGH-6 fix: clamp to screen bounds so pet can't be dragged offscreen.
    var newX = drag.startWinX + dx;
    var newY = drag.startWinY + dy;
    newX = Math.max(0, Math.min(screenW - PET_W, newX));
    newY = Math.max(workY, Math.min(screenH - PET_H, newY));
    // Use rAF-throttled IPC move (replaces window.moveTo + _moveWindow double-call).
    // _moveWindow enforces 64×64 size on main process side (anti DPI-resize).
    moveWindowRAF(newX, newY);
    drag.lastMouseX = e.clientX;
    drag.lastMouseY = e.clientY;
    drag.samples.push({ t: now(), x: e.clientX, y: e.clientY });
    // Keep only last ~120ms of samples for velocity calculation
    var cutoff = now() - 120;
    while (drag.samples.length > 2 && drag.samples[0].t < cutoff) {
      drag.samples.shift();
    }
    if (pet) pet.onDragMove(dx, dy);
  }

  function onPointerUp(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.active = false;
    document.body.classList.remove('is-dragging');
    if (pet) pet.onDragEnd();

    // Restore click-through immediately after drag ends so the window
    // doesn't keep blocking other apps. The next mousemove will re-evaluate.
    setHit(false);
    // Invalidate the cached hit-test rect — the window just moved, so the
    // old rect no longer reflects the pet's screen position. Without this,
    // the next mousemove would compare the cursor against a stale rect and
    // never re-activate the hit region, making the pet undraggable.
    invalidateHitRect();

    // Compute release velocity (px / ms) using recent samples.
    var samples = drag.samples;
    var vx = 0, vy = 0;
    if (samples.length >= 2) {
      var first = samples[0];
      var last  = samples[samples.length - 1];
      var dt = last.t - first.t;
      if (dt > 0) {
        // Use screen deltas (we don't have them directly, but clientX deltas
        // are equivalent on a 1:1 screen). Window-screen delta is consistent.
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
      }
    }
    drag.samples = [];

    // Total displacement during this gesture.
    var movedX = e.clientX - drag.startMouseX;
    var movedY = e.clientY - drag.startMouseY;
    var dist = Math.sqrt(movedX * movedX + movedY * movedY);
    var heldMs = now() - (drag.downAt || now());

    // Threshold: ~0.15 px/ms ≈ ~15 px on a 100ms flick. Below that, just stop.
    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0.15) {
      startThrow(vx, vy);
      return;
    }

    // Click vs double-click vs pet detection (Stage 4).
    // A "click" requires small displacement (<6px) and short hold (<350ms).
    // A "pet" gesture is a held press (>350ms) without movement.
    if (dist < 6) {
      if (heldMs > 350) {
        // Long-press = pet (longer affection bump). Cancel any pending tap.
        if (drag.pendingTapTimer) { clearTimeout(drag.pendingTapTimer); drag.pendingTapTimer = null; }
        drag.lastDownAt = 0;
        sendPetInteraction('longpress');
      } else {
        // Short tap — could be click or first half of a double-click.
        // If the second tap already fired (doubleclickConsumed), skip click.
        if (drag.doubleclickConsumed) {
          drag.doubleclickConsumed = false;
          drag.lastDownAt = 0;
          // Second tap already counted as a doubleclick; don't fire click.
          return;
        }
        // Defer the click decision by 250ms so we can detect a follow-up tap.
        // If a second tap lands within the wait, fire doubleclick instead.
        var upAt = now();
        if (drag.pendingTapTimer) { clearTimeout(drag.pendingTapTimer); drag.pendingTapTimer = null; }
        drag.pendingTapTimer = setTimeout(function () {
          drag.pendingTapTimer = null;
          drag.lastDownAt = 0;
          sendPetInteraction('click');
        }, 250);
      }
    } else {
      // Released after a real drag — just save position.
      savePositionDebounced();
    }
  }

  // Tap/double-click tracking. The capture-phase listener below fires
  // recordTapDown() on every pointerdown. When the second tap lands
  // within the tap-threshold window, we resolve the pending first-tap
  // callback as a doubleclick immediately — the second pointerup is then
  // a no-op for click detection.
  function recordTapDown() {
    var nowMs = now();
    // If a prior tap is still pending and the gap is < 350ms, this is the
    // second tap of a double-click. Resolve synchronously.
    if (drag.pendingTapTimer && drag.lastDownAt && (nowMs - drag.lastDownAt) < 350) {
      clearTimeout(drag.pendingTapTimer);
      drag.pendingTapTimer = null;
      drag.lastDownAt = 0;
      drag.doubleclickConsumed = true;
      sendPetInteraction('doubleclick');
      return;
    }
    drag.lastDownAt = nowMs;
    drag.doubleclickConsumed = false;
  }

  function onPointerCancel(e) {
    if (drag.active && e.pointerId === drag.pointerId) {
      drag.active = false;
      document.body.classList.remove('is-dragging');
      if (pet) pet.onDragEnd();
      savePositionDebounced();
    }
  }

  // ---------------------------------------------------------------------------
  // Throw physics
  // ---------------------------------------------------------------------------

  var FRICTION     = 0.95;   // per-frame velocity decay
  var BOUNCE       = 0.6;    // velocity scale on wall hit
  var STOP_EPSILON = 0.02;   // px / ms

  function startThrow(vx, vy) {
    throwState.active = true;
    throwState.vx = vx;
    throwState.vy = vy;
    if (pet && pet.getRoot) {
      var r = pet.getRoot();
      if (r) r.classList.add('pet--throwing');
    }
    if (throwState.rafId) cancelAnimationFrame(throwState.rafId);
    throwState.rafId = requestAnimationFrame(throwStep);
  }

  function stopThrow() {
    if (!throwState.active && !throwState.rafId) return;
    throwState.active = false;
    if (throwState.rafId) cancelAnimationFrame(throwState.rafId);
    throwState.rafId = 0;
    if (pet && pet.getRoot) {
      var r = pet.getRoot();
      if (r) r.classList.remove('pet--throwing');
    }
    // Window just finished moving — invalidate hit-test rect so the next
    // mousemove re-measures the pet's new screen position.
    invalidateHitRect();
  }

  function throwStep() {
    if (!throwState.active) return;
    throwState.rafId = requestAnimationFrame(throwStep);

    // Apply velocity. window.moveBy is px-based; velocity is px/ms.
    // Cap per-frame movement so a high flick doesn't teleport off-screen.
    var dx = clamp(throwState.vx * 16, -32, 32);
    var dy = clamp(throwState.vy * 16, -32, 32);

    var x = (window.screenX || 0) + dx;
    var y = (window.screenY || 0) + dy;

    // Clamp to work area + bounce off walls.
    var minX = 0;
    var maxX = Math.max(0, screenW - PET_W);
    var minY = workY;
    var maxY = Math.max(workY, screenH - PET_H);

    if (x < minX) {
      x = minX;
      throwState.vx = -throwState.vx * BOUNCE;
    } else if (x > maxX) {
      x = maxX;
      throwState.vx = -throwState.vx * BOUNCE;
    }
    if (y < minY) {
      y = minY;
      throwState.vy = -throwState.vy * BOUNCE;
    } else if (y > maxY) {
      y = maxY;
      throwState.vy = -throwState.vy * BOUNCE;
    }

    // Use rAF-throttled IPC move (replaces window.moveTo + _moveWindow double-call).
    moveWindowRAF(x, y);

    // Apply friction
    throwState.vx *= FRICTION;
    throwState.vy *= FRICTION;

    var speed = Math.sqrt(throwState.vx * throwState.vx + throwState.vy * throwState.vy);
    if (speed < STOP_EPSILON) {
      stopThrow();
      savePositionDebounced();
    }
  }

  // ---------------------------------------------------------------------------
  // Dialogue system (Stage 4)
  // ---------------------------------------------------------------------------

  // Pick the dialogue tier based on the current intimacy value.
  function intimacyTier(value) {
    var i = Number(value) || 0;
    if (i >= 900) return 'philosophical';
    if (i >= 600) return 'intimate';
    if (i >= 300) return 'passionate';
    if (i >= 100) return 'friendly';
    return 'cold';
  }

  // Pick a random line from the given tier.
  function pickLine(tier) {
    var list = DIALOGUE[tier] || DIALOGUE.cold;
    if (!list || list.length === 0) return '';
    var idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  /**
   * Display a dialogue bubble above the pet for ~3s.
   * Repeated calls within the same show window replace the existing bubble.
   */
  function showDialogue(text, tier) {
    if (!container) return;
    if (!text) return;
    if (dialogueHideTimer) { clearTimeout(dialogueHideTimer); dialogueHideTimer = null; }
    if (!dialogueEl) {
      dialogueEl = document.createElement('div');
      dialogueEl.className = 'pet-dialogue';
      container.appendChild(dialogueEl);
    }
    dialogueEl.textContent = text;
    // Re-trigger CSS animation by removing/adding the class.
    dialogueEl.classList.remove('pet-dialogue');
    // Force reflow so re-adding restarts the animation.
    void dialogueEl.offsetWidth;
    dialogueEl.classList.add('pet-dialogue');
    // Expand the pet window so the bubble (positioned below the 64×64 pet)
    // is visible. Measure actual rendered width via scrollWidth for accuracy.
    var bubbleW = Math.min(220, Math.max(80, dialogueEl.scrollWidth + 16));
    var winW = Math.max(64, bubbleW + 8);
    var winH = 64 + 50; // pet height + bubble area
    resizeState.dialogue = true;
    resizeState._dialogueW = winW;
    if (api.pet && api.pet._resizeWindow) api.pet._resizeWindow(winW, winH);
    // Auto-hide after 3s (matches the CSS animation duration).
    dialogueHideTimer = setTimeout(function () {
      hideDialogue();
    }, 3000);
    // Optional: log to console for debugging.
    if (typeof console !== 'undefined' && console.log) {
      console.log('[pet] ' + (tier || 'auto') + ': ' + text);
    }
  }

  function hideDialogue() {
    if (dialogueHideTimer) { clearTimeout(dialogueHideTimer); dialogueHideTimer = null; }
    if (dialogueEl && dialogueEl.parentNode) {
      dialogueEl.parentNode.removeChild(dialogueEl);
    }
    dialogueEl = null;
    // Shrink the window only if level-up isn't also active.
    resizeState.dialogue = false;
    updateWindowSize();
  }

  // Schedule the next automatic dialogue bubble (Stage 4 idle chatter).
  function scheduleNextDialogue(delayMs) {
    if (dialogueTimer) { clearTimeout(dialogueTimer); dialogueTimer = null; }
    var delay = Number(delayMs);
    if (!Number.isFinite(delay) || delay <= 0) {
      delay = 30000 + Math.floor(Math.random() * 30000); // 30–60s
    }
    dialogueTimer = setTimeout(function () {
      dialogueTimer = null;
      // Only speak if no other dialogue is currently visible.
      if (dialogueHideTimer) { scheduleNextDialogue(5000); return; }
      var tier = intimacyTier(lastIntimacy);
      var line = pickLine(tier);
      showDialogue(line, tier);
      scheduleNextDialogue();
    }, delay);
  }

  // ---------------------------------------------------------------------------
  // Interaction helpers (Stage 4 — click / pet / feed)
  // ---------------------------------------------------------------------------

  /**
   * Forward a click/pet event to main process which bumps intimacy+mood
   * and broadcasts the updated state back. We optimistically call the
   * expression change locally so the pet reacts immediately while the
   * IPC round-trip happens.
   */
  // Cooldown: ignore rapid-fire interactions within 500ms of each other.
  var lastInteractionAt = 0;
  var INTERACTION_COOLDOWN_MS = 500;

  function sendPetInteraction(kind) {
    if (!api.pet) return;
    var now = Date.now();
    if (now - lastInteractionAt < INTERACTION_COOLDOWN_MS) return;  // cooldown
    lastInteractionAt = now;
    var invokeFn = null;
    if (kind === 'click' && api.pet.click)         invokeFn = api.pet.click;
    else if (kind === 'doubleclick' && api.pet.pet) invokeFn = api.pet.pet;
    else if (kind === 'longpress' && api.pet.pet)   invokeFn = api.pet.pet;
    else if (kind === 'feed' && api.pet.feed)       invokeFn = api.pet.feed;
    if (!invokeFn) return;
    try {
      // Fire-and-forget; the main process broadcasts pet:changed which
      // our applyStateToPet listener will pick up to update the pet.
      invokeFn(petId).then(function (newState) {
        if (newState && typeof newState === 'object') {
          // The main process should also broadcast, but apply directly
          // for instant feedback.
          applyStateToPet(newState, { event: kind });
        }
      }).catch(function () {});
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Right-click context menu
  // ---------------------------------------------------------------------------

  function showContextMenu(clientX, clientY) {
    // Use native Electron context menu via IPC — the old in-window custom
    // menu was clipped by the 64×64 window with overflow:hidden.
    // Convert client coords to screen coords for Menu.popup().
    var screenX = (window.screenX || window.screenLeft || 0) + clientX;
    var screenY = (window.screenY || window.screenTop  || 0) + clientY;
    if (api.pet && api.pet._showContextMenu) {
      api.pet._showContextMenu(screenX, screenY, { petId: petId, isChasing: isChasing }).catch(function(){});
    }
  }

  // ---------------------------------------------------------------------------
  // Stage 5.1: Walk sound loop while chasing. Plays the 'walk' sound effect
  // every SOUND_THROTTLE_MS; the playSound() helper already throttles to
  // once per 3s so we just call it on the interval.
  // ---------------------------------------------------------------------------
  var walkSoundTimer = null;

  function startWalkSoundLoop() {
    if (walkSoundTimer) return;
    // Fire immediately so the chase has audible feedback from frame 1.
    playSound('walk');
    walkSoundTimer = setInterval(function () {
      playSound('walk');
    }, SOUND_THROTTLE_MS);
  }

  function stopWalkSoundLoop() {
    if (walkSoundTimer) { clearInterval(walkSoundTimer); walkSoundTimer = null; }
  }

  // ---------------------------------------------------------------------------
  // Pet initialization
  // ---------------------------------------------------------------------------

  /**
   * Apply a state object to the renderer. Handles:
   *   - Mood → base expression
   *   - Energy override (very low → 'sleep' regardless of mood)
   *   - Outfit overlay
   *   - Level-up detection (fires bubble + ring)
   *   - Temporary expression for one-shot XP events
   *
   * `opts.event` (optional) is the pet:changed event name (todoComplete,
   * overdue, levelUp, click, pet, feed, etc.). We dedupe repeated events.
   */
  function applyStateToPet(state, opts) {
    if (!state || !pet) return;
    opts = opts || {};

    // Energy override: very low energy forces 'sleep' expression.
    var mood = (typeof state.mood === 'number') ? state.mood : 50;
    var energy = (typeof state.energy === 'number') ? state.energy : 100;

    // Map mood → base expression (renderer handles the actual expression logic)
    pet.setMood(mood);
    // NOTE: Energy-based sleep override removed — it caused the pet to
    // permanently sleep after energy decayed to <20 with no recovery path.
    // Mood is the sole driver of expression now.

    // Outfit overlay — apply only on actual change to avoid redundant class writes.
    if (typeof state.outfit === 'string' && state.outfit !== lastOutfit) {
      if (pet.setOutfit) pet.setOutfit(state.outfit);
      lastOutfit = state.outfit;
    }

    // Level-up detection: only fire if level actually increased.
    var level = Number(state.level) || 1;
    if (level > lastLevel) {
      // Show celebration bubble + ring. The renderer auto-cleans.
      if (pet.showLevelUp) pet.showLevelUp(level);
      // Expand window to fit the level-up bubble (below the pet).
      resizeState.levelUp = true;
      updateWindowSize();
      // Shrink back after the bubble animation finishes (2.8s), but only
      // if dialogue isn't still active.
      setTimeout(function () {
        resizeState.levelUp = false;
        updateWindowSize();
      }, 2800);
    }
    lastLevel = level;

    // Track intimacy so dialogue tier can react.
    if (typeof state.intimacy === 'number') {
      lastIntimacy = state.intimacy;
    }

    // One-shot XP event → temporary expression. Dedupe repeated events
    // arriving in rapid succession (e.g. multiple clicks per second).
    if (opts.event) {
      var key = String(opts.event) + ':' + (state.level || 0);
      var nowMs = now();
      if (key !== lastEventKey || (nowMs - lastEventAppliedAt) > 250) {
        lastEventKey = key;
        lastEventAppliedAt = nowMs;
        applyEventExpression(opts.event);
      }
    }
  }

  // Map XP/interaction events to a temporary expression (Stage 4).
  function applyEventExpression(eventName) {
    if (!eventName) return;
    // Stage 5.1: chase mouse — switch to walk expression (no auto-revert).
    if (eventName === 'chasing') {
      if (pet && pet.setExpression) pet.setExpression('walk');
      return;
    }
    if (eventName === 'chaseStop') {
      // Revert to mood-based expression.
      if (pet && pet.setMood) pet.setMood(lastState ? lastState.mood : 50);
      return;
    }
    // Stage 5/6.3: climbing — busy expression (climbing is concentrated effort).
    if (eventName === 'climbing') {
      if (pet && pet.showTemporaryExpression) pet.showTemporaryExpression('busy', 2500);
      return;
    }
    // Stage 5.2: breed — celebrate the new family member.
    if (eventName === 'breed') {
      if (pet && pet.showTemporaryExpression) pet.showTemporaryExpression('celebrate', 2500);
      playSound('feed');   // reuse 'feed' if no breed-specific SFX is shipped
      return;
    }
    if (!pet || !pet.showTemporaryExpression) return;
    switch (eventName) {
      case 'todoComplete':
      case 'pomodoroComplete':
        pet.showTemporaryExpression('happy', 1500);
        break;
      case 'overdue':
        if (opts.dialogue) {
          showDialogue(opts.dialogue, 'friendly');
        }
        pet.showTemporaryExpression('anxious', 3000);
        break;
      case 'todoDue':
        // Pet reminds about a due-soon todo via dialogue bubble + busy expression
        if (opts.dialogue) {
          showDialogue(opts.dialogue, 'friendly');
        }
        pet.showTemporaryExpression('busy', 4000);
        playSound('click');
        break;
      case 'click':
        pet.showTemporaryExpression('happy', 800);
        playSound('click');
        break;
      case 'pet':
      case 'doubleclick':
      case 'longpress':
        pet.showTemporaryExpression('happy', 1200);
        playSound('click');
        break;
      case 'feed':
        pet.showTemporaryExpression('celebrate', 1500);
        playSound('feed');
        break;
      case 'levelUp':
        // handled by showLevelUp above; trigger celebration sound here
        playSound('feed');   // reuse; packs can override with <sound event="levelUp">
        break;
      default:
        // Unknown event — no expression change.
        break;
    }
  }

  function loadAndStart() {
    container = document.getElementById('pet-container');
    if (!container) return;
    applyThemeToContainer();

    if (!api.pet || !api.pet.getPack) {
      container.textContent = '\ud83d\udc31'; // fallback emoji
      return;
    }

    // Resolve the pack id from saved state if any.
    api.pet.getState(petId).then(function (state) {
      var packId = (state && state.character_id) || 'default';
      return api.pet.getPack(packId).then(function (pack) {
        return { pack: pack, state: state };
      });
    }).then(function (r) {
      var pack = r.pack || {
        name: 'default', emoji: '\ud83d\udc31',
        animations: { idle: { name: 'idle', fps: 2, frames: ['\ud83d\udc31','\ud83d\ude3a'], mode: 'emoji' } },
        sounds: {}
      };
      initPetWithPack(pack, r.state);
    }).catch(function (err) {
      console.error('[pet-window] failed to load pack', err);
      if (container) container.textContent = '\ud83d\udc31';
    });
  }

  /**
   * (Re)initialize the renderer with a fresh pack. Called on first load AND
   * on Stage 5.3 morph (when the user picks a different character pack).
   */
  function initPetWithPack(pack, state) {
    if (!container) return;
    if (pet) {
      try { pet.destroy(); } catch (_) {}
      pet = null;
    }
    currentPack = pack;
    pet = window.PetRenderer.createPetRenderer(pack, container);
    // The old .pet-frame DOM element was destroyed by pet.destroy() above.
    // Reset the cached reference so the next hit-test re-queries the DOM
    // (updateHitTest lazily re-fetches petFrameEl when it's null).
    // Also invalidate the hit-test rect cache — the new pet's rect may differ.
    petFrameEl = null;
    invalidateHitRect();
    lastState = state || null;
    lastLevel = (state && Number(state.level)) || 1;
    lastOutfit = (state && state.outfit) || null;
    if (state) applyStateToPet(state);
    // Reset the dialogue timer whenever a fresh pet is mounted.
    if (dialogueTimer) { clearTimeout(dialogueTimer); dialogueTimer = null; }
    scheduleNextDialogue(8000);
  }

  /**
   * Stage 6.2: Apply the system theme to the pet container so CSS can adapt
   * the dialogue bubble / level-up bubble colors when the OS theme flips.
   */
  function applyThemeToContainer() {
    if (!container) return;
    try {
      container.setAttribute('data-theme', currentTheme || 'dark');
      document.documentElement.setAttribute('data-theme', currentTheme || 'dark');
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------------------

  function bindEvents() {
    // ── Click-through hit-test (rAF-throttled) ───────────────────────────
    // The pet window is click-through by default (setIgnoreMouseEvents(true)
    // in main.js). When the cursor is over the .pet-frame emoji, we tell main
    // to stop ignoring so the pet can be clicked/dragged. When it leaves, we
    // restore click-through so the window never blocks other apps.
    // State (hitStateActive, petFrameEl, setHit) is at module scope so
    // onPointerUp can reset it too.

    var hitTestRAF = false;
    var lastHitEvent = null;

    function updateHitTest(e) {
      lastHitEvent = e;
      if (hitTestRAF) return;
      hitTestRAF = true;
      requestAnimationFrame(function () {
        hitTestRAF = false;
        var ev = lastHitEvent;
        if (!ev) return;
        if (!petFrameEl) petFrameEl = document.querySelector('.pet-frame');
        if (!petFrameEl) return;
        // Cache rect briefly (~200ms) to avoid reflow on every frame, but
        // refresh often enough that a moved window doesn't use a stale rect.
        var nowMs = Date.now();
        if (!cachedHitRect || (nowMs - cachedHitRectTime) > 200) {
          cachedHitRect = petFrameEl.getBoundingClientRect();
          cachedHitRectTime = nowMs;
        }
        var rect = cachedHitRect;
        var overPet = (ev.clientX >= rect.left && ev.clientX <= rect.right &&
                       ev.clientY >= rect.top  && ev.clientY <= rect.bottom);
        setHit(overPet);
      });
    }

    document.addEventListener('mousemove', updateHitTest);
    // When mouse leaves the window entirely, restore click-through.
    document.addEventListener('mouseleave', function () { setHit(false); });
    document.addEventListener('mouseout',   function (e) {
      if (!e.relatedTarget) setHit(false);
    });

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup',   onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);

    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    });

    // Track tap timing so onPointerUp can detect double-clicks.
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      recordTapDown();
    }, true);

    // Listen for state changes broadcast by main process.
    // Payload shape: { petId, state, event? }
    // `event` is the source name ('todoComplete', 'overdue', 'levelUp',
    //  'click', 'pet', 'feed', 'pomodoroComplete', 'chasing', 'chaseStop',
    //  'climbing', 'breed', etc.).
    if (api.pet && api.pet.onChanged) {
      api.pet.onChanged(function (payload) {
        if (!payload || typeof payload !== 'object') return;
        // HIGH-1 fix: only apply state changes meant for THIS pet window.
        // Without this filter, pet B would walk when pet A starts chasing.
        if (payload.petId && payload.petId !== petId) return;
        var state = payload.state;
        if (state && typeof state === 'object') {
          lastState = state;
          applyStateToPet(state, { event: payload.event, dialogue: payload.dialogue, todoId: payload.todoId });
          if (typeof state.intimacy === 'number') lastIntimacy = state.intimacy;
        }
        // Stage 5.1: track chasing state for menu UI + walk sound loop.
        if (payload.event === 'chasing') {
          isChasing = true;
          startWalkSoundLoop();
        } else if (payload.event === 'chaseStop') {
          isChasing = false;
          stopWalkSoundLoop();
        }
        // After a successful interaction, show a dialogue line.
        if (payload.event === 'click' || payload.event === 'pet' || payload.event === 'feed' || payload.event === 'doubleclick' || payload.event === 'longpress') {
          var tier = (payload.event === 'feed') ? 'friendly' : intimacyTier(lastState ? lastState.intimacy : 0);
          showDialogue(pickLine(tier), tier);
        }
      });
    }

    // Stage 5.3: morph — main.js tells us the renderer should swap pack.
    if (api.pet && api.pet.onMorph) {
      api.pet.onMorph(function (payload) {
        if (!payload || !payload.packId) return;
        if (!api.pet || !api.pet.getPack) return;
        api.pet.getPack(payload.packId).then(function (pack) {
          if (!pack) return;
          initPetWithPack(pack, lastState);
          // Tiny celebration cue so the user sees the change.
          try { playSound('click'); } catch (_) {}
          showDialogue('变身！', 'friendly');
        }).catch(function (err) {
          console.error('[pet-window] morph getPack failed', err);
        });
      });
    }

    // Stage 6.2: theme follow — main.js broadcasts settings:changed on
    // OS theme flips; update container data-theme + CSS variable.
    if (api.settings && api.settings.onChanged) {
      api.settings.onChanged(function (payload) {
        if (!payload || !payload.theme) return;
        currentTheme = payload.theme === 'light' ? 'light' : 'dark';
        applyThemeToContainer();
      });
    }

    // Persist final position on close as a safety net.
    window.addEventListener('beforeunload', function () {
      if (posSaveTimer) clearTimeout(posSaveTimer);
      if (dialogueTimer) { clearTimeout(dialogueTimer); dialogueTimer = null; }
      if (dialogueHideTimer) { clearTimeout(dialogueHideTimer); dialogueHideTimer = null; }
      stopWalkSoundLoop();
      var x = window.screenX || window.screenLeft || 0;
      var y = window.screenY || window.screenTop  || 0;
      if (api.pet && api.pet.setPosition) {
        // Sync IPC for last-chance write — invoke doesn't return before unload
        // reliably, so use ipcRenderer.send through preload if available.
        try { api.pet.setPosition({ petId: petId, x: x, y: y }); } catch (_) {}
      }
    });
  }

  // Helper for the right-click menu's "Feed pet" item — fires the same
  // path as sendPetInteraction('feed') but also bypasses the IPC gate so
  // it works even if the click/pet plumbing isn't bound.
  // feedPetFromMenu removed — feed is now handled by main.js native menu
  // which calls applyInteraction('feed', ...) directly. The renderer's
  // onChanged callback picks up the 'feed' event and shows a dialogue bubble.

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function boot() {
    bindEvents();
    loadAndStart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
