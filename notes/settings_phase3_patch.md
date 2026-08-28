# Phase 3 Patch — Radio → Segmented Control(P1-2)

> 仅参考。源文件未改动。
> 前置:Phase 1 已应用。
> 技术依赖:Electron 33(Chromium 130+)支持 `:has()` 伪类。

---

## 应用方式

1. `style.css` 末尾追加 Phase 3 CSS
2. `app.js` 模板中 3 处 `.settings-radio-group` → `.segmented`,radio label → `.segmented-option`

---

## 代码块 1:style.css 追加

```css

/* ============================================================
   Phase 3: Segmented Control(替代垂直 radio)
   影响:Language / Grouping / ColorScheme 3 个 section 省 50% 高度
   ============================================================ */

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
  gap: 4px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  user-select: none;
  text-align: center;
  white-space: nowrap;
  position: relative;
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

.segmented-option:not(:has(input:checked)):hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 配色选项加色块预览 */
.segmented-option--scheme {
  gap: 6px;
}
.segmented-scheme-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}
```

---

## 代码块 2:app.js 修改 — Language section(第 3855-3862 行)

```html
<!-- 原 -->
<div class="settings-section">
  <div class="settings-section-title">🌐 {{ t('language') }}</div>
  <div class="settings-radio-group">
    <label class="settings-radio"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
    <label class="settings-radio"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
    <label class="settings-radio"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
  </div>
</div>

<!-- 改为 -->
<div class="settings-section">
  <div class="settings-section-title">🌐 {{ t('language') }}</div>
  <div class="segmented">
    <label class="segmented-option"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
    <label class="segmented-option"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
    <label class="segmented-option"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
  </div>
</div>
```

---

## 代码块 3:app.js 修改 — Grouping section(第 3877-3884 行)

```html
<!-- 原 -->
<div class="settings-section">
  <div class="settings-section-title">📊 {{ t('grouping') }}</div>
  <div class="settings-radio-group">
    <label class="settings-radio"><input type="radio" value="date" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByDate') }}</label>
    <label class="settings-radio"><input type="radio" value="alpha" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByAlpha') }}</label>
    <label class="settings-radio"><input type="radio" value="none" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByNone') }}</label>
  </div>
</div>

<!-- 改为 -->
<div class="settings-section">
  <div class="settings-section-title">📊 {{ t('grouping') }}</div>
  <div class="segmented">
    <label class="segmented-option"><input type="radio" value="date" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByDate') }}</label>
    <label class="segmented-option"><input type="radio" value="alpha" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByAlpha') }}</label>
    <label class="segmented-option"><input type="radio" value="none" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByNone') }}</label>
  </div>
</div>
```

---

## 代码块 4:app.js 修改 — Color Scheme section(第 3886-3893 行)

```html
<!-- 原 -->
<div class="settings-section">
  <div class="settings-section-title">🎨 {{ t('colorScheme') }}</div>
  <div class="settings-radio-group">
    <label class="settings-radio"><input type="radio" value="default" v-model="colorScheme" @change="setColorScheme('default')" /> {{ t('schemeDefault') }}</label>
    <label class="settings-radio"><input type="radio" value="windows" v-model="colorScheme" @change="setColorScheme('windows')" /> {{ t('schemeWindows') }}</label>
    <label class="settings-radio"><input type="radio" value="morandi" v-model="colorScheme" @change="setColorScheme('morandi')" /> {{ t('schemeMorandi') }}</label>
  </div>
</div>

<!-- 改为 -->
<div class="settings-section">
  <div class="settings-section-title">🎨 {{ t('colorScheme') }}</div>
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
</div>
```

---

## 验收清单

- [ ] 语言 3 选项在一行水平排列,选中项蓝色背景白字
- [ ] 分组 3 选项在一行水平排列
- [ ] 配色 3 选项带圆形色块预览(黄 / 浅黄 / 莫兰迪棕)
- [ ] 鼠标悬停未选项有浅灰背景
- [ ] 3 个 section 总高度从 ~180px → ~90px,省 90px

---

## 风险评估

| 风险 | 概率 | 缓解 |
|------|------|------|
| `:has()` 在旧 Chromium 不支持 | 极低 | Electron 33 = Chromium 130,完全支持 |
| 3 选项文字过长折行 | 低 | `white-space: nowrap` + `overflow: hidden` |
| 配色色块颜色与实际主题不完全一致 | 低 | 用代表性主色,用户可点选后看实际效果 |

回滚:`git checkout style.css app.js`

---

## 备选:无 :has() 兼容方案(若需要)

若担心 `:has()` 兼容(虽然 Electron 33 支持),可改用 Vue class binding:

```html
<label class="segmented-option" :class="{ 'segmented-option--active': locale === 'zh' }">
  <input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文
</label>
```

```css
.segmented-option--active {
  background: var(--accent);
  color: white;
  font-weight: 500;
}
```

但需要每处加 `:class`,代码更冗长。推荐直接用 `:has()`。
