# Phase 5 Patch — 左 Tab 布局(推荐长期重构)

> 仅参考。源文件未改动。
> 前置:Phase 1-4 已应用。
> 改动范围:`app.js` 整个 settings modal 模板(3847-4067 行) + `style.css` settings-modal 部分(2304-2405 行) + Vue data 加 `settingsTab` 状态。
> 工作量:4-6 小时(含调试)

---

## 总体改动

```
┌──────────────────────────────────────┐
│  ⚙ 设置                          ×  │  ← header(粘性)
├──────────┬───────────────────────────┤
│ 🌐 通用  │                           │
│ 🎨 外观  │  [当前 tab 的内容]         │  ← 左 tab 140px + 右内容 flex
│ 🐱 桌宠  │                           │
│ 🗂 标签  │                           │
│ 💾 数据  │                           │
│ 📈 统计  │                           │
└──────────┴───────────────────────────┘
       ↑ max-width: 640px, max-height: 80vh
```

---

## 代码块 1:style.css 修改

### 1.1 修改 `.settings-modal`(第 2304 行)

```css
/* 原 */
.settings-modal {
  width: 90%;
  max-width: 360px;
  background: var(--bg-content);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: editorSlideIn 0.2s ease;
  outline: none;
}

/* 改为 */
.settings-modal {
  width: 90%;
  max-width: 360px;
  background: var(--bg-content);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: editorSlideIn 0.2s ease;
  outline: none;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

/* Phase 5: tabbed 变体 — 更宽更高 */
.settings-modal--tabbed {
  max-width: 640px;
  max-height: 80vh;
}
```

### 1.2 修改 `.settings-header`(第 2315 行)— 加 sticky

```css
/* 原 */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

/* 改为(加 sticky) */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-content);
  z-index: 2;
}
```

### 1.3 修改 `.settings-body`(第 2349 行)— tabbed 时改为 flex 容器

```css
/* 原 */
.settings-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 60vh;
  overflow-y: auto;
}

/* 改为 */
.settings-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 60vh;
  overflow-y: auto;
}

/* Phase 5: tabbed 模式 — 横向布局,无 max-height(由 modal 限制) */
.settings-modal--tabbed .settings-body {
  padding: 0;
  max-height: none;
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  min-height: 0;
}
```

### 1.4 追加新 CSS(放 .settings-body 之后)

```css

/* ============================================================
   Phase 5: 左 Tab 布局
   ============================================================ */

/* 左侧 tab 导航 */
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
  width: 100%;
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

/* 右侧内容容器 */
.settings-tab-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--space-4);
  min-width: 0;
}

.settings-tab-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── 窄屏回退:tab 转横向滚动 ── */
@media (max-width: 480px) {
  .settings-modal--tabbed {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    height: 90vh;
  }
  .settings-modal--tabbed .settings-body {
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
    flex: 0 0 auto;
  }
  .settings-tab-content {
    flex: 1 1 auto;
  }
}
```

---

## 代码块 2:app.js Vue data 加状态

找到 `pet3DEnabled` 定义处(约 4117 行),在其后加:

```javascript
const pet3DEnabled    = ref(false);
const settingsTab     = ref('general');  // Phase 5: settings 面板当前 tab
```

然后在 setup() 的 return 里(约 6105 行附近)加:

```javascript
return {
  // ... 原有
  pet3DEnabled,
  onPet3DChange,
  settingsTab,        // ← 新增
  // ... 原有
};
```

---

## 代码块 3:app.js 替换整个 settings modal 模板(3847-4067 行)

