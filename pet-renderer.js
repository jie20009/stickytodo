/**
 * pet-renderer.js - Frame animation engine for StickyTodo Desktop Pet
 *
 * Renders a character (emoji or PNG) inside a container DOM element.
 * The container is the pet window's <div id="pet-container"></div>.
 *
 * Public API:
 *   const pet = createPetRenderer(characterPack, container);
 *   pet.setExpression('happy');         // switch to 'happy' animation
 *   pet.setFrame(0);                    // manually pick frame (pauses auto-cycle)
 *   pet.start();                        // start animation loop (default: on)
 *   pet.stop();
 *   pet.onDragStart();                  // visual feedback for drag begin
 *   pet.onDragMove(x, y);               // optional visual feedback while dragging
 *   pet.onDragEnd(velocityX, velocityY);// optional throw/return-to-idle behavior
 *   pet.setMood(moodNumber);            // 0..100 — maps to expression
 *   pet.setOutfit('hat');               // toggle outfit overlay ('none' clears)
 *   pet.showLevelUp(newLevel);          // trigger level-up bubble + ring
 *   pet.showTemporaryExpression('happy', 1500);  // temporary expression with auto-revert
 *   pet.destroy();                      // remove DOM + stop loop
 *
 * No external dependencies. Pure DOM + requestAnimationFrame.
 */

