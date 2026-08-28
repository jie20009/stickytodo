# Phase 2 Patch — Section 图标 + 分隔线(P1-3 / P2-1)

> 仅参考。源文件未改动。
> 前置:Phase 1 已应用(或至少不冲突)。

---

## 应用方式

修改 `style.css` 的 `.settings-section`(第 2358 行)和 `.settings-section-title`(第 2364 行),并修改 `app.js` 模板中 9 处 section title 加 emoji。

---

## 代码块 1:style.css 修改(替换原 .settings-section)

找到第 **2358** 行:

```css
/* 原 */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
```

**替换为**:

```css
/* Phase 2: section 间加分隔线 */
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
  padding-bottom: 0;
}

/* Phase 2: title 加图标位 + 加大字号 */
.settings-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  letter-spacing: 0.01em;
}
```

---

## 代码块 2:app.js 修改 9 处 section title

| 行号 | 原 | 改为 |
|------|-----|------|
| 3856 | `<div class="settings-section-title">{{ t('language') }}</div>` | `<div class="settings-section-title">🌐 {{ t('language') }}</div>` |
| 3865 | `<div class="settings-section-title">{{ t('shortcut') }}</div>` | `<div class="settings-section-title">⌨️ {{ t('shortcut') }}</div>` |
| 3878 | `<div class="settings-section-title">{{ t('grouping') }}</div>` | `<div class="settings-section-title">📊 {{ t('grouping') }}</div>` |
| 3887 | `<div class="settings-section-title">{{ t('colorScheme') }}</div>` | `<div class="settings-section-title">🎨 {{ t('colorScheme') }}</div>` |
| 3896 | `<div class="settings-section-title">{{ t('petTitle') }}</div>` | `<div class="settings-section-title">🐱 {{ t('petTitle') }}</div>` |
| 3999 | `<div class="settings-section-title">{{ t('tabVisibility') }}</div>` | `<div class="settings-section-title">🗂️ {{ t('tabVisibility') }}</div>` |
| 4012 | `<div class="settings-section-title">{{ t('backup') }}</div>` | `<div class="settings-section-title">💾 {{ t('backup') }}</div>` |
| 4031 | `<div class="settings-section-title">{{ t('importData') }}</div>` | `<div class="settings-section-title">📥 {{ t('importData') }}</div>` |
| 4040 | `<div class="settings-section-title">{{ t('stats') }}</div>` | `<div class="settings-section-title">📈 {{ t('stats') }}</div>` |

---

## 验收清单

- [ ] 每个 section title 前有 emoji 图标
- [ ] section 之间有横线分隔
- [ ] title 字号从 13px → 14px,层级更明显
- [ ] 最后一个 section(Statistics)下方无分隔线

---

## 风险评估

| 风险 | 概率 | 缓解 |
|------|------|------|
| emoji 在某些 Windows 渲染不一致 | 低 | Segoe UI Emoji 在 Win10/11 稳定 |
| 分隔线在 dark/light 主题颜色不协调 | 低 | 用 `--border-color` 变量,自动适配 |

回滚:`git checkout style.css app.js`
