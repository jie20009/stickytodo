# Phase 1 Patch — 补齐缺失 CSS(可直接 apply)

> 仅参考。源文件未改动。需要你明确授权后我才会写入 `style.css`。
>
> 前置验证:草稿里引用的 17 个 CSS 变量全部已在 `style.css` 第 22-60 行(dark)和 101-116 行(light)定义,可直接使用。

---

## 应用方式(三选一)

### 方式 A:你自己粘贴(推荐先验证)

1. 打开 `D:\PEGAAi_Opencode\projects\stickytodo_20260820\style.css`
2. 找到第 **2405** 行(`.settings-radio input[type="radio"]` 那一行之后)
3. 在其后插入下方【代码块 1】
4. 启动应用,打开设置 → 桌宠 section,检查进度条 / 多宠物列表是否正常显示

### 方式 B:授权我直接改

告诉我"改 style.css",我会用 edit 工具精确插入,改完跑 lsp_diagnostics 验证。

### 方式 C:用 patch 工具(如果安装了)

```powershell
cd D:\PEGAAi_Opencode\projects\stickytodo_20260820
git apply notes\phase1.patch   # 需要我先生成 .patch 文件
```

---

## 代码块 1:插入到 style.css 第 2405 行之后

```css

/* ============================================================
   Phase 1: Settings 面板缺失元素补齐
   修复:14+ 个模板使用但未定义的 CSS class
   影响:Pet section 从无样式 HTML 块变正常界面
   ============================================================ */

/* ── 通用行:label 在左,控件在右 ── */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-height: 28px;
}
.settings-row > .settings-checkbox {
  flex: 0 1 auto;
}
.settings-row > .btn,
.settings-row > button {
  flex: 0 0 auto;
}

/* ── label 固定宽度,与 select 对齐 ── */
.settings-label {
  flex: 0 0 auto;
  min-width: 72px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ── select 主题化 + 自定义箭头 ── */
.settings-select {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px 24px 4px 8px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path fill='%23888' d='M2 3l3 3 3-3z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.settings-select:hover {
  border-color: var(--accent);
}
.settings-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* ── hint 提示文字 ── */
.settings-hint {
  flex: 1 1 100%;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  padding-left: 24px;
}

/* ── 行内紧凑布局(多宠物创建区)── */
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

/* ── Pet 子分区 ── */
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

/* ── Pet stats 进度条卡片 ── */
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
.pet-stat-bar {
  height: 6px;
  background: var(--bg-active);
  border-radius: 3px;
  overflow: hidden;
}
.pet-stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent) 0%, #60a5fa 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.pet-stat-value {
  text-align: right;
  color: var(--text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* ── 多宠物列表 ── */
.pet-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.pet-list-row {
  display: grid;
  grid-template-columns: 48px 1fr 36px 40px 28px auto auto auto auto;
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
.pet-list-row > .btn {
  padding: 2px 6px;
  font-size: 10px;
  min-width: auto;
}

/* ── 通用辅助:危险按钮 + 小按钮(替换 inline style)── */
.btn-danger {
  color: var(--danger) !important;
  border-color: rgba(239, 68, 68, 0.3);
}
.btn-danger:hover {
  background: var(--danger-bg);
}
.btn-small {
  padding: 2px 8px;
  font-size: 11px;
  min-height: auto;
}
```

---

## 应用后的 HTML 模板微调(可选,Phase 1 不强制)

Phase 1 只补 CSS,**不强制改 HTML**。但若想让 `.btn-danger` / `.btn-small` 生效,需把模板里 2 处 inline style 替换:

### 修改点 1:app.js 第 3935 行

```html
<!-- 原 -->
<button class="btn btn-secondary" @click="resetPet" style="color:var(--danger)">{{ t('petReset') }}</button>

<!-- 改为 -->
<button class="btn btn-secondary btn-danger" @click="resetPet">{{ t('petReset') }}</button>
```

### 修改点 2:app.js 第 4014 行

```html
<!-- 原 -->
<button class="btn btn-primary" @click="doManualBackup" style="margin-bottom:8px">{{ t('backupNow') }}</button>

<!-- 改为 -->
<button class="btn btn-primary" @click="doManualBackup" style="margin-bottom:8px">{{ t('backupNow') }}</button>
<!-- 这行可保留 inline,因为 .btn-primary 自带样式;若要彻底去 inline,加一个 .btn-mb 类 -->
```

> 这两处是 Phase 1 的可选项,不改也能看到 Pet section 的视觉改善。

---

## 验收清单(应用 Phase 1 后逐项检查)

打开设置 → 桌宠 section:

- [ ] **5 个进度条**:Level / XP / Mood / Energy / Intimacy 每行变成 [标签 | 彩色横条 | 数值] 三列布局
- [ ] **进度条有颜色**:蓝色渐变填充,灰色轨道
- [ ] **进度条卡片**:5 行外面包了浅灰圆角卡片(有背景 + 边框)
- [ ] **多宠物列表**:每只宠物一行,9 个元素整齐排成网格
- [ ] **多宠物按钮**:打开/关闭/变身 3 个按钮紧凑,字号 10px
- [ ] **label/select 行**:角色 / 装扮 select 的 label 固定宽度,select 占满剩余
- [ ] **hint 文字**:3D 桌宠 / 跟随主题 的提示文字变小、灰色、缩进
- [ ] **多宠物子区**:有虚线分隔线 + uppercase 子标题

打开设置 → 备份 section:
- [ ] 备份按钮颜色正常(若改了 btn-danger,Reset 按钮变红色边框)

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `.settings-row` 已在某处隐式使用 | 低 | 可能与现有布局冲突 | grep 验证:当前 style.css 无 `.settings-row` 定义,新增安全 |
| grid-template-columns 9 列在 360px 窄屏挤 | 中 | 多宠物列表可能横向溢出 | 后续 Phase 5 窄屏适配解决;或临时减小列宽 |
| `:has()` 不支持 | 极低 | 仅影响 Phase 3,不影响 Phase 1 | Electron 33 = Chromium 130,完全支持 |
| 进度条 `transition: width 0.3s` 在数据更新时跳变 | 低 | 视觉小瑕疵 | 可接受;若介意可去掉 transition |

---

## 回滚方式

如果应用后发现问题,回滚很简单:

```powershell
cd D:\PEGAAi_Opencode\projects\stickytodo_20260820
git diff style.css          # 看改动
git checkout style.css      # 撤销所有改动
```

> 注:`style.css` 当前已 modified(你之前的 3D 修复改过它),`git checkout` 会连那些改动一起撤销。
> 若只想撤销 Phase 1,手动删除新增的 `/* Phase 1 */` 注释块到下一个 `/* ====== */` 之间的内容即可。

---

## 下一步

- 你说"改吧" → 我用 edit 工具把【代码块 1】插入 style.css 第 2405 行后,跑验证
- 你说"继续 Phase 2" → 我生成 Phase 2(图标 + 分隔线)的 patch
- 你说"上 Phase 5" → 我直接重构为左 Tab 布局(需要授权改 app.js + style.css)
