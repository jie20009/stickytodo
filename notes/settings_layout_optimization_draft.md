# StickyTodo 设置面板布局优化草稿

> 仅参考草稿,不自动应用。源文件未改动。
> 适用版本:2026-08-28 当前 working tree
> 基于排查报告中的 P0/P1 问题,给出可直接复制粘贴的 CSS + HTML 片段。

---

## 目录

1. [Phase 1 — 补齐缺失 CSS(P0-1,1-2 小时)](#phase-1)
2. [Phase 2 — Section 图标 + 分隔线(P1-3 / P2-1,30 分钟)](#phase-2)
3. [Phase 3 — Radio → Segmented Control(P1-2,1 小时)](#phase-3)
4. [Phase 4 — Pet section 内部子分区(P1-4,1 小时)](#phase-4)
5. [Phase 5 — 长期方案:左 Tab 布局(推荐重构,4-6 小时)](#phase-5)
6. [可选增强](#optional)

---

<a id="phase-1"></a>
## Phase 1 — 补齐缺失 CSS(P0-1,最高 ROI)

### 1.1 通用 settings-row / label / select / hint

将以下 CSS 追加到 `style.css`(放在 `.settings-checkbox` 之后,约 2405 行):

```css
/* ============ Phase 1: 缺失的 settings 元素样式 ============ */

/* 通用行:label 在左,控件在右 */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-height: 28px;
}

/* checkbox 行:checkbox + 文字 + 右侧 hint/button */
.settings-row > .settings-checkbox {
  flex: 0 1 auto;
}
.settings-row > .btn,
.settings-row > button {
  flex: 0 0 auto;
}

/* label 固定宽度,与 select/input 对齐 */
.settings-label {
  flex: 0 0 auto;
  min-width: 72px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* select 占满剩余空间,主题化 */
.settings-select {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  /* 自定义下拉箭头,避免系统默认样式不一致 */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path fill='%23888' d='M2 3l3 3 3-3z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}
.settings-select:hover {
  border-color: var(--accent);
}
.settings-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* hint 文字:小号、灰色、紧贴主项 */
.settings-hint {
  flex: 1 1 100%;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  padding-left: 24px;  /* 与 checkbox 文字对齐 */
}

/* 行内紧凑布局(用于多宠物创建区) */
.settings-row-inline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.settings-row-inline > .settings-label {
  flex: 0 0 auto;
  min-width: auto;
}
.settings-row-inline > .settings-select {
  flex: 1 1 160px;
  min-width: 120px;
}
.settings-row-inline > .btn {
  flex: 0 0 auto;
}
```

### 1.2 Pet stats 进度条

```css
/* ============ Pet stats:5 个进度条 ============ */
.pet-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin: var(--space-2) 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

/* 单行:label | bar | value */
.pet-stat-row {
  display: grid;
  grid-template-columns: 56px 1fr 64px;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
}

.pet-stat-label {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 进度条轨道 */
.pet-stat-bar {
  height: 6px;
  background: var(--bg-active);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

/* 进度条填充 */
.pet-stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, white) 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.pet-stat-value {
  text-align: right;
  color: var(--text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
```

### 1.3 多宠物列表

```css
/* ============ Pet list:7 列网格 ============ */
.pet-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.pet-list-row {
  display: grid;
  grid-template-columns:
    /* ID */ 48px
    /* 角色 */ 1fr
    /* 等级 */ 36px
    /* 亲密度 */ 40px
    /* 标签 */ 28px
    /* 操作按钮 ×3 */ auto;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-2);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  font-size: 11px;
}

.pet-list-id {
  font-family: monospace;
  color: var(--text-muted);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-list-char {
  color: var(--text-primary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-list-lv {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.pet-list-intimacy {
  color: var(--text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.pet-list-tag {
  font-size: 12px;
  text-align: center;
}

.pet-list-tag--open {
  color: var(--accent);
  font-size: 10px;
}

/* 让 3 个按钮紧凑成一组 */
.pet-list-row > .btn {
  padding: 2px 6px;
  font-size: 10px;
  min-width: auto;
}
```

### 1.4 Pet section 子分区

```css
/* ============ Pet section 子分区 ============ */
.settings-subsection {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-section-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.85;
}
```

### 验收

应用 Phase 1 后,Pet section 应该:
- 5 个进度条变成正常带颜色的横向 bar
- 多宠物列表 9 个元素整齐排成一行
- label/select 行有正确的左右对齐
- "多宠物"子区有视觉分隔线

**预计视觉效果**:从"未样式化 HTML 块"变成正常的设置界面。

---

<a id="phase-2"></a>
## Phase 2 — Section 图标 + 分隔线(P1-3 / P2-1)

### 2.1 修改 `.settings-section` 增加视觉分隔

```css
/* 替换原 .settings-section */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}
.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

/* title 加图标位 + 加大字号 */
.settings-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.settings-section-title::before {
  font-size: 14px;
  line-height: 1;
}
```

### 2.2 HTML 模板修改(app.js 第 3855-4064 行)

把每个 `settings-section-title` 加上 emoji 前缀:

```html
<!-- 原: -->
<div class="settings-section-title">{{ t('language') }}</div>

<!-- 改为: -->
<div class="settings-section-title">🌐 {{ t('language') }}</div>
```

完整对照表:

| Section | 图标建议 |
|---------|---------|
| Language | 🌐 |
| Shortcut | ⌨️ |
| Grouping | 📊 |
| Color Scheme | 🎨 |
| Pet | 🐱 |
| Tab Visibility | 🗂️ |
| Backup | 💾 |
| Import Data | 📥 |
| Statistics | 📈 |

> emoji 在 Windows Segoe UI Emoji 下渲染稳定,无需额外字体。

---

<a id="phase-3"></a>
## Phase 3 — Radio → Segmented Control(P1-2)

### 3.1 CSS

```css
/* ============ Segmented Control(替代垂直 radio)============ */
.segmented {
  display: inline-flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2px;
  width: 100%;
  overflow: hidden;
}

.segmented-option {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  user-select: none;
  text-align: center;
  white-space: nowrap;
}

.segmented-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented-option:has(input:checked) {
  background: var(--accent);
  color: white;
  font-weight: 500;
}

/* color scheme 可加色块预览 */
.segmented-option--scheme {
  gap: 4px;
}
.segmented-scheme-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.1);
}
```

> `:has()` 在 Chromium 105+ 支持,Electron 33(Chromium 130+)完全支持。

### 3.2 HTML 模板修改

**Language section**:

```html
<!-- 原 -->
<div class="settings-radio-group">
  <label class="settings-radio"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
  <label class="settings-radio"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
  <label class="settings-radio"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
</div>

<!-- 改为 -->
<div class="segmented">
  <label class="segmented-option"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
  <label class="segmented-option"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
  <label class="segmented-option"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
</div>
```

**Grouping section**(同理替换 `.settings-radio-group` → `.segmented`)。

**Color Scheme section**(带色块):

```html
<div class="segmented">
  <label class="segmented-option segmented-option--scheme">
    <input type="radio" value="default" v-model="colorScheme" @change="setColorScheme('default')" />
    <span class="segmented-scheme-swatch" style="background:#fef3c7"></span>
    {{ t('schemeDefault') }}
  </label>
  <label class="segmented-option segmented-option--scheme">
    <input type="radio" value="windows" v-model="colorScheme" @change="setColorScheme('windows')" />
    <span class="segmented-scheme-swatch" style="background:#ffe8a3"></span>
    {{ t('schemeWindows') }}
  </label>
  <label class="segmented-option segmented-option--scheme">
    <input type="radio" value="morandi" v-model="colorScheme" @change="setColorScheme('morandi')" />
    <span class="segmented-scheme-swatch" style="background:#c9b1a0"></span>
    {{ t('schemeMorandi') }}
  </label>
</div>
```

### 验收

3 个 section(语言/分组/配色)从竖排 3 行(~60px)压缩为水平 1 行(~28px),省 50% 空间,且配色选项有视觉预览。

---

<a id="phase-4"></a>
## Phase 4 — Pet section 内部子分区(P1-4)

### 4.1 HTML 模板重组(app.js 3895-3996 行)

把 Pet section 拆成 3 个子区:**基础设置 / 状态 / 多宠物**:

```html
<div class="settings-section">
  <div class="settings-section-title">🐱 {{ t('petTitle') }}</div>

  <!-- 子区 1:基础设置 -->
  <div class="settings-subsection">
    <div class="settings-section-subtitle">{{ t('petBasic') || '基础设置' }}</div>
    <div class="settings-row">
      <label class="settings-checkbox">
        <input type="checkbox" v-model="petEnabled" @change="onPetEnabledChange" />
        {{ t('petEnabled') }}
      </label>
      <button v-if="petEnabled" class="btn btn-secondary" @click="togglePetWindow">
        {{ petShown ? t('petHide') : t('petShow') }}
      </button>
    </div>
    <div class="settings-row">
      <label class="settings-label">{{ t('petCharacter') }}</label>
      <select class="settings-select" v-model="petCharacterId" @change="onPetCharacterChange">
        <option v-for="p in petPacks" :key="p.id" :value="p.id">{{ p.name }} {{ p.emoji || '' }}</option>
      </select>
    </div>
    <div class="settings-row">
      <label class="settings-label">{{ t('petOutfit') }}</label>
      <select class="settings-select" v-model="petOutfit" @change="onPetOutfitChange">
        <option value="none">{{ t('petOutfitNone') }}</option>
        <option value="hat" :disabled="!isOutfitUnlocked('hat')">🎩 {{ t('petOutfitHat') }} <span v-if="!isOutfitUnlocked('hat')">({{ t('petLocked', {0: 5}) }})</span></option>
        <option value="glasses" :disabled="!isOutfitUnlocked('glasses')">👓 {{ t('petOutfitGlasses') }} <span v-if="!isOutfitUnlocked('glasses')">({{ t('petLocked', {0: 6}) }})</span></option>
        <option value="crown" :disabled="!isOutfitUnlocked('crown')">👑 {{ t('petOutfitCrown') }} <span v-if="!isOutfitUnlocked('crown')">({{ t('petLocked', {0: 9}) }})</span></option>
      </select>
    </div>
    <div class="settings-row">
      <label class="settings-checkbox">
        <input type="checkbox" v-model="petFollowTheme" @change="onPetFollowThemeChange" />
        {{ t('petFollowTheme') }}
      </label>
    </div>
    <div class="settings-hint">{{ t('petFollowSystemThemeHint') }}</div>
    <div class="settings-row">
      <label class="settings-checkbox">
        <input type="checkbox" v-model="pet3DEnabled" @change="onPet3DChange" />
        {{ t('pet3D') }}
      </label>
    </div>
    <div class="settings-hint">{{ t('pet3DHint') }}</div>
    <div class="settings-row">
      <button class="btn btn-secondary btn-danger" @click="resetPet">{{ t('petReset') }}</button>
    </div>
  </div>

  <!-- 子区 2:状态(仅当 pet 启用时显示)-->
  <div v-if="petState" class="settings-subsection">
    <div class="settings-section-subtitle">{{ t('petStatus') || '状态' }}</div>
    <div class="pet-stats">
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petLevel') }}</span>
        <div class="pet-stat-bar"><div class="pet-stat-bar-fill" :style="{ width: '100%' }"></div></div>
        <span class="pet-stat-value">Lv {{ petState.level || 1 }}</span>
      </div>
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petXp') }}</span>
        <div class="pet-stat-bar"><div class="pet-stat-bar-fill" :style="{ width: petXpPercent + '%' }"></div></div>
        <span class="pet-stat-value">{{ petState.xp || 0 }} / {{ petXpToNext }}</span>
      </div>
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petMood') }}</span>
        <div class="pet-stat-bar"><div class="pet-stat-bar-fill" :style="{ width: (petState.mood || 0) + '%' }"></div></div>
        <span class="pet-stat-value">{{ petState.mood || 0 }}</span>
      </div>
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petEnergy') }}</span>
        <div class="pet-stat-bar"><div class="pet-stat-bar-fill" :style="{ width: (petState.energy || 0) + '%' }"></div></div>
        <span class="pet-stat-value">{{ petState.energy || 0 }}</span>
      </div>
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petIntimacy') }}</span>
        <div class="pet-stat-bar"><div class="pet-stat-bar-fill" :style="{ width: Math.min(100, (petState.intimacy || 0) / 10) + '%' }"></div></div>
        <span class="pet-stat-value">{{ petState.intimacy || 0 }}</span>
      </div>
      <div class="pet-stat-row">
        <span class="pet-stat-label">{{ t('petStreak') }}</span>
        <div class="pet-stat-bar"></div>
        <span class="pet-stat-value">{{ petState.daily_streak || 0 }} 天</span>
      </div>
    </div>
  </div>

  <!-- 子区 3:多宠物 -->
  <div class="settings-subsection">
    <div class="settings-section-subtitle">{{ t('petMulti') }}</div>
    <div class="settings-row settings-row-inline">
      <label class="settings-label">{{ t('petCreatePack') }}</label>
      <select class="settings-select" v-model="newPetPackId">
        <option v-for="p in petPacks" :key="p.id" :value="p.id">{{ p.name }} {{ p.emoji || '' }}</option>
      </select>
      <button class="btn btn-primary" @click="createNewPet">{{ t('petNewPet') }}</button>
    </div>
    <div v-if="petList.length === 0" class="settings-hint">{{ t('petNoPets') }}</div>
    <div v-else class="pet-list">
      <div v-for="p in petList" :key="p.pet_id" class="pet-list-row">
        <span class="pet-list-id" :title="p.pet_id">{{ shortPetId(p.pet_id) }}</span>
        <span class="pet-list-char">{{ petPackLabel(p.character_id) }}</span>
        <span class="pet-list-lv">Lv {{ p.level }}</span>
        <span class="pet-list-intimacy" :title="t('petIntimacy')">{{ p.intimacy }}</span>
        <span class="pet-list-tag">
          <span v-if="p.chasing" :title="t('chasing') || '追逐'">🐭</span>
          <span v-if="p.open" class="pet-list-tag--open">●</span>
        </span>
        <button class="btn btn-secondary btn-small" @click="openPetFromList(p.pet_id)" :disabled="p.open">
          {{ p.open ? '…' : t('petOpenThisPet') }}
        </button>
        <button class="btn btn-secondary btn-small" @click="closePetFromList(p.pet_id)">{{ t('petCloseThisPet') }}</button>
        <button class="btn btn-secondary btn-small" @click="morphPetFromList(p.pet_id)">{{ t('petMorph') }}</button>
      </div>
    </div>
    <div v-if="breedablePairs.length > 0" class="settings-row">
      <button class="btn btn-secondary" @click="breedFirstPair">{{ t('petBreed') }}</button>
      <span class="settings-hint">{{ t('petBreedHint') }}</span>
    </div>
  </div>
</div>
```

> 注意:需要补充 i18n key `petBasic` / `petStatus`,或者直接在模板里写中文('基础设置' / '状态')。

### 4.2 配套 CSS:危险按钮 + 小按钮

```css
.btn-danger {
  color: var(--danger) !important;
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}
.btn-danger:hover {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.btn-small {
  padding: 2px 8px;
  font-size: 11px;
  min-height: auto;
}
```

> 应用后,移除模板里 `style="color:var(--danger)"` 和 `style="margin-bottom:8px"` 等 inline 样式。

---

<a id="phase-5"></a>
## Phase 5 — 长期方案:左 Tab 布局(推荐重构)

### 5.1 整体 HTML 结构

```html
<div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
  <div class="settings-modal settings-modal--tabbed" @keydown="onShortcutKeydown" role="dialog" aria-modal="true">
    <div class="settings-header">
      <span class="settings-title">⚙ {{ t('settings') }}</span>
      <button class="settings-close" @click="showSettings = false">×</button>
    </div>
    <div class="settings-tabbed-body">
      <!-- 左侧导航 -->
      <nav class="settings-tabs" role="tablist">
        <button class="settings-tab" :class="{ active: settingsTab === 'general' }" @click="settingsTab = 'general'">🌐 {{ t('general') || '通用' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'appearance' }" @click="settingsTab = 'appearance'">🎨 {{ t('appearance') || '外观' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'pet' }" @click="settingsTab = 'pet'">🐱 {{ t('petTitle') }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'tabs' }" @click="settingsTab = 'tabs'">🗂️ {{ t('tabVisibility') }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'data' }" @click="settingsTab = 'data'">💾 {{ t('data') || '数据' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'stats' }" @click="settingsTab = 'stats'">📈 {{ t('stats') }}</button>
      </nav>

      <!-- 右侧内容(每个 tab 用 v-show,保留状态)-->
      <div class="settings-tab-content">
        <div v-show="settingsTab === 'general'" class="settings-tab-pane">
          <!-- Language + Shortcut + Grouping -->
        </div>
        <div v-show="settingsTab === 'appearance'" class="settings-tab-pane">
          <!-- Color Scheme + Theme toggle + Transparency -->
        </div>
        <div v-show="settingsTab === 'pet'" class="settings-tab-pane">
          <!-- 整个 Pet section(含 3 个 subsection)-->
        </div>
        <div v-show="settingsTab === 'tabs'" class="settings-tab-pane">
          <!-- Tab Visibility -->
        </div>
        <div v-show="settingsTab === 'data'" class="settings-tab-pane">
          <!-- Backup + Import Data -->
        </div>
        <div v-show="settingsTab === 'stats'" class="settings-tab-pane">
          <!-- Statistics -->
        </div>
      </div>
    </div>
  </div>
</div>
```

### 5.2 配套 CSS

```css
/* ============ Tabbed Settings Modal ============ */
.settings-modal--tabbed {
  width: 90%;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.settings-tabbed-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* 左侧 tab 列 */
.settings-tabs {
  flex: 0 0 140px;
  display: flex;
  flex-direction: column;
  padding: var(--space-2);
  gap: 2px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px var(--space-3);
  font-size: 13px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}
.settings-tab:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.settings-tab.active {
  background: var(--accent);
  color: white;
  font-weight: 500;
}

/* 右侧内容 */
.settings-tab-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-4);
}

.settings-tab-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* 窄屏回退:隐藏 tab,改为垂直滚动 */
@media (max-width: 480px) {
  .settings-modal--tabbed {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    height: 90vh;
  }
  .settings-tabbed-body {
    flex-direction: column;
  }
  .settings-tabs {
    flex: 0 0 auto;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .settings-tab {
    white-space: nowrap;
  }
}
```

### 5.3 Vue data 加一个状态

```javascript
// app.js data() 里加:
settingsTab: 'general',
```

### 5.4 收益对比

| 维度 | 当前(垂直滚动) | Phase 5(左 Tab) |
|------|----------------|-----------------|
| 首屏可见项 | 4 个 section(Language/Shortcut/Grouping/Color) | **6 个 tab 全可见** |
| 找到 Pet 设置 | 滚动 50% | **点 1 次 tab** |
| 找到 Backup | 滚动到底 | **点 1 次 tab** |
| Pet section 挤占 | 35% 面板 | **独立 tab,不影响其他** |
| Statistics 位置 | 混在设置里 | **独立 tab,语义清晰** |
| 总高度 | max-height: 60vh + scroll | max-height: 80vh,内容自带 scroll |
| 窄屏适配 | 9 列多宠物列表折行 | tab 自动转横向滚动 |

---

<a id="optional"></a>
## 可选增强

### A. 设置搜索框(Phase 5 加好后)

在 `.settings-header` 右侧加搜索框,输入时高亮匹配的 section / 控件:

```html
<div class="settings-header">
  <span class="settings-title">⚙ {{ t('settings') }}</span>
  <input class="settings-search" v-model="settingsQuery" :placeholder="t('searchSettings') || '搜索设置...'" />
  <button class="settings-close" @click="showSettings = false">×</button>
</div>
```

```css
.settings-search {
  flex: 1 1 auto;
  max-width: 200px;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

Vue 端用 computed 过滤 section 是否显示:

```javascript
computed: {
  visibleSections() {
    const q = (this.settingsQuery || '').toLowerCase().trim();
    if (!q) return ['general', 'appearance', 'pet', 'tabs', 'data', 'stats'];
    // 简单匹配:tab 名 + section title + 控件 label
    // ...具体匹配逻辑
  }
}
```

### B. `<details>` 折叠(若不上 Phase 5)

如果不上左 Tab,可用原生 `<details>` 给每个 section 加折叠:

```html
<details class="settings-section" :open="openSections.includes('language')">
  <summary class="settings-section-title">🌐 {{ t('language') }}</summary>
  <div class="settings-section-body">
    <!-- 原 section 内容 -->
  </div>
</details>
```

```css
.settings-section > summary {
  list-style: none;
  cursor: pointer;
}
.settings-section > summary::-webkit-details-marker {
  display: none;
}
.settings-section > summary::after {
  content: '▾';
  float: right;
  color: var(--text-muted);
  transition: transform 0.2s;
}
.settings-section:not([open]) > summary::after {
  transform: rotate(-90deg);
}
.settings-section-body {
  padding-top: var(--space-2);
}
```

### C. Tab Visibility 加"全选/全不选"

```html
<div class="settings-section">
  <div class="settings-section-title">🗂️ {{ t('tabVisibility') }}</div>
  <div class="settings-row">
    <button class="btn btn-secondary btn-small" @click="setAllTabs(true)">{{ t('selectAll') || '全选' }}</button>
    <button class="btn btn-secondary btn-small" @click="setAllTabs(false)">{{ t('selectNone') || '全不选' }}</button>
  </div>
  <div class="settings-checkbox-group">
    <!-- 7 个 checkbox 不变 -->
  </div>
</div>
```

```javascript
methods: {
  setAllTabs(visible) {
    this.showTabAll = visible;
    this.showTabNotes = visible;
    this.showTabTodos = visible;
    this.showTabTimeline = visible;
    this.showTabTrash = visible;
    this.showTabCalendar = visible;
    this.showTabBoard = visible;
    this.saveTabVisibility();
  }
}
```

### D. 危险操作二次确认(restoreBackup)

```javascript
async doRestoreBackup(path) {
  if (!confirm(t('backupRestoreConfirm') || '恢复备份会覆盖当前数据,确定继续吗?')) return;
  // ...原逻辑
}
```

---

## 应用顺序建议

| 步骤 | Phase | 工作量 | 视觉收益 |
|------|-------|--------|----------|
| 1 | Phase 1(补缺失 CSS) | 1-2h | 🔥🔥🔥 Pet section 从无样式变正常 |
| 2 | Phase 2(图标 + 分隔) | 0.5h | 🔥🔥 视觉锚点 |
| 3 | Phase 3(segmented) | 1h | 🔥🔥 省 30% 空间 |
| 4 | Phase 4(Pet 子分区) | 1h | 🔥🔥 Pet section 结构清晰 |
| 5 | Phase 5(左 Tab) | 4-6h | 🔥🔥🔥 长期方案,彻底解决 |
| 6 | 增强 A/B/C/D | 各 0.5-1h | 🔥 锦上添花 |

**推荐路径**:
- **短期(本周)**:Phase 1 + 2 + 3 → 3 小时,Pet section 立即可用
- **中期(下周)**:Phase 4 → 1 小时,Pet 结构清晰
- **长期(下次大版本)**:Phase 5 → 4-6 小时,设置面板整体重构

---

## 验收清单

应用每个 Phase 后,检查:

- [ ] Phase 1:Pet section 5 个进度条显示彩色 bar;多宠物列表 9 元素整齐一行
- [ ] Phase 2:每个 section title 前有 emoji;section 之间有横线分隔
- [ ] Phase 3:语言/分组/配色 3 个 radio 变水平按钮组;配色有圆形色块
- [ ] Phase 4:Pet section 有"基础设置 / 状态 / 多宠物"3 个子区;状态条有圆角卡片背景
- [ ] Phase 5:打开设置后看到 6 个 tab;点 Pet tab 只显示 Pet 内容;窗口宽度 640px
- [ ] 所有 inline `style="..."` 已提取为 class
- [ ] i18n key `petBasic` / `petStatus` / `general` / `appearance` / `data` / `chasing` 已补充(中英越三语)

---

## 备注

- 所有 CSS 用了项目的 `--bg-secondary` / `--accent` / `--text-secondary` / `--radius-md` / `--space-*` / `--transition-fast` 等 CSS 变量,无需引入新色板
- `:has()` 选择器需要 Chromium 105+,Electron 33(Chromium 130+)完全支持
- `color-mix(in srgb, ...)` 需要 Chromium 111+,Electron 33 支持
- emoji 图标在 Windows Segoe UI Emoji 渲染稳定,无需额外字体
- Phase 5 的窄屏回退(`@media max-width: 480px`)让 320px 屏幕也能用 tab 滚动