```html
<div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
  <div class="settings-modal settings-modal--tabbed" @keydown="onShortcutKeydown" role="dialog" aria-modal="true" :aria-label="t('settings')">
    <div class="settings-header">
      <span class="settings-title">⚙ {{ t('settings') }}</span>
      <button class="settings-close" @click="showSettings = false">×</button>
    </div>
    <div class="settings-body">
      <!-- 左侧 tab 导航 -->
      <nav class="settings-tabs" role="tablist">
        <button class="settings-tab" :class="{ active: settingsTab === 'general' }" @click="settingsTab = 'general'" role="tab">🌐 {{ t('general') || '通用' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'appearance' }" @click="settingsTab = 'appearance'" role="tab">🎨 {{ t('appearance') || '外观' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'pet' }" @click="settingsTab = 'pet'" role="tab">🐱 {{ t('petTitle') }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'tabs' }" @click="settingsTab = 'tabs'" role="tab">🗂️ {{ t('tabVisibility') }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'data' }" @click="settingsTab = 'data'" role="tab">💾 {{ t('data') || '数据' }}</button>
        <button class="settings-tab" :class="{ active: settingsTab === 'stats' }" @click="settingsTab = 'stats'" role="tab">📈 {{ t('stats') }}</button>
      </nav>

      <!-- 右侧内容 -->
      <div class="settings-tab-content">

        <!-- ── Tab: 通用(Language + Shortcut + Grouping)── -->
        <div v-show="settingsTab === 'general'" class="settings-tab-pane">
          <!-- Language -->
          <div class="settings-section">
            <div class="settings-section-title">🌐 {{ t('language') }}</div>
            <div class="segmented">
              <label class="segmented-option"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
              <label class="segmented-option"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
              <label class="segmented-option"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
            </div>
          </div>
          <!-- Shortcut -->
          <div class="settings-section">
            <div class="settings-section-title">⌨️ {{ t('shortcut') }}</div>
            <div class="shortcut-row">
              <span class="shortcut-current">{{ currentShortcut }}</span>
              <button v-if="!recordingShortcut" class="btn btn-secondary" @click="startRecording">{{ t('recordShortcut') }}</button>
              <span v-else class="recording-hint">{{ recordedShortcut || t('pressKeys') }}</span>
            </div>
            <div v-if="recordingShortcut && recordedShortcut" class="shortcut-save-row">
              <button class="btn btn-primary" @click="saveShortcut">{{ t('save') }}</button>
              <button class="btn btn-secondary" @click="recordingShortcut = false">{{ t('cancel') }}</button>
            </div>
          </div>
          <!-- Grouping -->
          <div class="settings-section">
            <div class="settings-section-title">📊 {{ t('grouping') }}</div>
            <div class="segmented">
              <label class="segmented-option"><input type="radio" value="date" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByDate') }}</label>
              <label class="segmented-option"><input type="radio" value="alpha" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByAlpha') }}</label>
              <label class="segmented-option"><input type="radio" value="none" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByNone') }}</label>
            </div>
          </div>
        </div>

        <!-- ── Tab: 外观(Color Scheme)── -->
        <div v-show="settingsTab === 'appearance'" class="settings-tab-pane">
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
        </div>

        <!-- ── Tab: 桌宠(完整 Pet section,含 3 子区)── -->
        <div v-show="settingsTab === 'pet'" class="settings-tab-pane">
          <div class="settings-section">
            <div class="settings-section-title">🐱 {{ t('petTitle') }}</div>
            <!-- 子区 1:基础设置 -->
            <div class="settings-subsection">
              <div class="settings-section-subtitle">{{ t('petBasic') }}</div>
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
            <!-- 子区 2:状态 -->
            <div v-if="petState" class="settings-subsection">
              <div class="settings-section-subtitle">{{ t('petStatus') }}</div>
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
                    <span v-if="p.chasing" :title="t('chasing') || '追逐中'">🐭</span>
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
        </div>

        <!-- ── Tab: 标签可见性 ── -->
        <div v-show="settingsTab === 'tabs'" class="settings-tab-pane">
          <div class="settings-section">
            <div class="settings-section-title">🗂️ {{ t('tabVisibility') }}</div>
            <div class="settings-checkbox-group">
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabAll" @change="saveTabVisibility" /> {{ t('tabAll') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabNotes" @change="saveTabVisibility" /> {{ t('tabNotes') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabTodos" @change="saveTabVisibility" /> {{ t('tabTodos') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabTimeline" @change="saveTabVisibility" /> {{ t('tabTimeline') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabTrash" @change="saveTabVisibility" /> 🗑 {{ t('trash') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabCalendar" @change="saveTabVisibility" /> {{ t('tabCalendar') }}</label>
              <label class="settings-checkbox"><input type="checkbox" v-model="showTabBoard" @change="saveTabVisibility" /> {{ t('tabBoard') }}</label>
            </div>
          </div>
        </div>

        <!-- ── Tab: 数据(Backup + Import)── -->
        <div v-show="settingsTab === 'data'" class="settings-tab-pane">
          <!-- Backup -->
          <div class="settings-section">
            <div class="settings-section-title">💾 {{ t('backup') }}</div>
            <div class="backup-info">{{ t('backupAuto') }}</div>
            <button class="btn btn-primary" @click="doManualBackup" style="margin-bottom:8px">{{ t('backupNow') }}</button>
            <div v-if="backupList.length > 0" class="backup-list">
              <div v-for="b in backupList" :key="b.name" class="backup-row">
                <div class="backup-row-info">
                  <span class="backup-row-name">{{ b.name }}</span>
                  <span class="backup-row-meta">{{ formatSize(b.size) }} · {{ formatDateStr(b.date) }}</span>
                </div>
                <div class="backup-row-actions">
                  <button class="btn btn-secondary" @click="doRestoreBackup(b.path)">{{ t('backupRestore') }}</button>
                  <button class="btn btn-secondary btn-danger" @click="doDeleteBackup(b.path, b.name)">{{ t('backupDelete') }}</button>
                </div>
              </div>
            </div>
            <div v-else class="backup-empty">{{ t('backupList') }}: —</div>
          </div>
          <!-- Import Data -->
          <div class="settings-section">
            <div class="settings-section-title">📥 {{ t('importData') }}</div>
            <div class="import-row">
              <label class="import-label btn btn-secondary" for="import-file-input">{{ t('importSelect') }}</label>
              <input type="file" id="import-file-input" accept=".json" style="display:none" @change="onImportFile" />
              <span v-if="importResultMsg" class="import-result">{{ importResultMsg }}</span>
            </div>
          </div>
        </div>

        <!-- ── Tab: 统计 ── -->
        <div v-show="settingsTab === 'stats'" class="settings-tab-pane">
          <div class="settings-section stats-section">
            <div class="settings-section-title">📈 {{ t('stats') }}</div>
            <div v-if="stats.totalTodos === 0" class="stats-empty">{{ t('statsNoData') }}</div>
            <template v-else>
              <div class="stat-row">
                <span class="stat-label">{{ t('statsThisWeek') }}</span>
                <span class="stat-value">{{ stats.weekCompleted }}/{{ stats.weekTotal }}</span>
                <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: stats.weekTotal ? (stats.weekCompleted / stats.weekTotal * 100) + '%' : '0%' }"></div></div>
              </div>
              <div class="stat-row">
                <span class="stat-label">{{ t('statsThisMonth') }}</span>
                <span class="stat-value">{{ stats.monthCompleted }}/{{ stats.monthTotal }}</span>
                <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: stats.monthTotal ? (stats.monthCompleted / stats.monthTotal * 100) + '%' : '0%' }"></div></div>
              </div>
              <div class="stat-row">
                <span class="stat-label">{{ t('statsAllTime') }}</span>
                <span class="stat-value">{{ t('statsNotes') }}: {{ stats.totalNotes }} · {{ t('statsTodos') }}: {{ stats.totalTodos }} · {{ t('statsCompleted') }}: {{ stats.completedTodos }}</span>
              </div>
              <div class="stat-chart">
                <div v-for="(d, i) in stats.last7Days" :key="i" class="stat-chart-col">
                  <div class="stat-chart-bar" :style="{ height: (d.count > 0 ? Math.max(d.count / stats.maxDay * 60, 4) : 2) + 'px' }"></div>
                  <div class="stat-chart-label">{{ d.label }}</div>
                </div>
              </div>
            </template>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>
```

