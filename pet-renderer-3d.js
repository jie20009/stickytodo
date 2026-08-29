/**
 * pet-renderer-3d.js - 3D frame animation engine for StickyTodo Desktop Pet
 *
 * Renders a 3D character (procedurally-generated or GLB model) inside a
 * container DOM element using Three.js (WebGL).
 *
 * Exposes the SAME public API as pet-renderer.js so pet-window.js can
 * swap between 2D and 3D renderers without any logic change.
 *
 * Public API (identical to pet-renderer.js):
 *   const pet = PetRenderer3D.createPetRenderer(characterPack, container);
 *   pet.setExpression('happy');
 *   pet.setMood(85);
 *   pet.setOutfit('hat');
 *   pet.onDragStart();
 *   pet.onDragEnd();
 *   pet.showLevelUp(5);
 *   pet.showTemporaryExpression('happy', 1500);
 *   pet.destroy();
 *
 * No external dependencies beyond three.min.js (loaded via <script>).
 */

(function (global) {
  'use strict';

  // FIX Opt-6: unify thresholds with pet-renderer.js (2D) so the same mood
  // value maps to the same expression regardless of which renderer is active.
  // Previously 3D used 95/85 while 2D used 97/90, causing expression "jumps"
  // when toggling the 3D toggle at intermediate mood values.
  function moodToExpression(mood) {
    if (mood >= 97) return 'celebrate';
    if (mood >= 90) return 'happy';
    if (mood >= 15) return 'idle';
    return 'sleep';
  }

  /**
   * Build a simple procedural 3D character from primitives.
   * `type` selects the character shape; `color` sets the main color.
   * Returns a THREE.Group with named references for animation.
   *
   * All character types expose the SAME `userData.parts` structure:
   *   { head, body, base, leftArm, rightArm, leftEye, rightEye }
   * so the shared ANIMATIONS object works for every character.
   */
  function buildProceduralCharacter(color, type) {
    var t = type || 'soldier';
    if (t === 'cat')     return buildCat(color || 0xf59e0b);
    if (t === 'robot')   return buildRobot(color || 0xc0c0c0);
    if (t === 'penguin') return buildPenguin();
    if (t === 'ghost')  return buildGhost(color || 0xf3f4f6);
    // Default: soldier (original)
    return buildSoldier(color || 0xfef3c7);
  }

  // ── Soldier (original) — sphere head + cone body + cylinder arms ──
  function buildSoldier(color) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 });
    var eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), bodyMat);
    head.position.y = 1.1; head.name = 'head'; group.add(head);

    var eyeGeo = new THREE.SphereGeometry(0.05, 8, 6);
    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.15, 0.3); leftEye.name = 'leftEye'; group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.15, 0.3); rightEye.name = 'rightEye'; group.add(rightEye);

    var body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), bodyMat);
    body.position.y = 0.4; body.name = 'body'; group.add(body);

    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), darkMat);
    base.position.y = -0.05; base.name = 'base'; group.add(base);

    var armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
    var leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.4, 0.55, 0); leftArm.rotation.z = 0.4; leftArm.name = 'leftArm'; group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.4, 0.55, 0); rightArm.rotation.z = -0.4; rightArm.name = 'rightArm'; group.add(rightArm);

    group.userData.parts = { head: head, body: body, base: base, leftArm: leftArm, rightArm: rightArm, leftEye: leftEye, rightEye: rightEye };
    return group;
  }

  // ── Cat — 圆头+尖耳朵+胡须+粉鼻子+椭圆身+长摆尾 ──
  function buildCat(color) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color || 0xf59e0b });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
    var eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    var greenMat = new THREE.MeshLambertMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 0.3 });
    var pinkMat = new THREE.MeshLambertMaterial({ color: 0xff8da1 });
    var whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var innerEarMat = new THREE.MeshLambertMaterial({ color: 0xffb3c1 });

    // ── 头部(略扁圆球)──
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 18), bodyMat);
    head.position.y = 1.15; head.scale.set(1, 0.95, 0.9);
    head.name = 'head'; group.add(head);

    // ── 耳朵(三角形锥体 + 内耳粉色)──
    var earGeo = new THREE.ConeGeometry(0.14, 0.25, 4);
    var leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(-0.24, 1.48, 0); leftEar.rotation.z = -0.15; leftEar.name = 'leftEar'; group.add(leftEar);
    var rightEar = new THREE.Mesh(earGeo, bodyMat);
    rightEar.position.set(0.24, 1.48, 0); rightEar.rotation.z = 0.15; rightEar.name = 'rightEar'; group.add(rightEar);
    // 内耳(粉色,小一号)
    var innerEarGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
    var leftInnerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    leftInnerEar.position.set(-0.24, 1.45, 0.05); leftInnerEar.rotation.z = -0.15; group.add(leftInnerEar);
    var rightInnerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    rightInnerEar.position.set(0.24, 1.45, 0.05); rightInnerEar.rotation.z = 0.15; group.add(rightInnerEar);

    // ── 眼睛(绿色发光虹膜 + 黑色瞳孔)──
    var eyeWhiteGeo = new THREE.SphereGeometry(0.07, 12, 10);
    var leftEye = new THREE.Mesh(eyeWhiteGeo, greenMat);
    leftEye.position.set(-0.15, 1.18, 0.33); leftEye.scale.set(1, 1.4, 0.5); leftEye.name = 'leftEye'; group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeWhiteGeo, greenMat);
    rightEye.position.set(0.15, 1.18, 0.33); rightEye.scale.set(1, 1.4, 0.5); rightEye.name = 'rightEye'; group.add(rightEye);
    // 瞳孔(黑色竖缝)
    var pupilGeo = new THREE.SphereGeometry(0.03, 8, 6);
    var leftPupil = new THREE.Mesh(pupilGeo, eyeMat);
    leftPupil.position.set(-0.15, 1.18, 0.38); leftPupil.scale.set(0.5, 1.5, 0.5); group.add(leftPupil);
    var rightPupil = new THREE.Mesh(pupilGeo, eyeMat);
    rightPupil.position.set(0.15, 1.18, 0.38); rightPupil.scale.set(0.5, 1.5, 0.5); group.add(rightPupil);

    // ── 鼻子(粉色小三角)──
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 3), pinkMat);
    nose.position.set(0, 1.08, 0.38); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 6;
    nose.name = 'nose'; group.add(nose);

    // ── 嘴(两条小弧线用细圆柱表示)──
    var mouthGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4);
    var leftMouth = new THREE.Mesh(mouthGeo, eyeMat);
    leftMouth.position.set(-0.04, 1.04, 0.37); leftMouth.rotation.z = 0.5; group.add(leftMouth);
    var rightMouth = new THREE.Mesh(mouthGeo, eyeMat);
    rightMouth.position.set(0.04, 1.04, 0.37); rightMouth.rotation.z = -0.5; group.add(rightMouth);

    // ── 胡须(左右各3根,白色细圆柱)──
    var whiskerGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
    var whiskerMat = whiteMat;
    var whiskerPositions = [
      // [x, y, z, rotZ, rotY]
      [-0.38, 1.10, 0.28, 0.1, 0.3],
      [-0.40, 1.06, 0.25, -0.1, 0.4],
      [-0.38, 1.02, 0.28, -0.25, 0.3],
    ];
    var mirrorPositions = whiskerPositions.map(function(w) { return [-w[0], w[1], w[2], -w[3], -w[4]]; });
    var allWhiskers = whiskerPositions.concat(mirrorPositions);
    var whiskerMeshes = [];
    for (var wi = 0; wi < allWhiskers.length; wi++) {
      var w = allWhiskers[wi];
      var whisker = new THREE.Mesh(whiskerGeo, whiskerMat);
      whisker.position.set(w[0], w[1], w[2]);
      whisker.rotation.z = w[3]; whisker.rotation.y = w[4];
      whiskerMeshes.push(whisker);
      group.add(whisker);
    }

    // ── 身体(椭圆)──
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), bodyMat);
    body.position.y = 0.5; body.scale.set(1, 1.4, 1); body.name = 'body'; group.add(body);

    // ── 脚(两个小椭球)──
    var footGeo = new THREE.SphereGeometry(0.1, 10, 8);
    var leftFoot = new THREE.Mesh(footGeo, bodyMat);
    leftFoot.position.set(-0.12, 0.08, 0.05); leftFoot.scale.set(1, 0.5, 1.2); group.add(leftFoot);
    var rightFoot = new THREE.Mesh(footGeo, bodyMat);
    rightFoot.position.set(0.12, 0.08, 0.05); rightFoot.scale.set(1, 0.5, 1.2); group.add(rightFoot);

    var base = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), darkMat);
    base.position.y = 0.12; base.scale.set(1, 0.3, 1); base.name = 'base'; group.add(base);

    // ── 手臂(圆柱)──
    var armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8);
    var leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.35, 0.6, 0.05); leftArm.rotation.z = 0.5; leftArm.name = 'leftArm'; group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.35, 0.6, 0.05); rightArm.rotation.z = -0.5; rightArm.name = 'rightArm'; group.add(rightArm);

    // ── 尾巴(分段长圆柱,会摆动)──
    var tailGroup = new THREE.Group();
    tailGroup.name = 'tail';
    // 尾巴用 3 段组成,越往尖端越细
    var seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6), bodyMat);
    seg1.position.y = 0.1; tailGroup.add(seg1);
    var seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18, 6), bodyMat);
    seg2.position.y = 0.28; tailGroup.add(seg2);
    var seg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.15, 6), bodyMat);
    seg3.position.y = 0.45; tailGroup.add(seg3);
    // 尾尖(小球)
    var tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), bodyMat);
    tailTip.position.y = 0.54; tailGroup.add(tailTip);
    // 定位到身体后上方,倾斜
    tailGroup.position.set(0.0, 0.7, -0.25);
    tailGroup.rotation.x = -0.6; // 向后翘
    group.add(tailGroup);

    group.userData.parts = {
      head: head, body: body, base: base, leftArm: leftArm, rightArm: rightArm,
      leftEye: leftEye, rightEye: rightEye, nose: nose,
      tail: tailGroup, leftEar: leftEar, rightEar: rightEar,
      whiskers: whiskerMeshes, leftPupil: leftPupil, rightPupil: rightPupil
    };
    return group;
  }

  // ── Robot — box head + box body + antenna + LED eyes ──
  function buildRobot(color) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    var eyeMat = new THREE.MeshLambertMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });
    var accentMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });

    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), bodyMat);
    head.position.y = 1.1; head.name = 'head'; group.add(head);

    // LED eyes (small glowing cubes)
    var eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.12, 0.24); leftEye.name = 'leftEye'; group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.12, 0.24); rightEye.name = 'rightEye'; group.add(rightEye);

    // Antenna
    var antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), darkMat);
    antennaRod.position.set(0, 1.43, 0); group.add(antennaRod);
    var antennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), accentMat);
    antennaBall.position.set(0, 1.55, 0); antennaBall.name = 'antennaBall'; group.add(antennaBall);

    // Body (box)
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.4), bodyMat);
    body.position.y = 0.45; body.name = 'body'; group.add(body);

    // Chest light
    var chestLight = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), accentMat);
    chestLight.position.set(0, 0.5, 0.21); group.add(chestLight);

    var base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.35), darkMat);
    base.position.y = 0.05; base.name = 'base'; group.add(base);

    // Arms (box-like)
    var armGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
    var leftArm = new THREE.Mesh(armGeo, darkMat);
    leftArm.position.set(-0.36, 0.5, 0); leftArm.rotation.z = 0.2; leftArm.name = 'leftArm'; group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, darkMat);
    rightArm.position.set(0.36, 0.5, 0); rightArm.rotation.z = -0.2; rightArm.name = 'rightArm'; group.add(rightArm);

    group.userData.parts = { head: head, body: body, base: base, leftArm: leftArm, rightArm: rightArm, leftEye: leftEye, rightEye: rightEye, antennaBall: antennaBall };
    return group;
  }

  // ── Penguin — round body + small wings + orange beak ──
  function buildPenguin() {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    var whiteMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    var orangeMat = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
    var eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Head+Body merged: large oval (penguin shape)
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), bodyMat);
    body.position.y = 0.65; body.scale.set(1, 1.3, 1); body.name = 'body'; group.add(body);

    // White belly
    var belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), whiteMat);
    belly.position.set(0, 0.65, 0.15); belly.scale.set(0.8, 1.1, 0.5); group.add(belly);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), bodyMat);
    head.position.y = 1.15; head.name = 'head'; group.add(head);

    // Eyes
    var eyeGeo = new THREE.SphereGeometry(0.04, 8, 6);
    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.2, 0.26); leftEye.name = 'leftEye'; group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 1.2, 0.26); rightEye.name = 'rightEye'; group.add(rightEye);

    // Beak (orange cone)
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 4), orangeMat);
    beak.position.set(0, 1.1, 0.32); beak.rotation.x = Math.PI / 2; beak.name = 'beak'; group.add(beak);

    // Wings (flattened ellipsoids)
    var wingGeo = new THREE.SphereGeometry(0.12, 8, 6);
    var leftArm = new THREE.Mesh(wingGeo, bodyMat);
    leftArm.position.set(-0.35, 0.65, 0); leftArm.scale.set(0.4, 1.2, 0.6); leftArm.rotation.z = 0.3; leftArm.name = 'leftArm'; group.add(leftArm);
    var rightArm = new THREE.Mesh(wingGeo, bodyMat);
    rightArm.position.set(0.35, 0.65, 0); rightArm.scale.set(0.4, 1.2, 0.6); rightArm.rotation.z = -0.3; rightArm.name = 'rightArm'; group.add(rightArm);

    // Feet (orange)
    var footGeo = new THREE.SphereGeometry(0.08, 8, 6);
    var leftFoot = new THREE.Mesh(footGeo, orangeMat);
    leftFoot.position.set(-0.12, 0.05, 0.1); leftFoot.scale.set(1.5, 0.4, 1.5); group.add(leftFoot);
    var rightFoot = new THREE.Mesh(footGeo, orangeMat);
    rightFoot.position.set(0.12, 0.05, 0.1); rightFoot.scale.set(1.5, 0.4, 1.5); group.add(rightFoot);

    var base = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bodyMat);
    base.position.y = 0.1; base.scale.set(1, 0.3, 1); base.name = 'base'; group.add(base);

    group.userData.parts = { head: head, body: body, base: base, leftArm: leftArm, rightArm: rightArm, leftEye: leftEye, rightEye: rightEye, beak: beak };
    return group;
  }

  // ── Ghost — dome top + wavy bottom + big eyes ──
  function buildGhost(color) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.85 });
    var eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });

    // Body: hemisphere
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
    body.position.y = 0.6; body.name = 'body'; group.add(body);

    // Wavy bottom (4 small spheres)
    for (var i = 0; i < 4; i++) {
      var wave = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bodyMat);
      wave.position.set(-0.3 + i * 0.2, 0.15, 0);
      wave.scale.set(1, 0.6, 1);
      group.add(wave);
    }

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), bodyMat);
    head.position.y = 0.7; head.name = 'head'; group.add(head);

    // Big eyes
    var eyeGeo = new THREE.SphereGeometry(0.08, 10, 8);
    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.13, 0.75, 0.32); leftEye.scale.set(1, 1.5, 0.6); leftEye.name = 'leftEye'; group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.13, 0.75, 0.32); rightEye.scale.set(1, 1.5, 0.6); rightEye.name = 'rightEye'; group.add(rightEye);

    // Tiny arms (stumps)
    var armGeo = new THREE.SphereGeometry(0.08, 8, 6);
    var leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.38, 0.5, 0); leftArm.scale.set(0.6, 1, 0.6); leftArm.name = 'leftArm'; group.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.38, 0.5, 0); rightArm.scale.set(0.6, 1, 0.6); rightArm.name = 'rightArm'; group.add(rightArm);

    var base = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), darkMat);
    base.position.y = 0.1; base.scale.set(1.3, 0.2, 1); base.name = 'base'; group.add(base);

    // Ghost floats — start slightly elevated
    group.position.y = 0.15;

    group.userData.parts = { head: head, body: body, base: base, leftArm: leftArm, rightArm: rightArm, leftEye: leftEye, rightEye: rightEye };
    return group;
  }

  /**
   * Animation functions. Each takes (t, parts, group) and mutates transforms.
   * `t` is elapsed time in seconds.
   */
  var ANIMATIONS = {
    idle: function (t, p, g) {
      // Gentle breathing
      var s = 1.0 + Math.sin(t * 2) * 0.02;
      p.head.position.y = 1.1 + Math.sin(t * 2) * 0.03;
      p.body.scale.set(s, 1, s);
      g.rotation.z = 0;
      // Cat tail: slow gentle sway
      if (p.tail) p.tail.rotation.z = Math.sin(t * 1.5) * 0.3;
      // Cat whiskers: subtle twitch
      if (p.whiskers) {
        for (var i = 0; i < p.whiskers.length; i++) {
          p.whiskers[i].rotation.x = Math.sin(t * 2 + i * 0.5) * 0.05;
        }
      }
    },
    walk: function (t, p, g) {
      // Sway side to side + bob
      g.rotation.z = Math.sin(t * 6) * 0.08;
      g.position.y = Math.abs(Math.sin(t * 6)) * 0.1;
      p.head.position.y = 1.1;
      p.body.scale.set(1, 1, 1);
      // Cat tail: swish side to side with walk
      if (p.tail) p.tail.rotation.z = Math.sin(t * 4) * 0.5;
    },
    happy: function (t, p, g) {
      // Bounce up and down
      g.position.y = Math.abs(Math.sin(t * 4)) * 0.15;
      g.rotation.z = 0;
      p.head.position.y = 1.1 + Math.sin(t * 4) * 0.05;
      // Arm waving
      p.leftArm.rotation.z = 0.4 + Math.sin(t * 6) * 0.3;
      p.rightArm.rotation.z = -0.4 - Math.sin(t * 6) * 0.3;
      p.body.scale.set(1, 1, 1);
      // Cat tail: excited fast wag
      if (p.tail) p.tail.rotation.z = Math.sin(t * 8) * 0.6;
    },
    celebrate: function (t, p, g) {
      // Big jump + spin
      g.position.y = Math.abs(Math.sin(t * 3)) * 0.25;
      g.rotation.y = t * 3;
      g.rotation.z = 0;
      p.leftArm.rotation.z = 0.4 + Math.sin(t * 8) * 0.4;
      p.rightArm.rotation.z = -0.4 - Math.sin(t * 8) * 0.4;
      p.body.scale.set(1, 1, 1);
      // Cat tail: full curl excitement
      if (p.tail) p.tail.rotation.z = Math.sin(t * 6) * 0.8;
    },
    sleep: function (t, p, g) {
      // Tilt over + slow breathing. The tilt alone is the "lying down" cue.
      // FIX Bug-6: do NOT sink g.position.y to an absolute -0.1 — that
      // overrides the per-frame baseY reset and makes the Ghost (baseY=0.15)
      // drop below ground, destroying its float. The tilt + closed eyes
      // are enough visual signal.
      g.rotation.z = 0.8;
      var s = 1.0 + Math.sin(t * 0.8) * 0.03;
      p.body.scale.set(s, 1, s);
      p.head.position.y = 1.1;
      // Close eyes (shrink)
      p.leftEye.scale.y = 0.2;
      p.rightEye.scale.y = 0.2;
      // Cat tail: resting, slow droop
      if (p.tail) p.tail.rotation.z = -0.3 + Math.sin(t * 0.5) * 0.1;
    },
    busy: function (t, p, g) {
      // Slight tilt side to side
      g.rotation.z = Math.sin(t * 1.5) * 0.05;
      g.position.y = 0;
      p.head.position.y = 1.1 + Math.sin(t * 3) * 0.01;
      p.body.scale.set(1, 1, 1);
      // Cat tail: alert, slight twitch
      if (p.tail) p.tail.rotation.z = Math.sin(t * 5) * 0.15;
    },
    anxious: function (t, p, g) {
      // Fast shake
      g.position.x = Math.sin(t * 12) * 0.05;
      g.rotation.z = 0;
      p.head.position.y = 1.1;
      p.body.scale.set(1, 1, 1);
      // Cat tail: puffed, rapid twitch
      if (p.tail) p.tail.rotation.z = Math.sin(t * 16) * 0.7;
    },
  };

  // Reset eye scale for non-sleep animations.
  // Uses the character's original eye Y-scale (stored in parts._baseEyeScaleY)
  // so characters with non-1 eye scale (Cat=1.4, Ghost=1.5) aren't squished.
  function resetEyes(p) {
    var base = (p && p._baseEyeScaleY) ? p._baseEyeScaleY : { left: 1, right: 1 };
    if (p.leftEye) p.leftEye.scale.y = base.left;
    if (p.rightEye) p.rightEye.scale.y = base.right;
  }

  /**
   * Create a 3D pet renderer bound to the given character pack + container.
   * If pack has a `model` field (GLB path), load it via GLTFLoader.
   * Otherwise, build a procedural character.
   */
  function createPetRenderer(pack, container) {
    if (!pack) throw new Error('createPetRenderer3D: pack is required');
    if (!container) throw new Error('createPetRenderer3D: container is required');
    if (!global.THREE) throw new Error('THREE is not loaded. Include three.min.js before pet-renderer-3d.js');

    var THREE = global.THREE;

    // --- Scene setup ---
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.8, 3.5);
    camera.lookAt(0, 0.5, 0);

    var renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: false, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    // FIX window-too-small: 3D 模式下窗口是 128×128，canvas 也用 128
    // (CSS 100% 自动填充容器)。用 256 渲染分辨率做 supersampling
    // 让 3D 模型在 128×128 显示窗口里更清晰。
    renderer.setSize(256, 256);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    var ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 3);
    scene.add(dirLight);
    var fillLight = new THREE.DirectionalLight(0xa0a0ff, 0.3);
    fillLight.position.set(-1, 1, -2);
    scene.add(fillLight);

    // FIX Bug-7: PBR materials (soldier/xbot/michelle GLBs) need an
    // environment map to render correctly. Without scene.environment, the
    // PBR metallic/roughness channels have nothing to sample and render
    // pure black. Build a tiny procedural env (sky + ground + a couple
    // of coloured "lights") and bake it through PMREMGenerator.
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var envScene = new THREE.Scene();
    var skyGeo = new THREE.SphereGeometry(10, 16, 8);
    var skyMat = new THREE.MeshBasicMaterial({ color: 0xddeeff, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));
    var groundGeo = new THREE.PlaneGeometry(20, 20);
    var groundMat = new THREE.MeshBasicMaterial({ color: 0x555566 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    envScene.add(ground);
    var boxGeo = new THREE.BoxGeometry(3, 3, 3);
    var warmLight = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffeebb }));
    warmLight.position.set(3, 3, 3);
    envScene.add(warmLight);
    var coolLight = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xbbddff }));
    coolLight.position.set(-3, 2, -2);
    envScene.add(coolLight);
    var envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    // FIX New-3: keep the render target so destroy() can release its GPU memory.
    // pmrem.dispose() does NOT free the returned render target — the texture it
    // owns stays in GPU memory until either the RT is disposed or the page reloads.
    pmremRT = envRT;
    pmrem.dispose();
    // Dispose the env-scene resources — the baked texture is independent.
    skyGeo.dispose(); skyMat.dispose();
    groundGeo.dispose(); groundMat.dispose();
    boxGeo.dispose();
    warmLight.material.dispose();
    coolLight.material.dispose();

    // --- Character model ---
    var character = null;
    var mixer = null;
    var clips = {};
    var currentAction = null;
    var clock = new THREE.Clock();
    var running = true;
    var expression = 'idle';
    var baseExpression = 'idle';
    var temporaryTimer = null;
    var rafId = null;
    var baseY = 0;           // character's initial Y offset (Ghost floats at 0.15)
    var baseScale = 1.0;     // FIX New-1: GLB auto-fit scale, used by celebrate/drag
                             //   callbacks that previously hardcoded 1.0 / pack.scale.
    var pmremRT = null;      // FIX New-3: PMREM render target, disposed in destroy()
                             //   to release the env texture GPU memory.
    var isDragging = false;  // true during drag — tilt applied after animation
    var dragTiltX = 0;       // drag-induced X rotation tilt
    var dragTiltZ = 0;       // drag-induced Z rotation tilt

    // Procedural character path
    function onProceduralReady() {
      // FIX B3: GLB packs (soldier-glb, horse-glb, ...) don't carry character_type.
      // Strip the -glb/-3d suffix from pack.id to derive a sensible fallback
      // (e.g. horse-glb → 'horse'). buildProceduralCharacter falls back to
      // soldier for unknown types, so this mainly preserves the *name* hint.
      var idDerived = (pack.id || '').replace(/-(glb|3d)$/, '');
      var charType = pack.character_type || idDerived || 'soldier';
      var charColor = pack.color ? parseInt(pack.color, 16) || 0xfef3c7 : 0xfef3c7;
      character = buildProceduralCharacter(charColor, charType);
      baseY = character.position.y;  // Ghost starts at 0.15, others at 0
      // Capture original eye Y-scale so resetEyes restores the correct value
      // (Cat eyes are 1.4, Ghost eyes are 1.5 — not the hardcoded 1).
      var parts = character.userData.parts || {};
      parts._baseEyeScaleY = {
        left: parts.leftEye ? parts.leftEye.scale.y : 1,
        right: parts.rightEye ? parts.rightEye.scale.y : 1
      };
      scene.add(character);
      playAnimation('idle');
    }

    // GLB load path (if pack.model exists)
    function onGLBReady() {
      var loader = new THREE.GLTFLoader();
      var modelUrl = pack.model;
      if (pack.basePath && modelUrl && modelUrl.indexOf('file://') !== 0 && modelUrl.indexOf('http') !== 0) {
        // Resolve relative to pack base path
        modelUrl = 'file:///' + (pack.basePath + '/' + modelUrl).replace(/\\/g, '/');
      }
      loader.load(modelUrl, function (gltf) {
        character = gltf.scene;
        // FIX animal-no-show: Three.js example GLBs (Horse/Flamingo/Parrot/
        // Stork) pack the entire motion-cycle trajectory into ONE mesh's
        // geometry — the vertex positions span e.g. 105×302×721 units
        // (the running cycle's world travel), not the visible model size.
        // Any boundingBox-based auto-fit collapses scale to ~0.006 and the
        // model vanishes. Stop trying to auto-fit GLB models — just use the
        // pack.scale (BUILTIN_3D author already tuned it to fit the 2.2u
        // viewport at 1.0 for built-in models).
        var s = (pack.scale || 1.0);
        character.scale.setScalar(s);
        // FIX human-cut-off + bird-misplaced: 不同模型高度差异大，单一偏移
        // 无法兼顾。按 pack.id 精确指定 Y 偏移（让模型垂直中心对齐视野
        // 中心 y=0.5）。值通过实验确定：Soldier/Xbot 比 Michelle 高，需要
        // 更大下移；鸟类/Horse 偏小，下移少。fallback 用 scale 分档。
        var Y_OFFSETS = {
          'soldier-glb':  -0.4,
          'xbot-glb':     -0.4,
          'michelle-glb': -0.3,
          'flamingo-glb':  0.1,   // 鸟类上移（之前 -0.1 下移过头）
          'parrot-glb':    0.1,
          'stork-glb':     0.1,
          'horse-glb':    -0.2
        };
        var yOffset = Y_OFFSETS[pack.id];
        if (yOffset == null) {
          // Fallback for custom GLB packs: large models down more, small less.
          yOffset = (s >= 0.5) ? -1.0 : -0.3;
        }
        character.position.y = yOffset;
        baseY = yOffset;
        // FIX New-1: store the final auto-fit scale so celebrate/drag callbacks
        // can pulse/zoom from the correct base instead of jumping to 1.0.
        baseScale = s;
        baseY = character.position.y;
        scene.add(character);

        // Cache animation clips
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(character);
          for (var i = 0; i < gltf.animations.length; i++) {
            clips[gltf.animations[i].name] = gltf.animations[i];
          }
        }
        // FIX New-8: if setMood/setExpression was called before GLB finished
        // loading (race between IPC broadcast and async loader.load), the
        // pending expression was stored but no character existed yet. Restore
        // it now instead of forcing 'idle'.
        playAnimation(expression || 'idle');
      }, undefined, function (err) {
        console.warn('[pet-renderer-3d] GLB LOAD FAILED: ' + modelUrl + ' err=' + (err && err.message ? err.message : String(err)));
        console.error('[pet-renderer-3d] GLB load failed, falling back to procedural', err);
        onProceduralReady();
      });
    }

    // Play an animation by expression name
    function playAnimation(name) {
      expression = name || 'idle';
      resetEyes(character ? (character.userData.parts || {}) : {});

      // GLB animation path
      if (mixer && pack.animations && pack.animations[name]) {
        var clipName = pack.animations[name];
        var clip = clips[clipName];
        if (clip) {
          if (currentAction) currentAction.stop();
          currentAction = mixer.clipAction(clip);
          currentAction.play();
          return;
        }
      }

      // Procedural animation path: just set expression, the render loop
      // picks up the right ANIMATIONS[expression] function.
      if (!ANIMATIONS[expression]) expression = 'idle';
    }

    // --- Render loop ---
    function animate() {
      if (!running) return;
      rafId = requestAnimationFrame(animate);
      var dt = clock.getDelta();
      var t = clock.elapsedTime;

      if (mixer) mixer.update(dt);

      // Procedural animation
      if (character && character.userData.parts && !mixer) {
        var fn = ANIMATIONS[expression] || ANIMATIONS.idle;
        // Reset transforms that animations might modify.
        // position.y resets to baseY (Ghost floats at 0.15, others at 0)
        // so the per-frame reset doesn't destroy the character's base offset.
        character.position.x = 0;
        character.position.y = baseY;
        // Reset Y rotation for all expressions except 'celebrate',
        // which spins continuously (g.rotation.y = t*3) and must keep
        // its accumulated rotation. Without this reset, the character
        // stays permanently rotated after celebrate ends.
        if (expression !== 'celebrate') character.rotation.y = 0;
        resetEyes(character.userData.parts);
        fn(t, character.userData.parts, character);
        // Apply drag tilt AFTER the animation function so it takes
        // precedence — animation functions overwrite rotation.z every
        // frame, so setting tilt in onDragMove alone has no effect.
        // Skip for celebrate/sleep which have their own rotation semantics.
        if (isDragging && expression !== 'celebrate' && expression !== 'sleep') {
          character.rotation.x = dragTiltX;
          character.rotation.z = dragTiltZ;
        }
      }

      // FIX Opt-4: GLB models have only one or two AnimationClips (e.g.
      // horse.glb has only `horse_A_`, parrot.glb only `parrot_A_`).
      // Without per-expression transforms, the character stays in the
      // same pose regardless of mood. Apply lightweight root-group
      // transforms (the mixer animates bones, not the root, so these
      // are additive and don't fight the bone animation).
      if (character && mixer) {
        // FIX New-7: do NOT reset position.y here — for GLB models, the mixer
        // (animation mixer) writes root motion to position.y on each frame
        // (Walk/Run typically include a root bob). Overwriting it would make
        // the character "slide" instead of "walk". Only override position.y
        // when this expression explicitly needs a custom vertical motion.
        if (expression === 'celebrate') {
          character.rotation.y += 0.08;  // slow continuous spin
          // FIX New-1: pulse around the auto-fit scale (was hardcoded 1.0)
          character.scale.setScalar(baseScale * (1.0 + Math.sin(t * 6) * 0.05));
        } else if (expression === 'happy') {
          // FIX drag-disappear: previously this did `position.y = position.y + bounce`
          // which ACCUMULATED 0.12/frame on top of mixer's root-motion writes —
          // 60fps × 0.12 = 7.2 units/sec upward, model flew out of view in <1s.
          // Use absolute value (baseY + bounce) instead of accumulating.
          character.position.y = baseY + Math.abs(Math.sin(t * 4)) * 0.12;
          character.rotation.z = 0;
        } else if (expression === 'sleep') {
          character.rotation.z = 0.3;  // tilt
        } else if (expression === 'anxious') {
          character.position.x = Math.sin(t * 14) * 0.04;  // shake (absolute, OK)
          character.rotation.z = 0;
        } else {
          // idle/walk/busy — leave mixer's root motion alone (no reset)
          // FIX drag-disappear: ensure position.x doesn't drift after anxious.
          character.position.x = 0;
          character.rotation.z = 0;
        }
        // Apply drag tilt for GLB too (animate loop is the single source).
        if (isDragging && expression !== 'celebrate' && expression !== 'sleep') {
          character.rotation.x = dragTiltX;
          character.rotation.z = dragTiltZ;
        }
      }

      renderer.render(scene, camera);
    }

    // Initialize: procedural or GLB
    if (pack.model) {
      onGLBReady();
    } else {
      onProceduralReady();
    }

    rafId = requestAnimationFrame(animate);

    // --- Public API (identical to pet-renderer.js) ---
    return {
      setExpression: function (name) {
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        baseExpression = name || 'idle';
        if (name !== expression) playAnimation(name);
      },
      setMood: function (mood) {
        var mapped = moodToExpression(Number(mood) || 0);
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        baseExpression = mapped;
        if (mapped !== expression) playAnimation(mapped);
      },
      setOutfit: function (outfit) {
        // 3D outfit: could swap materials or add accessory meshes.
        // For now, just store — full outfit support is Phase 3.
      },
      getOutfit: function () { return 'none'; },
      setFrame: function (idx) { /* not applicable for 3D */ },
      resumeAutoFrames: function () { /* always auto in 3D */ },
      start: function () {
        if (!running) { running = true; rafId = requestAnimationFrame(animate); }
      },
      stop: function () {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },
      onDragStart: function () {
        isDragging = true;
        // Scale up slightly for feedback
        // FIX New-1: zoom from baseScale (auto-fit), not pack.scale (=1.0)
        if (character) character.scale.setScalar(baseScale * 1.1);
      },
      onDragMove: function (dx, dy) {
        // Phase 2: tilt the model based on drag delta for visual feedback.
        // dx/dy are pixel deltas from drag start (can be large).
        // Values are stored for the animate loop (procedural characters) AND
        // applied directly here (GLB characters — the animate loop skips the
        // procedural block when a mixer is active, so the stored values would
        // never be applied without this direct set).
        if (!character) return;
        var tiltX = Math.max(-0.3, Math.min(0.3, (dy || 0) * 0.005));
        var tiltZ = Math.max(-0.3, Math.min(0.3, (dx || 0) * 0.005));
        // Only apply tilt when NOT in celebrate/sleep (those have their own rotation)
        if (expression !== 'celebrate' && expression !== 'sleep') {
          dragTiltX = tiltX;
          dragTiltZ = tiltZ;
          // Direct set for immediate feedback + GLB models (no animate-loop apply)
          character.rotation.x = tiltX;
          character.rotation.z = tiltZ;
        }
      },
      onDragEnd: function (_vx, _vy) {
        isDragging = false;
        dragTiltX = 0;
        dragTiltZ = 0;
        if (character) {
          // FIX New-1: restore the auto-fit scale (was hardcoded to pack.scale=1.0)
          character.scale.setScalar(baseScale);
          // Smoothly return tilt to 0 (the animate loop will pick this up
          // since idle/walk/etc reset rotation.z; rotation.x needs manual reset).
          character.rotation.x = 0;
        }
      },
      /**
       * Phase 2: 3D hit-test using THREE.Raycaster.
       * Returns true if the (clientX, clientY) coordinates (relative to
       * the renderer's canvas) hit the 3D character mesh.
       * This replaces the 2D getBoundingClientRect approach for 3D mode.
       */
      hitTest: function (clientX, clientY) {
        // FIX drag-disappear: the original 3D hitTest used raycaster against
        // the GLB model, which fails for Two.js example animals (their mesh
        // is LineSegments — raycaster needs a threshold param to hit them)
        // AND for any model whose position.y we offset for centering (the
        // ray picks empty space around the model). Use the canvas bounding
        // rect instead — the 64×64 pet window is small enough that any
        // click inside it should grab the pet, matching the 2D behaviour.
        if (!renderer || !renderer.domElement) return false;
        var canvas = renderer.domElement;
        var rect = canvas.getBoundingClientRect();
        return (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top  && clientY <= rect.bottom);
      },
      showTemporaryExpression: function (name, durationMs) {
        var ms = Number(durationMs);
        if (!Number.isFinite(ms) || ms <= 0) ms = 1500;
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        playAnimation(name);
        temporaryTimer = setTimeout(function () {
          temporaryTimer = null;
          if (baseExpression && baseExpression !== expression) playAnimation(baseExpression);
        }, ms);
      },
      showLevelUp: function (newLevel) {
        // Reuse celebrate animation + 2D CSS bubble (added by pet-window.js)
        playAnimation('celebrate');
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        temporaryTimer = setTimeout(function () {
          temporaryTimer = null;
          if (baseExpression && baseExpression !== expression) playAnimation(baseExpression);
        }, 2000);
      },
      getRoot: function () { return renderer.domElement; },
      getExpression: function () { return expression; },
      getBaseExpression: function () { return baseExpression; },
      destroy: function () {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (temporaryTimer) { clearTimeout(temporaryTimer); temporaryTimer = null; }
        if (mixer) mixer.stopAllAction();
        try { renderer.dispose(); } catch (_) {}
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        // FIX New-3: release PMREM render target + the env texture it owns.
        // Must null scene.environment BEFORE disposing the RT (the texture is
        // owned by the RT; disposing the RT invalidates the texture).
        if (scene.environment) {
          scene.environment = null;
        }
        if (pmremRT) {
          try { pmremRT.dispose(); } catch (_) {}
          pmremRT = null;
        }
        // Dispose geometries/materials
        if (character) {
          character.traverse(function (obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
              else obj.material.dispose();
            }
          });
        }
      },
    };
  }

  // Export to window
  if (typeof global.PetRenderer3D === 'undefined') {
    global.PetRenderer3D = {
      createPetRenderer: createPetRenderer,
      moodToExpression: moodToExpression,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
