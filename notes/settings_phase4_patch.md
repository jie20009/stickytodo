# Phase 4 Patch — Pet section 内部子分区(P1-4)

> 仅参考。源文件未改动。
> 前置:Phase 1 已应用(`.settings-subsection` / `.settings-section-subtitle` 已有 CSS)。

---

## 应用方式

重写 `app.js` 第 **3894-3996** 行的整个 Pet section 模板,拆成 3 个子区:基础设置 / 状态 / 多宠物。

---

## 前置:补充 i18n key

`app.js` I18N 三处(zh / en / vi)各加 2 个 key:

```javascript
// zh(约第 130 行附近)
petBasic: '基础设置',
petStatus: '状态',

// en(约第 205 行附近)
petBasic: 'Basic',
petStatus: 'Status',

// vi(约第 280 行附近)
petBasic: 'Cơ bản',
petStatus: 'Trạng thái',
```

---

## 代码块:app.js 第 3894-3996 行替换

```html
<!-- Pet (StickyTodo Desktop Pet, Stage 1+2 + Stage 5+6) -->
<div class="settings-section">
  <div class="settings-section-title">🐱 {{ t('petTitle') }}</div>

  <!-- ── 子区 1:基础设置 ── -->
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

  <!-- ── 子区 2:状态(仅当 pet 启用且有数据)── -->
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

  <!-- ── 子区 3:多宠物 ── -->
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
```

---

## 与原代码的关键改动

| 改动点 | 原 | 新 |
|--------|----|----|
| Pet section 内部结构 | 11 个 `.settings-row` 平铺 | 3 个 `.settings-subsection`(基础/状态/多宠物) |
| 状态条布局 | 5 行文本堆叠(无 CSS) | 5 行 grid 布局(标签|bar|数值),外层卡片背景 |
| intimacy 进度条 | 无 bar | 加 bar,按 intimacy/10 计算百分比(0-1000 → 0-100%) |
| streak 行 | 纯数值 | 用空 bar 占位 + 数值,保持 grid 对齐 |
| reset 按钮 | `style="color:var(--danger)"` | `.btn-danger` class |
| hint 文字 | 与 checkbox 同一行 | 独立行 + `padding-left: 24px` 对齐 |
| 多宠物创建行 | `.settings-row` | `.settings-row.settings-row-inline`(更紧凑) |

---

## 验收清单

- [ ] Pet section 内有 3 个子区,每个子区上方有 uppercase 子标题
- [ ] 子区之间有虚线分隔
- [ ] "基础设置"区:7 行(启用/角色/装扮/跟随主题+提示/3D+提示/重置)
- [ ] "状态"区:仅当 `petState` 有值时显示,5 个进度条 + 1 个 streak 行,带圆角卡片背景
- [ ] "多宠物"区:创建行 + 列表 + breed 按钮
- [ ] 重置按钮红色边框(不再用 inline style)
- [ ] intimacy 进度条按 0-1000 映射到 0-100%
- [ ] streak 行有占位空 bar,数值右对齐

---

## 风险评估

| 风险 | 概率 | 缓解 |
|------|------|------|
| `petBasic` / `petStatus` i18n key 漏加 | 中 | 应用前先加 3 处 i18n |
| intimacy 进度条按 /10 计算,1000 时正好 100% | 低 | `Math.min(100, ...)` 兜底 |
| 多宠物列表 9 列在 360px 窄屏仍可能挤 | 中 | Phase 5 窄屏适配;或临时把 grid 列宽再缩小 |

回滚:`git checkout app.js`