---

## 前置:补充 i18n key

`app.js` 三处 I18N(zh / en / vi)各加 4 个 key:

```javascript
// zh
petBasic: '基础设置',
petStatus: '状态',
general: '通用',
appearance: '外观',
data: '数据',

// en
petBasic: 'Basic',
petStatus: 'Status',
general: 'General',
appearance: 'Appearance',
data: 'Data',

// vi
petBasic: 'Cơ bản',
petStatus: 'Trạng thái',
general: 'Chung',
appearance: 'Giao diện',
data: 'Dữ liệu',
```

---

## 与原代码的对比

| 维度 | 原(平铺滚动) | Phase 5(左 Tab) |
|------|-------------|------------------|
| Modal 宽度 | 360px | 640px |
| Modal 高度 | max-height: 60vh | max-height: 80vh |
| 首屏可见 | 4 个 section | **6 个 tab 全可见** |
| 找 Pet 设置 | 滚动 50% | 点 1 次 tab |
| 找 Backup | 滚动到底 | 点 1 次 tab |
| Pet section 挤占 | 35% 面板 | 独立 tab |
| Statistics 位置 | 混在设置里 | 独立 tab |
| 窄屏适配 | 9 列列表折行 | tab 转横向滚动 |
| Section 间分隔 | 加分隔线(Phase 2) | 同 tab 内仍分隔 |