(function (global) {
  'use strict';

  // Expressions and their preferred animation name. The renderer picks the
  // first available animation from the pack in this priority order.
  var EXPRESSION_PRIORITY = {
    celebrate: ['celebrate', 'happy', 'idle'],
    happy:     ['happy', 'idle'],
    busy:      ['busy', 'idle'],
    anxious:   ['anxious', 'idle'],
    sleep:     ['sleep', 'idle'],
    walk:      ['walk', 'idle'],
    idle:      ['idle'],
  };

  /**
   * Build the DOM scaffolding: outer .pet, inner .pet-frame (the actual image).
   * Returns { root, frame }.
   */
  function buildDom(container) {
    var root = document.createElement('div');
    root.className = 'pet';
    var frame = document.createElement('div');
    frame.className = 'pet-frame pet-frame--emoji';
    root.appendChild(frame);
    container.appendChild(root);
    return { root: root, frame: frame };
  }

  /**
   * Choose the best animation for the requested expression given the
   * pack's available animations. Falls back to 'idle'.
   */
  function pickAnimation(pack, expression) {
    var prefs = EXPRESSION_PRIORITY[expression] || EXPRESSION_PRIORITY.idle;
    for (var i = 0; i < prefs.length; i++) {
      if (pack.animations && pack.animations[prefs[i]]) {
        return pack.animations[prefs[i]];
      }
    }
    // Pack has at least one animation; pick the first.
    var keys = Object.keys(pack.animations || {});
    if (keys.length > 0) return pack.animations[keys[0]];
    // No animations at all — synthesize a single-frame idle from the emoji.
    return {
      name: 'idle',
      fps: 2,
      frames: [pack.emoji || '\ud83d\udc31'],
      mode: 'emoji',
    };
  }

  function setFrameContent(frameEl, frame, mode) {
    if (mode === 'image' || (typeof frame === 'string' && frame.indexOf('file:') === 0)) {
      // Swap to <img> for PNG/file frames
      if (frameEl.tagName !== 'IMG') {
        var img = document.createElement('img');
        img.className = 'pet-frame pet-frame--img';
        img.draggable = false;
        img.alt = '';
        frameEl.parentNode.replaceChild(img, frameEl);
        frameEl = img;
      }
      frameEl.src = frame;
    } else {
      // Emoji text
      if (frameEl.tagName !== 'DIV') {
        var div = document.createElement('div');
        div.className = 'pet-frame pet-frame--emoji';
        frameEl.parentNode.replaceChild(div, frameEl);
        frameEl = div;
      }
      frameEl.textContent = frame;
    }
    return frameEl;
  }

  /**
   * Map a mood number (0..100) to an expression. Used by setMood().
   */
function moodToExpression(mood) {
  // Baseline mood is 50 — pet idles calmly by default.
  // 'happy' requires meaningful interaction (mood ≥ 90).
  // 'celebrate' is rare, reserved for big events (mood ≥ 97).
  // anxious (😰 闪烁) 已移除——体验差无实际价值，mood < 30 用 idle 代替。
  if (mood >= 97) return 'celebrate';
  if (mood >= 90) return 'happy';
  if (mood >= 15) return 'idle';
  return 'sleep';
}

  /**
   * Create a pet renderer bound to the given character pack + container.
   */
  function createPetRenderer(pack, container) {
    if (!pack)         throw new Error('createPetRenderer: pack is required');
    if (!container)    throw new Error('createPetRenderer: container is required');

    var dom = buildDom(container);
    var running = true;
    var expression = 'idle';
    var baseExpression = 'idle';   // "mood" expression — temporary expressions revert to this
    var animation = pickAnimation(pack, expression);
    var frameIndex = 0;
    var lastTick = 0;
    var rafId = null;
    var autoPick = true;     // when true, frameIndex auto-advances
    var frameEl = dom.frame;
    var temporaryTimer = null;
    var levelUpBubbleTimer = null;   // FIX Bug-5: tracked so destroy() can cancel
    var levelUpRevertTimer = null;   // FIX Bug-5: tracked so destroy() can cancel
    var lastOutfit = 'none';

    function renderFrame() {
      var f = animation.frames[frameIndex % animation.frames.length];
      frameEl = setFrameContent(frameEl, f, animation.mode);
      // Apply per-expression CSS class for animation hooks
      // Preserve pet--dragging so drag styles aren't wiped mid-drag
      var dragClass = dom.root.classList.contains('pet--dragging') ? ' pet--dragging' : '';
      dom.root.className = 'pet pet--expr-' + expression + dragClass;
    }

    function tick(now) {
      if (!running) return;
      rafId = requestAnimationFrame(tick);
      if (autoPick && animation.frames.length > 1) {
        var interval = 1000 / Math.max(1, animation.fps);
        if (!lastTick) lastTick = now;
        if (now - lastTick >= interval) {
          frameIndex = (frameIndex + 1) % animation.frames.length;
          lastTick = now;
          renderFrame();
        }
      }
    }

    function applyExpression(next) {
      var target = next || 'idle';
      var nextAnim = pickAnimation(pack, target);
      animation = nextAnim;
      expression = target;
      frameIndex = 0;
      lastTick = 0;
      renderFrame();
    }

    // Set outfit overlay by toggling CSS classes on the container.
    // Values: 'none' (clear), 'hat', 'glasses', 'crown'.
    function applyOutfit(outfit) {
      var name = (outfit == null || outfit === '' || outfit === 'none') ? 'none' : String(outfit);
      // Remove any existing outfit-* class from the container
      var classes = container.className ? container.className.split(/\s+/) : [];
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf('outfit-') === 0) {
          container.classList.remove(classes[i]);
        }
      }
      // Add the new outfit class (skip 'none' so we don't pollute the class list)
      if (name !== 'none') {
        container.classList.add('outfit-' + name);
      }
      lastOutfit = name;
    }

    // Initial render
    renderFrame();
    rafId = requestAnimationFrame(tick);

    return {
      setExpression: function (name) {
        // Cancels any in-flight temporary expression revert.
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        baseExpression = name || 'idle';
        if (name !== expression) applyExpression(name);
      },
      setMood: function (mood) {
        var mapped = moodToExpression(Number(mood) || 0);
        // setMood updates the "base" expression; cancels any temporary revert.
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        baseExpression = mapped;
        if (mapped !== expression) applyExpression(mapped);
      },
      setOutfit: function (outfit) {
        applyOutfit(outfit);
      },
      getOutfit: function () {
        return lastOutfit;
      },
      setFrame: function (idx) {
        autoPick = false;
        frameIndex = Math.max(0, Math.min(animation.frames.length - 1, Number(idx) || 0));
        renderFrame();
      },
      resumeAutoFrames: function () {
        autoPick = true;
        lastTick = 0;
      },
      start: function () {
        if (!running) {
          running = true;
          rafId = requestAnimationFrame(tick);
        }
      },
      stop: function () {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },
      onDragStart: function () {
        dom.root.classList.add('pet--dragging');
      },
      onDragMove: function (_x, _y) {
        // No-op for now; placeholder for tilt/squish hooks in Stage 4.
      },
      onDragEnd: function (_vx, _vy) {
        dom.root.classList.remove('pet--dragging');
      },
      // Show a temporary expression that auto-reverts to the current base
      // expression (mood-based) after `durationMs`.
      showTemporaryExpression: function (name, durationMs) {
        var ms = Number(durationMs);
        if (!Number.isFinite(ms) || ms <= 0) ms = 1500;
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        // Switch now
        applyExpression(name);
        // Schedule revert
        temporaryTimer = setTimeout(function () {
          temporaryTimer = null;
          if (baseExpression && baseExpression !== expression) {
            applyExpression(baseExpression);
          }
        }, ms);
      },
      // Trigger a celebratory level-up animation. Adds a level-up bubble
      // and a sparkle ring overlay to the pet container; auto-cleans after
      // the CSS animation duration (matches the CSS keyframes ~2.4s/1.6s).
      showLevelUp: function (newLevel) {
        // FIX Bug-5: cancel any prior level-up timers before starting new ones,
        // so a rapid second level-up doesn't pile up stale callbacks.
        if (levelUpBubbleTimer) { clearTimeout(levelUpBubbleTimer); levelUpBubbleTimer = null; }
        if (levelUpRevertTimer) { clearTimeout(levelUpRevertTimer); levelUpRevertTimer = null; }
        // Bubble
        var bubble = document.createElement('div');
        bubble.className = 'pet-level-up-bubble';
        bubble.textContent = 'Lv Up! → Lv ' + (newLevel || '?');
        container.appendChild(bubble);
        // Ring
        var ring = document.createElement('div');
        ring.className = 'pet-level-up-ring';
        container.appendChild(ring);
        // Celebrate expression while the bubble shows.
        applyExpression('celebrate');
        // Clean up after CSS animations end (2.4s bubble + 0.4s buffer).
        levelUpBubbleTimer = setTimeout(function () {
          levelUpBubbleTimer = null;
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
          if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, 2500);
        // Revert expression after the celebration period (1.5s).
        levelUpRevertTimer = setTimeout(function () {
          levelUpRevertTimer = null;
          if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
          if (baseExpression && baseExpression !== expression) {
            applyExpression(baseExpression);
          }
        }, 1800);
      },
      getRoot: function () { return dom.root; },
      getExpression: function () { return expression; },
      getBaseExpression: function () { return baseExpression; },
      destroy: function () {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        // FIX Bug-5: also cancel level-up timers — without this, a destroy()
        // followed by an immediate initPetWithPack() left dangling callbacks
        // that touched a removed DOM node (TypeError on frameEl.parentNode).
        if (levelUpBubbleTimer) { clearTimeout(levelUpBubbleTimer); levelUpBubbleTimer = null; }
        if (levelUpRevertTimer) { clearTimeout(levelUpRevertTimer); levelUpRevertTimer = null; }
        if (dom.root.parentNode) dom.root.parentNode.removeChild(dom.root);
      },
    };
  }

  // Export to window (no module system in plain <script>).
  if (typeof global.PetRenderer === 'undefined') {
    global.PetRenderer = {
      createPetRenderer: createPetRenderer,
      pickAnimation: pickAnimation,
      moodToExpression: moodToExpression,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