---

## 验收清单

- [ ] 打开设置后看到 6 个 tab(🌐通用 / 🎨外观 / 🐱桌宠 / 🗂️标签 / 💾数据 / 📈统计)
- [ ] 默认显示"通用"tab,内容为 Language + Shortcut + Grouping
- [ ] 点"桌宠"tab,只显示 Pet section(含 3 个子区)
- [ ] 点"数据"tab,显示 Backup + Import
- [ ] 点"统计"tab,显示 Statistics
- [ ] 窗口宽度 640px,左右布局
- [ ] header 粘性,滚动时不动
- [ ] 480px 以下窄屏,tab 转横向滚动

---

## 风险评估

| 风险 | 概率 | 缓解 |
|------|------|------|
| `v-show` 切换 tab 时 Vue 重新渲染? | 低 | `v-show` 只切 display,不卸载,状态保留 |
| i18n key 漏加导致 tab 名显示英文 | 中 | 应用前先加 5 个 key × 3 语言 = 15 处 |
| `settingsTab` ref 未 return 到模板 | 中 | 别忘了 setup() return 里加 |
| 640px 在 1366×768 笔记本仍偏大 | 低 | `width: 90%` 兜底,实际显示 ~580px |
| Pet tab 内容多仍需内部滚动 | 可接受 | 右侧 `.settings-tab-content` 自带 overflow-y: auto |

回滚:`git checkout app.js style.css`

---

## 后续可选增强

应用 Phase 5 后可继续做:

- **A. 设置搜索**:header 右侧加搜索框,跨 tab 高亮匹配项
- **B. Tab 记忆**:localStorage 记住上次访问的 tab
- **C. 键盘导航**:Tab/Shift+Tab 切 tab,数字键 1-6 快速跳转
- **D. Tab 角标**:有未读统计时在"📈 统计"tab 加红点

---

## 总结:5 个 Phase 的关系

```
Phase 1 (补缺失 CSS)     ─┐
Phase 2 (图标 + 分隔线)   ├─ 短期方案,3-4h,Pet section 立即可用
Phase 3 (segmented)     │
Phase 4 (Pet 子分区)    ─┘

Phase 5 (左 Tab 布局)    ─── 长期方案,4-6h,彻底重构
                              ↑ 包含 Phase 1-4 所有改动
```

**推荐路径**:
- **本周**:Phase 1 + 2 + 3(3h)→ Pet section 立即可用
- **下周**:Phase 4(1h)→ Pet 结构清晰
- **下次大版本**:Phase 5(4-6h)→ 整体重构为左 Tab

**或者**:直接上 Phase 5(它已包含 Phase 1-4 的所有 CSS 和模板改动)→ 一次到位,6h 完成。
