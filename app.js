// ============================================
// StickyTodo - Vue 3 Application
// ============================================

const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue;

// ============================================
// Note Colors
// ============================================
const NOTE_COLORS = [
  { value: 'yellow',   key: 'colorYellow' },
  { value: 'green',    key: 'colorGreen' },
  { value: 'blue',     key: 'colorBlue' },
  { value: 'pink',     key: 'colorPink' },
  { value: 'gray',     key: 'colorGray' },
  { value: 'purple',   key: 'colorPurple' },
  { value: 'charcoal', key: 'colorCharcoal' }
];

// Color scheme definitions — each maps color names to CSS variable references.
// The actual hex values are defined in style.css under [data-color-scheme="..."].
const COLOR_SCHEMES = [
  { id: 'default',  key: 'schemeDefault' },
  { id: 'windows',  key: 'schemeWindows' },
  { id: 'morandi',  key: 'schemeMorandi' }
];

// getColorName: DB now stores color names directly (e.g. 'yellow').
// For backward compat, old hex values are mapped to names.
const HEX_TO_NAME = {
  '#fef3c7': 'yellow', '#d1fae5': 'green', '#dbeafe': 'blue',
  '#fce7f3': 'pink', '#f3f4f6': 'gray', '#ede9fe': 'purple',
  '#4b5563': 'charcoal'
};
const getColorName = (color) => {
  if (!color) return 'yellow';
  // Already a name? Return as-is.
  if (['yellow','green','blue','pink','gray','purple','charcoal'].includes(color)) return color;
  // Legacy hex? Map to name.
  return HEX_TO_NAME[color] || 'yellow';
};

// Module-level HTML sanitizer — SEC-01: improved to block SVG/onload, inline style, data: URLs.
// Used by NoteList, NoteEditor version preview, and AllView.
const sanitizeHtmlGlobal = (html) => {
  if (!html) return '';
  return String(html)
    // Strip dangerous tags entirely (including SVG which can carry onload)
    .replace(/<(script|iframe|object|embed|style|svg|math|link|meta|base|form)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|style|svg|math|link|meta|base|form)\b[^>]*\/?>/gi, '')
    // Strip all on* event handlers (including /onload without preceding space)
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Block javascript: and data: URLs in href/src
    .replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*["']data:text\/html[^"']*["']/gi, '$1="#"')
    // Strip inline style attributes that could carry url(javascript:...)
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, '')
    ;
};

const I18N = {
  zh: {
    tabNotes: '便笺', tabTodos: '待办', tabAll: '全部',
    trash: '回收站', trashEmpty: '回收站是空的', restoreFromTrash: '从回收站恢复', deletePermanently: '永久删除', confirmPermanentDelete: '确定永久删除吗？此操作不可恢复。', undoDelete: '已删除，按 Ctrl+Z 恢复', autoPurgeHint: '回收站内容30天后自动清理',
    notes: '便笺', todos: '待办',
    noNotes: '还没有便笺', noNotesHint: '点击右上角 + 创建第一个便笺',
    noTodos: '还没有待办事项', noTodosHint: '点击右上角 + 添加新的待办', noTodosCompleted: '还没有完成的待办',
    loading: '加载中...',
    addNote: '新增便笺', addTodo: '新增待办', save: '保存', cancel: '取消', edit: '编辑', delete: '删除', close: '关闭', minimize: '最小化', export: '导出数据', copyNote: '复制便笺', addInlineTodo: '添加待办', expand: '展开', collapse: '收起',
    addInSidebar: '在侧边栏新建', addInWindow: '弹出独立窗口',
    titlePlaceholder: '标题', contentPlaceholder: '写下你的想法...', todoTitlePlaceholder: '待办事项...',
    todoList: '待办清单', color: '颜色', floatingWindow: '悬浮窗口', priority: '优先级', dueDate: '截止日期', category: '分类', categoryPlaceholder: '工作、生活、学习...', linkNote: '关联便笺',
    bold: '粗体 (Ctrl+B)', italic: '斜体 (Ctrl+I)', underline: '下划线 (Ctrl+U)', strikethrough: '删除线 (Ctrl+T)', list: '列表 (Ctrl+Shift+L)', insertImage: '插入图片', shrinkImage: '缩小图片', resetImageSize: '重置图片大小', enlargeImage: '放大图片',
    priorityAll: '全部优先级', priorityHigh: '🔴 高', priorityMedium: '🟡 中', priorityLow: '🟢 低',
    confirmDeleteNote: '确定要删除这个便笺吗？', confirmDeleteTodo: '确定要删除这个待办事项吗？', promptTodoTitle: '待办事项:',
    pinIndicator: '📌 悬浮窗口', setFloating: '设为悬浮', unsetFloating: '取消悬浮', pinned: '已开启', unpinned: '已关闭',
    popOutNote: '在独立窗口打开', toggleFloatingOnTop: '切换置顶',
    toggleDark: '切换到暗色模式', toggleLight: '切换到亮色模式', opacity: '透明度', pinOnTop: '置顶窗口', unpinFromTop: '取消置顶',
    colorYellow: '黄色', colorGreen: '绿色', colorBlue: '蓝色', colorPink: '粉色', colorGray: '灰色', colorPurple: '浅紫', colorCharcoal: '炭黑',
    settings: '设置', language: '语言', shortcut: '快捷键', grouping: '分组', groupByDate: '按日期分组', groupByAlpha: '按字母 A-Z 分组', groupByNone: '不分组', recordShortcut: '录制快捷键', pressKeys: '按下组合键...', tabVisibility: '标签页显示',
    exportSuccess: '数据已导出到: ', exportFail: '导出失败: ',
    groupToday: '今天', groupThisWeek: '本周', groupEarlier: '更早', groupAZ: 'A-Z', tomorrow: '明天',
    noteTitle: '便笺',
    filterAll: '全部', filterActive: '未完成', filterCompleted: '已完成',
    searchPlaceholder: '搜索...', searchNoResults: '没有匹配的结果', clearSearch: '清除搜索',
    reminderSoon: '即将到期', reminderDismiss: '知道了', reminderDueOn: '到期时间',
    backup: '数据备份', backupNow: '立即备份', backupList: '备份列表', backupRestore: '恢复', backupDelete: '删除备份',
    backupConfirmRestore: '恢复会重启应用，确定？', backupConfirmDelete: '确定删除这个备份？',
    backupAuto: '已开启自动备份（每4小时）', backupSize: '大小', backupDate: '日期',
    dragToReorder: '拖动重新排序',
    tags: '标签', addTag: '添加标签', allTags: '全部标签', tagPlaceholder: '输入标签...', noTags: '暂无标签',
    subtasks: '子任务', addSubtask: '添加子任务', subtaskProgress: '完成 {done}/{total}', noSubtasks: '暂无子任务', subtaskPlaceholder: '子任务标题...',
    repeat: '重复', repeatNone: '不重复', repeatDaily: '每天', repeatWeekly: '每周', repeatMonthly: '每月',
    fontSize: '字号', fontSmall: '小', fontNormal: '正常', fontLarge: '大', fontXLarge: '特大', textColor: '文字颜色',
    mdTable: '表格', mdCodeBlock: '代码块', mdLink: '链接', mdChecklist: '清单', mdHr: '分割线',
    tabCalendar: '📅 日历',
    calMonth: '月', calWeek: '周', calToday: '今天', calPrev: '‹', calNext: '›', calNoTodos: '无待办', calMore: '还有 {n} 项',
    calMon: '一', calTue: '二', calWed: '三', calThu: '四', calFri: '五', calSat: '六', calSun: '日',
    stats: '📊 统计', statsThisWeek: '本周', statsThisMonth: '本月', statsAllTime: '总计',
    statsCompleted: '已完成', statsTotal: '总数', statsNotes: '便笺数', statsTodos: '待办数', statsNoData: '暂无数据',
    cmdPlaceholder: '输入命令或搜索...', cmdNewNote: '新建便笺', cmdNewTodo: '新建待办', cmdToggleTheme: '切换主题', cmdExportData: '导出数据', cmdOpenSettings: '打开设置', cmdToggleCalendar: '日历', cmdArchiveNotes: '归档便笺',
    archive: '归档', archivedNotes: '已归档便笺', archivedTodos: '已归档待办', restore: '恢复', archiveNote: '归档便笺', archiveTodo: '归档待办',
    pomodoroStart: '开始', pomodoroPause: '暂停', pomodoroReset: '重置', pomodoroComplete: '番茄钟完成！',
      duplicateNote: '复制便笺', duplicateSuffix: '副本',
    multiSelect: '多选', selectAll: '全选', batchDelete: '批量删除', batchArchive: '批量归档', batchColor: '改色', selectedCount: '已选 {n} 项', exitMultiSelect: '退出多选',
    wikiLink: '维基链接', createLinkedNote: '创建链接便笺', backlinks: '反向链接', noBacklinks: '暂无反向链接',
    tabBoard: '📋 看板', tabTimeline: '📈 时间线', boardEmpty: '看板为空',
    slashHeading1: '一级标题', slashHeading2: '二级标题', slashHeading3: '三级标题', slashList: '列表', slashTodo: '待办清单', slashCode: '代码块', slashQuote: '引用', slashHr: '分割线', slashTable: '表格', slashLink: '链接', slashImage: '图片', slashDate: '日期', slashTime: '时间',
    template: '模板', tplMeeting: '会议记录', tplReading: '读书笔记', tplShopping: '购物清单', tplWeekly: '周计划', tplGoals: '目标追踪',
    smartDate: '智能日期', smartDateFound: '检测到日期：', smartDateNotFound: '未检测到日期',
    voiceInput: '语音输入', voiceNotSupported: '浏览器不支持语音识别',
    encryptNote: '加密便笺', decryptNote: '解密便笺', enterPassword: '输入密码', encrypted: '加密内容', wrongPassword: '密码错误',
    versionHistory: '版本历史', restoreVersion: '恢复版本', noVersions: '暂无版本', versionCount: '版本数',
    focusMode: '专注模式', exitFocus: '退出专注',
    shareImage: '分享为图片', imageSaved: '图片已保存',
    timelineEmpty: '暂无动态', tlNoteCreated: '便笺创建', tlNoteUpdated: '便笺更新', tlTodoCreated: '待办创建', tlTodoCompleted: '待办完成',
    importData: '导入数据', importSelect: '选择文件', importResult: '导入完成', importError: '导入失败',
    toggleTodo: '切换完成', undoDeleteFailed: '项目已永久删除，无法恢复',
    colorScheme: '配色方案', schemeDefault: '经典浅色', schemeWindows: 'Windows 便笺', schemeMorandi: '莫兰迪柔和',

  },
  en: {
    tabNotes: 'Notes', tabTodos: 'Todos', tabAll: 'All',
    trash: 'Trash', trashEmpty: 'Trash is empty', restoreFromTrash: 'Restore from trash', deletePermanently: 'Delete permanently', confirmPermanentDelete: 'Permanently delete? This cannot be undone.', undoDelete: 'Deleted, press Ctrl+Z to undo', autoPurgeHint: 'Trash auto-purges after 30 days',
    notes: 'Notes', todos: 'Todos',
    noNotes: 'No notes yet', noNotesHint: 'Click + at top right to create your first note',
    noTodos: 'No todos yet', noTodosHint: 'Click + at top right to add a new todo', noTodosCompleted: 'No completed todos',
    loading: 'Loading...',
    addNote: 'New note', addTodo: 'New todo', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', close: 'Close', minimize: 'Minimize', export: 'Export data', copyNote: 'Copy note', addInlineTodo: 'Add todo', expand: 'Expand', collapse: 'Collapse',
    addInSidebar: 'New in sidebar', addInWindow: 'Open in window',
    titlePlaceholder: 'Title', contentPlaceholder: 'Write your thoughts...', todoTitlePlaceholder: 'Todo item...',
    todoList: 'Todo list', color: 'Color', floatingWindow: 'Floating window', priority: 'Priority', dueDate: 'Due date', category: 'Category', categoryPlaceholder: 'Work, Life, Study...', linkNote: 'Link note',
    bold: 'Bold (Ctrl+B)', italic: 'Italic (Ctrl+I)', underline: 'Underline (Ctrl+U)', strikethrough: 'Strikethrough (Ctrl+T)', list: 'List (Ctrl+Shift+L)', insertImage: 'Insert image', shrinkImage: 'Shrink image', resetImageSize: 'Reset image size', enlargeImage: 'Enlarge image',
    priorityAll: 'All priorities', priorityHigh: '🔴 High', priorityMedium: '🟡 Medium', priorityLow: '🟢 Low',
    confirmDeleteNote: 'Delete this note?', confirmDeleteTodo: 'Delete this todo?', promptTodoTitle: 'Todo item:',
    pinIndicator: '📌 Floating', setFloating: 'Set as floating', unsetFloating: 'Unset floating', pinned: 'Pinned', unpinned: 'Not pinned',
    popOutNote: 'Open in window', toggleFloatingOnTop: 'Toggle always on top',
    toggleDark: 'Switch to dark mode', toggleLight: 'Switch to light mode', opacity: 'Opacity', pinOnTop: 'Pin on top', unpinFromTop: 'Unpin from top',
    colorYellow: 'Yellow', colorGreen: 'Green', colorBlue: 'Blue', colorPink: 'Pink', colorGray: 'Gray', colorPurple: 'Purple', colorCharcoal: 'Charcoal',
    settings: 'Settings', language: 'Language', shortcut: 'Shortcut', grouping: 'Grouping', groupByDate: 'Group by date', groupByAlpha: 'Group A-Z', groupByNone: 'No grouping', recordShortcut: 'Record shortcut', pressKeys: 'Press key combination...', tabVisibility: 'Tab visibility',
    exportSuccess: 'Data exported to: ', exportFail: 'Export failed: ',
    groupToday: 'Today', groupThisWeek: 'This week', groupEarlier: 'Earlier', groupAZ: 'A-Z', tomorrow: 'Tomorrow',
    noteTitle: 'Note',
    filterAll: 'All', filterActive: 'Active', filterCompleted: 'Completed',
    searchPlaceholder: 'Search...', searchNoResults: 'No results found', clearSearch: 'Clear search',
    reminderSoon: 'Due soon', reminderDismiss: 'Got it', reminderDueOn: 'Due on',
    backup: 'Backup', backupNow: 'Backup now', backupList: 'Backup list', backupRestore: 'Restore', backupDelete: 'Delete backup',
    backupConfirmRestore: 'This will restart the app. Continue?', backupConfirmDelete: 'Delete this backup?',
    backupAuto: 'Auto-backup enabled (every 4 hours)', backupSize: 'Size', backupDate: 'Date',
    dragToReorder: 'Drag to reorder',
    tags: 'Tags', addTag: 'Add tag', allTags: 'All tags', tagPlaceholder: 'Enter tag...', noTags: 'No tags',
    subtasks: 'Subtasks', addSubtask: 'Add subtask', subtaskProgress: '{done}/{total} done', noSubtasks: 'No subtasks', subtaskPlaceholder: 'Subtask title...',
    repeat: 'Repeat', repeatNone: 'None', repeatDaily: 'Daily', repeatWeekly: 'Weekly', repeatMonthly: 'Monthly',
    fontSize: 'Font size', fontSmall: 'Small', fontNormal: 'Normal', fontLarge: 'Large', fontXLarge: 'Extra large', textColor: 'Text color',
    mdTable: 'Table', mdCodeBlock: 'Code block', mdLink: 'Link', mdChecklist: 'Checklist', mdHr: 'Horizontal rule',
    tabCalendar: '📅 Calendar',
    calMonth: 'Month', calWeek: 'Week', calToday: 'Today', calPrev: '‹', calNext: '›', calNoTodos: 'No todos', calMore: '{n} more',
    calMon: 'Mon', calTue: 'Tue', calWed: 'Wed', calThu: 'Thu', calFri: 'Fri', calSat: 'Sat', calSun: 'Sun',
    stats: '📊 Statistics', statsThisWeek: 'This week', statsThisMonth: 'This month', statsAllTime: 'All time',
    statsCompleted: 'Completed', statsTotal: 'Total', statsNotes: 'Notes', statsTodos: 'Todos', statsNoData: 'No data',
    cmdPlaceholder: 'Type a command or search...', cmdNewNote: 'New note', cmdNewTodo: 'New todo', cmdToggleTheme: 'Toggle theme', cmdExportData: 'Export data', cmdOpenSettings: 'Open settings', cmdToggleCalendar: 'Calendar', cmdArchiveNotes: 'Archive notes',
    archive: 'Archive', archivedNotes: 'Archived notes', archivedTodos: 'Archived todos', restore: 'Restore', archiveNote: 'Archive note', archiveTodo: 'Archive todo',
    pomodoroStart: 'Start', pomodoroPause: 'Pause', pomodoroReset: 'Reset', pomodoroComplete: 'Pomodoro complete!',
      duplicateNote: 'Duplicate note', duplicateSuffix: 'Copy',
    multiSelect: 'Multi-select', selectAll: 'Select all', batchDelete: 'Batch delete', batchArchive: 'Batch archive', batchColor: 'Change color', selectedCount: '{n} selected', exitMultiSelect: 'Exit multi-select',
    wikiLink: 'Wiki link', createLinkedNote: 'Create linked note', backlinks: 'Backlinks', noBacklinks: 'No backlinks',
    tabBoard: '📋 Board', tabTimeline: '📈 Timeline', boardEmpty: 'Board is empty',
    slashHeading1: 'Heading 1', slashHeading2: 'Heading 2', slashHeading3: 'Heading 3', slashList: 'List', slashTodo: 'Todo list', slashCode: 'Code block', slashQuote: 'Quote', slashHr: 'Divider', slashTable: 'Table', slashLink: 'Link', slashImage: 'Image', slashDate: 'Date', slashTime: 'Time',
    template: 'Template', tplMeeting: 'Meeting notes', tplReading: 'Reading notes', tplShopping: 'Shopping list', tplWeekly: 'Weekly plan', tplGoals: 'Goal tracker',
    smartDate: 'Smart date', smartDateFound: 'Date found: ', smartDateNotFound: 'No date found',
    voiceInput: 'Voice input', voiceNotSupported: 'Voice recognition not supported',
    encryptNote: 'Encrypt note', decryptNote: 'Decrypt note', enterPassword: 'Enter password', encrypted: 'Encrypted', wrongPassword: 'Wrong password',
    versionHistory: 'Version history', restoreVersion: 'Restore version', noVersions: 'No versions', versionCount: 'Versions',
    focusMode: 'Focus mode', exitFocus: 'Exit focus',
    shareImage: 'Share as image', imageSaved: 'Image saved',
    timelineEmpty: 'No activity', tlNoteCreated: 'Note created', tlNoteUpdated: 'Note updated', tlTodoCreated: 'Todo created', tlTodoCompleted: 'Todo completed',
    importData: 'Import data', importSelect: 'Select file', importResult: 'Import complete', importError: 'Import failed',
    toggleTodo: 'Toggle complete', undoDeleteFailed: 'Item permanently deleted, cannot be restored',
    colorScheme: 'Color scheme', schemeDefault: 'Classic Light', schemeWindows: 'Windows Sticky Notes', schemeMorandi: 'Morandi Soft',

  },
  vi: {
    tabNotes: 'Ghi chú', tabTodos: 'Việc cần làm', tabAll: 'Tất cả',
    trash: 'Thùng rác', trashEmpty: 'Thùng rác trống', restoreFromTrash: 'Khôi phục từ thùng rác', deletePermanently: 'Xóa vĩnh viễn', confirmPermanentDelete: 'Xóa vĩnh viễn? Không thể hoàn tác.', undoDelete: 'Đã xóa, nhấn Ctrl+Z để khôi phục', autoPurgeHint: 'Thùng rác tự động dọn sau 30 ngày',
    notes: 'Ghi chú', todos: 'Việc cần làm',
    noNotes: 'Chưa có ghi chú', noNotesHint: 'Nhấn + ở góc trên bên phải để tạo ghi chú đầu tiên',
    noTodos: 'Chưa có việc cần làm', noTodosHint: 'Nhấn + ở góc trên bên phải để thêm việc mới', noTodosCompleted: 'Không có việc đã hoàn thành',
    loading: 'Đang tải...',
    addNote: 'Ghi chú mới', addTodo: 'Việc mới', save: 'Lưu', cancel: 'Hủy', edit: 'Sửa', delete: 'Xóa', close: 'Đóng', minimize: 'Thu nhỏ', export: 'Xuất dữ liệu', copyNote: 'Sao chép ghi chú', addInlineTodo: 'Thêm việc', expand: 'Mở rộng', collapse: 'Thu gọn',
    addInSidebar: 'Tạo trong thanh bên', addInWindow: 'Mở cửa sổ riêng',
    titlePlaceholder: 'Tiêu đề', contentPlaceholder: 'Viết suy nghĩ của bạn...', todoTitlePlaceholder: 'Công việc...',
    todoList: 'Danh sách việc', color: 'Màu sắc', floatingWindow: 'Cửa sổ nổi', priority: 'Mức độ', dueDate: 'Hạn chót', category: 'Danh mục', categoryPlaceholder: 'Công việc, Cuộc sống, Học tập...', linkNote: 'Liên kết ghi chú',
    bold: 'Đậm (Ctrl+B)', italic: 'Nghiêng (Ctrl+I)', underline: 'Gạch chân (Ctrl+U)', strikethrough: 'Gạch ngang (Ctrl+T)', list: 'Danh sách (Ctrl+Shift+L)', insertImage: 'Chèn ảnh', shrinkImage: 'Thu nhỏ ảnh', resetImageSize: 'Đặt lại kích thước', enlargeImage: 'Phóng to ảnh',
    priorityAll: 'Tất cả mức độ', priorityHigh: '🔴 Cao', priorityMedium: '🟡 Trung bình', priorityLow: '🟢 Thấp',
    confirmDeleteNote: 'Xóa ghi chú này?', confirmDeleteTodo: 'Xóa việc này?', promptTodoTitle: 'Công việc:',
    pinIndicator: '📌 Cửa sổ nổi', setFloating: 'Đặt làm cửa sổ nổi', unsetFloating: 'Bỏ cửa sổ nổi', pinned: 'Đã ghim', unpinned: 'Chưa ghim',
    popOutNote: 'Mở trong cửa sổ riêng', toggleFloatingOnTop: 'Bật/tắt ghim trên cùng',
    toggleDark: 'Chuyển sang chế độ tối', toggleLight: 'Chuyển sang chế độ sáng', opacity: 'Độ trong suốt', pinOnTop: 'Ghim trên cùng', unpinFromTop: 'Bỏ ghim trên cùng',
    colorYellow: 'Vàng', colorGreen: 'Xanh lá', colorBlue: 'Xanh dương', colorPink: 'Hồng', colorGray: 'Xám', colorPurple: 'Tím', colorCharcoal: 'Than',
    settings: 'Cài đặt', language: 'Ngôn ngữ', shortcut: 'Phím tắt', grouping: 'Nhóm', groupByDate: 'Nhóm theo ngày', groupByAlpha: 'Nhóm A-Z', groupByNone: 'Không nhóm', recordShortcut: 'Ghi phím tắt', pressKeys: 'Nhấn tổ hợp phím...', tabVisibility: 'Hiển thị tab',
    exportSuccess: 'Dữ liệu đã xuất: ', exportFail: 'Xuất thất bại: ',
    groupToday: 'Hôm nay', groupThisWeek: 'Tuần này', groupEarlier: 'Trước đó', groupAZ: 'A-Z', tomorrow: 'Ngày mai',
    noteTitle: 'Ghi chú',
    filterAll: 'Tất cả', filterActive: 'Chưa xong', filterCompleted: 'Đã xong',
    searchPlaceholder: 'Tìm kiếm...', searchNoResults: 'Không tìm thấy kết quả', clearSearch: 'Xóa tìm kiếm',
    reminderSoon: 'Sắp đến hạn', reminderDismiss: 'Đã biết', reminderDueOn: 'Hạn chót',
    backup: 'Sao lưu', backupNow: 'Sao lưu ngay', backupList: 'Danh sách sao lưu', backupRestore: 'Khôi phục', backupDelete: 'Xóa sao lưu',
    backupConfirmRestore: 'Khôi phục sẽ khởi động lại ứng dụng. Tiếp tục?', backupConfirmDelete: 'Xóa sao lưu này?',
    backupAuto: 'Tự động sao lưu (mỗi 4 giờ)', backupSize: 'Kích thước', backupDate: 'Ngày',
    dragToReorder: 'Kéo để sắp xếp',
    tags: 'Thẻ', addTag: 'Thêm thẻ', allTags: 'Tất cả thẻ', tagPlaceholder: 'Nhập thẻ...', noTags: 'Không có thẻ',
    subtasks: 'Công việc con', addSubtask: 'Thêm việc con', subtaskProgress: 'Hoàn thành {done}/{total}', noSubtasks: 'Không có việc con', subtaskPlaceholder: 'Tiêu đề việc con...',
    repeat: 'Lặp lại', repeatNone: 'Không lặp', repeatDaily: 'Mỗi ngày', repeatWeekly: 'Mỗi tuần', repeatMonthly: 'Mỗi tháng',
    fontSize: 'Cỡ chữ', fontSmall: 'Nhỏ', fontNormal: 'Thường', fontLarge: 'Lớn', fontXLarge: 'Rất lớn', textColor: 'Màu chữ',
    mdTable: 'Bảng', mdCodeBlock: 'Khối mã', mdLink: 'Liên kết', mdChecklist: 'Danh sách kiểm tra', mdHr: 'Đường kẻ ngang',
    tabCalendar: '📅 Lịch',
    calMonth: 'Tháng', calWeek: 'Tuần', calToday: 'Hôm nay', calPrev: '‹', calNext: '›', calNoTodos: 'Không có việc', calMore: 'Còn {n} việc',
    calMon: 'T2', calTue: 'T3', calWed: 'T4', calThu: 'T5', calFri: 'T6', calSat: 'T7', calSun: 'CN',
    stats: '📊 Thống kê', statsThisWeek: 'Tuần này', statsThisMonth: 'Tháng này', statsAllTime: 'Tổng',
    statsCompleted: 'Đã hoàn thành', statsTotal: 'Tổng số', statsNotes: 'Ghi chú', statsTodos: 'Việc cần làm', statsNoData: 'Không có dữ liệu',
    cmdPlaceholder: 'Nhập lệnh hoặc tìm kiếm...', cmdNewNote: 'Ghi chú mới', cmdNewTodo: 'Việc mới',       cmdToggleTheme: 'Đổi giao diện', cmdExportData: 'Xuất dữ liệu', cmdOpenSettings: 'Mở cài đặt', cmdToggleCalendar: 'Lịch', cmdArchiveNotes: 'Lưu trữ ghi chú',
    archive: 'Lưu trữ', archivedNotes: 'Ghi chú đã lưu trữ', archivedTodos: 'Việc đã lưu trữ', restore: 'Khôi phục', archiveNote: 'Lưu trữ ghi chú', archiveTodo: 'Lưu trữ việc',
    pomodoroStart: 'Bắt đầu', pomodoroPause: 'Tạm dừng', pomodoroReset: 'Đặt lại', pomodoroComplete: 'Pomodoro hoàn thành!',
      duplicateNote: 'Sao chép ghi chú', duplicateSuffix: 'Bản sao',
    multiSelect: 'Chọn nhiều', selectAll: 'Chọn tất cả', batchDelete: 'Xóa hàng loạt', batchArchive: 'Lưu trữ hàng loạt', batchColor: 'Đổi màu', selectedCount: 'Đã chọn {n}', exitMultiSelect: 'Thoát chọn nhiều',
    wikiLink: 'Liên kết wiki', createLinkedNote: 'Tạo ghi chú liên kết', backlinks: 'Liên kết ngược', noBacklinks: 'Không có liên kết ngược',
    tabBoard: '📋 Bảng', tabTimeline: '📈 Dòng thời gian', boardEmpty: 'Bảng trống',
    slashHeading1: 'Tiêu đề 1', slashHeading2: 'Tiêu đề 2', slashHeading3: 'Tiêu đề 3', slashList: 'Danh sách', slashTodo: 'Danh sách việc', slashCode: 'Khối mã', slashQuote: 'Trích dẫn', slashHr: 'Đường kẻ', slashTable: 'Bảng', slashLink: 'Liên kết', slashImage: 'Hình ảnh', slashDate: 'Ngày', slashTime: 'Giờ',
    template: 'Mẫu', tplMeeting: 'Ghi chú cuộc họp', tplReading: 'Ghi chú đọc sách', tplShopping: 'Danh sách mua sắm', tplWeekly: 'Kế hoạch tuần', tplGoals: 'Theo dõi mục tiêu',
    smartDate: 'Ngày thông minh', smartDateFound: 'Tìm thấy ngày: ', smartDateNotFound: 'Không tìm thấy ngày',
    voiceInput: 'Nhập giọng nói', voiceNotSupported: 'Không hỗ trợ nhận diện giọng nói',
    encryptNote: 'Mã hóa ghi chú', decryptNote: 'Giải mã ghi chú', enterPassword: 'Nhập mật khẩu', encrypted: 'Đã mã hóa', wrongPassword: 'Sai mật khẩu',
    versionHistory: 'Lịch sử phiên bản', restoreVersion: 'Khôi phục phiên bản', noVersions: 'Không có phiên bản', versionCount: 'Phiên bản',
    focusMode: 'Chế độ tập trung', exitFocus: 'Thoát tập trung',
    shareImage: 'Chia sẻ dạng ảnh', imageSaved: 'Đã lưu ảnh',
    timelineEmpty: 'Không có hoạt động', tlNoteCreated: 'Ghi chú đã tạo', tlNoteUpdated: 'Ghi chú đã cập nhật', tlTodoCreated: 'Việc đã tạo', tlTodoCompleted: 'Việc đã hoàn thành',
    importData: 'Nhập dữ liệu', importSelect: 'Chọn tệp', importResult: 'Nhập hoàn thành', importError: 'Nhập thất bại',
    toggleTodo: 'Chuyển hoàn thành', undoDeleteFailed: 'Mục đã xóa vĩnh viễn, không thể khôi phục',
    colorScheme: 'Bảng màu', schemeDefault: 'Kinh điển sáng', schemeWindows: 'Windows Sticky Notes', schemeMorandi: 'Morandi dịu',

  }
};

const locale = ref('zh');
const t = (key) => I18N[locale.value]?.[key] ?? I18N.zh[key] ?? key;

// Sidebar widths (must match main.js constants)
const SIDEBAR_EXPANDED_WIDTH = 320;
const SIDEBAR_COLLAPSED_WIDTH = 16;

// ============================================
// Shared utilities
// ============================================

/**
 * Compress an image File to a JPEG data URL.
 * - Max width 800px, JPEG quality 0.85
 * - Returns null on any error (corrupt file, CORS, etc.) — never hangs
 * Shared by NoteEditor.compressImage and App.insertImageFileToFloating.
 */
function compressImageFile(file, maxWidth = 800, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const CalendarView = {
  template: `
    <div class="calendar-view">
      <div class="calendar-header">
        <button class="cal-nav-btn" @click="prev">{{ t('calPrev') }}</button>
        <span class="cal-current-label">{{ monthLabel }}</span>
        <button class="cal-nav-btn" @click="next">{{ t('calNext') }}</button>
        <button class="cal-today-btn" @click="goToday">{{ t('calToday') }}</button>
        <div class="cal-view-toggle">
          <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">{{ t('calMonth') }}</button>
          <button :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">{{ t('calWeek') }}</button>
        </div>
      </div>
      <div class="calendar-weekdays">
        <div v-for="d in weekdays" :key="d" class="cal-weekday">{{ d }}</div>
      </div>
      <div class="calendar-grid" :class="{ 'week-mode': viewMode === 'week' }">
        <div
          v-for="(cell, idx) in gridCells"
          :key="idx"
          class="calendar-cell"
          :class="{ today: cell.isToday, 'other-month': cell.otherMonth }"
          @click="onCellClick(cell)"
        >
          <div class="cal-cell-date">{{ cell.day }}</div>
          <div class="cal-cell-todos">
            <div
              v-for="todo in cell.todos.slice(0, 3)"
              :key="todo.id"
              class="cal-todo-item"
              :class="'priority-' + todo.priority"
              @click.stop="$emit('edit-todo', todo)"
            >{{ todo.title }}</div>
            <div v-if="cell.todos.length > 3" class="cal-todo-more">
              {{ t('calMore').replace('{n}', cell.todos.length - 3) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    todos: { type: Array, default: () => [] },
  },
  emits: ['edit-todo'],
  setup(props, { emit }) {
    const currentDate = ref(new Date());
    const viewMode = ref('month');
    const weekdays = computed(() => [
      t('calMon'), t('calTue'), t('calWed'), t('calThu'), t('calFri'), t('calSat'), t('calSun')
    ]);
    const monthLabel = computed(() => {
      const y = currentDate.value.getFullYear();
      const m = currentDate.value.getMonth() + 1;
      return y + ' / ' + m;
    });
    const todosByDate = computed(() => {
      const map = {};
      for (const todo of props.todos) {
        if (todo.due_date) {
          const key = todo.due_date.slice(0, 10);
          if (!map[key]) map[key] = [];
          map[key].push(todo);
        }
      }
      return map;
    });
    const gridCells = computed(() => {
      const cells = [];
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      if (viewMode.value === 'month') {
        const firstDay = new Date(year, month, 1);
        const startDow = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        for (let i = 0; i < 42; i++) {
          let day, dateStr, otherMonth = false;
          if (i < startDow) {
            day = prevMonthDays - startDow + i + 1;
            const pm = month === 0 ? 11 : month - 1;
            const py = month === 0 ? year - 1 : year;
            dateStr = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            otherMonth = true;
          } else if (i - startDow >= daysInMonth) {
            day = i - startDow - daysInMonth + 1;
            const nm = month === 11 ? 0 : month + 1;
            const ny = month === 11 ? year + 1 : year;
            dateStr = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            otherMonth = true;
          } else {
            day = i - startDow + 1;
            dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          }
          cells.push({
            day,
            dateStr,
            otherMonth,
            isToday: dateStr === todayStr,
            todos: todosByDate.value[dateStr] || []
          });
        }
      } else {
        const dow = (currentDate.value.getDay() + 6) % 7;
        const weekStart = new Date(currentDate.value);
        weekStart.setDate(weekStart.getDate() - dow);
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          cells.push({
            day: d.getDate(),
            dateStr,
            otherMonth: false,
            isToday: dateStr === todayStr,
            todos: todosByDate.value[dateStr] || []
          });
        }
      }
      return cells;
    });
    const prev = () => {
      const d = new Date(currentDate.value);
      if (viewMode.value === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      currentDate.value = d;
    };
    const next = () => {
      const d = new Date(currentDate.value);
      if (viewMode.value === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      currentDate.value = d;
    };
    const goToday = () => { currentDate.value = new Date(); };
    const onCellClick = (cell) => {};
    return { viewMode, weekdays, monthLabel, gridCells, prev, next, goToday, onCellClick, t };
  }
};

// ============================================
// FilterBar Component
// ============================================
const FilterBar = {
  template: `
    <div class="filter-bar">
      <div class="filter-group">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-btn"
          :class="{ active: currentFilter === filter.value }"
          @click="$emit('filter-change', filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div style="flex: 1;"></div>
      
      <select 
        :value="priorityFilter" 
        @change="$emit('priority-change', $event.target.value)"
        class="priority-filter-select"
      >
        <option value="all">{{ t('priorityAll') }}</option>
        <option value="high">{{ t('priorityHigh') }}</option>
        <option value="medium">{{ t('priorityMedium') }}</option>
        <option value="low">{{ t('priorityLow') }}</option>
      </select>

      <select
        :value="tagFilter"
        @change="$emit('tag-change', $event.target.value)"
        class="priority-filter-select tag-filter-select"
      >
        <option value="">{{ t('allTags') }}</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
    </div>
  `,
  
  props: {
    currentFilter: { type: String, default: 'all' },
    priorityFilter: { type: String, default: 'all' },
    tagFilter: { type: String, default: '' },
    allTags: { type: Array, default: () => [] }
  },
  
  emits: ['filter-change', 'priority-change', 'tag-change'],
  
  setup() {
    const filters = computed(() => [
      { value: 'all', label: t('filterAll') },
      { value: 'active', label: t('filterActive') },
      { value: 'completed', label: t('filterCompleted') }
    ]);
    
    return { filters, t, locale };
  }
};

// ============================================
// TodoList Component
// ============================================
const TodoList = {
  template: `
    <div class="todo-list">
      <div v-if="filteredTodos.length === 0 && searchQuery" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">{{ t('searchNoResults') }}</div>
      </div>
      <div v-else-if="filteredTodos.length === 0" class="empty-state">
        <div class="empty-icon">✓</div>
        <div class="empty-text">
          {{ currentFilter === 'completed' ? t('noTodosCompleted') : t('noTodos') }}
        </div>
        <div class="empty-hint">{{ t('noTodosHint') }}</div>
      </div>
      
      <template v-for="group in groupedTodos" :key="group.group">
        <div v-if="group.group" class="group-header">{{ group.group }}</div>
        <template v-for="todo in group.items" :key="todo.id">
        <div 
          class="todo-item"
          :class="[
            { completed: todo.completed, dragging: draggedTodoId === todo.id, 'drag-over': dragOverTodoId === todo.id },
            todo.color ? ['color-' + getColorName(todo.color)] : []
          ]"
          draggable="true"
          @dragstart="onDragStart($event, todo)"
          @dragover.prevent="onDragOver($event, todo)"
          @drop="onDrop($event, todo, group)"
          @dragend="onDragEnd"
          @contextmenu.prevent="$emit('context-menu', $event, todo)"
        >
          <input v-if="multiSelectMode" type="checkbox" class="batch-checkbox" :checked="selectedIds.has(todo.id)" @click.stop="$emit('toggle-select', todo.id)" />
          <div 
            class="todo-checkbox"
            :class="{ checked: todo.completed }"
            @click="toggleTodo(todo)"
          ></div>
          
          <div class="todo-content" @click="editTodo(todo)">
            <div class="todo-title" v-html="highlightText(todo.title)"></div>
            <div class="todo-meta">
              <span v-if="todo.category" class="todo-category" v-html="highlightText(todo.category)"></span>
              <span v-if="todo.due_date" class="todo-due" :class="{ overdue: isOverdue(todo.due_date) }">
                📅 {{ formatDate(todo.due_date) }}
              </span>
              <span v-if="todo.repeat_type && todo.repeat_type !== 'none'" class="todo-repeat">🔁</span>
              <span v-if="subtaskProgress(todo)" class="todo-subtask-progress">{{ subtaskProgress(todo) }}</span>
              <span v-if="todo.tags" class="todo-tags-inline">
                <span v-for="tag in splitTags(todo.tags)" :key="tag" class="tag-chip-mini">{{ tag }}</span>
              </span>
            </div>
          </div>
          
          <div class="todo-priority priority-badge" :class="todo.priority">
            {{ getPriorityLabel(todo.priority) }}
          </div>
          
          <div class="todo-actions">
            <button v-if="!showArchived"
              class="todo-action-btn"
              @click.stop="popOutTodo(todo)"
              :title="t('popOutNote')"
            >📌</button>
            <button v-if="showArchived"
              class="todo-action-btn"
              @click.stop="$emit('restore', todo)"
              :title="t('restore')"
            >↩</button>
            <button v-if="!showArchived"
              class="todo-action-btn"
              @click.stop="$emit('archive', todo)"
              :title="t('archive')"
            >📦</button>
            <button 
              class="todo-action-btn"
              @click="editTodo(todo)"
              :title="t('edit')"
            >
              ✎
            </button>
            <button 
              class="todo-action-btn delete"
              @click="deleteTodo(todo)"
              :title="t('delete')"
            >
              ✕
            </button>
          </div>
        </div>

        <div v-if="getSubtasksFor(todo).length > 0" class="subtask-list">
          <div
            v-for="sub in getSubtasksFor(todo)"
            :key="sub.id"
            class="subtask-item"
            :class="{ completed: sub.completed }"
          >
            <div class="todo-checkbox subtask-checkbox" :class="{ checked: sub.completed }" @click="toggleTodo(sub)"></div>
            <span class="subtask-title" :class="{ 'line-through': sub.completed }">{{ sub.title }}</span>
          </div>
        </div>
        </template>
      </template>
    </div>
  `,
  
  props: {
    todos: { type: Array, default: () => [] },
    currentFilter: { type: String, default: 'all' },
    priorityFilter: { type: String, default: 'all' },
    grouping: { type: String, default: 'none' },
    searchQuery: { type: String, default: '' },
    tagFilter: { type: String, default: '' },
    showArchived: { type: Boolean, default: false },
    multiSelectMode: { type: Boolean, default: false },
    selectedIds: { type: Object, default: () => new Set() }
  },
  
  emits: ['edit', 'refresh', 'archive', 'restore', 'toggle-select', 'deleted', 'context-menu'],
  
  setup(props, { emit }) {
    const draggedTodoId = ref(null);
    const dragOverTodoId = ref(null);
    const subtaskMap = ref({});

    // OPT-01: build subtask map locally from props.todos (already includes all todos)
    // instead of N+1 IPC calls per todo
    const loadSubtasks = () => {
      const map = {};
      for (const todo of props.todos) {
        if (todo.parent_id) {
          if (!map[todo.parent_id]) map[todo.parent_id] = [];
          map[todo.parent_id].push(todo);
        }
      }
      subtaskMap.value = map;
    };

    watch(() => props.todos, () => { loadSubtasks(); }, { immediate: true });

    const getSubtasksFor = (todo) => {
      return subtaskMap.value[todo.id] || [];
    };

    const subtaskProgress = (todo) => {
      const subs = getSubtasksFor(todo);
      if (!subs.length) return '';
      const done = subs.filter((s) => s.completed).length;
      return t('subtaskProgress').replace('{done}', done).replace('{total}', subs.length);
    };

    const splitTags = (tagsStr) => {
      if (!tagsStr) return [];
      return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    };

    const onDragStart = (e, todo) => {
      draggedTodoId.value = todo.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(todo.id));
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.start({ type: 'todo', id: todo.id });
      }
    };

    const onDragOver = (e, todo) => {
      e.preventDefault();
      dragOverTodoId.value = todo.id;
    };

    const onDrop = async (e, targetTodo, group) => {
      e.preventDefault();
      dragOverTodoId.value = null;
      const fromId = draggedTodoId.value;
      if (!fromId || fromId === targetTodo.id) { draggedTodoId.value = null; return; }

      let items = group ? group.items : props.todos;
      const fromIdx = items.findIndex((t) => t.id === fromId);
      const toIdx = items.findIndex((t) => t.id === targetTodo.id);
      if (fromIdx < 0 || toIdx < 0) { draggedTodoId.value = null; return; }

      const reordered = [...items];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // BUG-03: use global max order_index as base offset to avoid
      // group-local 0-based indices conflicting with other groups
      const allMaxOrder = props.todos.reduce((mx, t) => Math.max(mx, t.order_index || 0), 0);
      const baseOffset = allMaxOrder + 1;
      for (let i = 0; i < reordered.length; i++) {
        const newOrder = baseOffset + i;
        if (reordered[i].order_index !== newOrder) {
          try {
            await window.electronAPI.todos.update(reordered[i].id, { order_index: newOrder });
          } catch (_) {}
        }
      }
      draggedTodoId.value = null;
      emit('refresh');
    };

    const onDragEnd = () => {
      draggedTodoId.value = null;
      dragOverTodoId.value = null;
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.stop();
      }
    };

    const highlightText = (text) => {
      if (!text || !props.searchQuery) return text || '';
      // O9: HTML-escape text first to prevent XSS via v-html, then highlight.
      const escText = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const escaped = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return escText.replace(regex, '<mark class="search-match">$1</mark>');
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hm = date.getHours() != null && date.getMinutes() != null
        ? ` ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
        : '';
      
      if (date.toDateString() === today.toDateString()) {
        return t('groupToday') + hm;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return t('tomorrow') + hm;
      }
      
      return `${date.getMonth() + 1}/${date.getDate()}${hm}`;
    };
    
    const isOverdue = (dateStr) => {
      if (!dateStr) return false;
      const due = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    };
    
    const filteredTodos = computed(() => {
      let result = [...props.todos].filter((t) => !t.parent_id && !t.is_subtask);
      result = result.filter((t) => props.showArchived ? t.is_archived === 1 : t.is_archived !== 1);
      
      if (props.currentFilter === 'active') {
        result = result.filter(t => !t.completed);
      } else if (props.currentFilter === 'completed') {
        result = result.filter(t => t.completed);
      }
      
      if (props.priorityFilter !== 'all') {
        result = result.filter(t => t.priority === props.priorityFilter);
      }

      if (props.tagFilter) {
        result = result.filter((t) => {
          const tags = (t.tags || '').split(',').map((x) => x.trim()).filter(Boolean);
          return tags.includes(props.tagFilter);
        });
      }

      if (props.searchQuery) {
        const q = props.searchQuery.toLowerCase();
        result = result.filter((todo) => {
          const titleMatch = (todo.title || '').toLowerCase().includes(q);
          const catMatch = (todo.category || '').toLowerCase().includes(q);
          return titleMatch || catMatch;
        });
      }
      
      result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        // Order by order_index (drag-reorderable) first when both present
        if (a.order_index != null && b.order_index != null && a.order_index !== b.order_index) {
          return a.order_index - b.order_index;
        }
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        if (a.due_date && b.due_date) {
          return new Date(a.due_date) - new Date(b.due_date);
        }

        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return result;
    });

    const getISOWeekNumber = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      return Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
    };

    const groupedTodos = computed(() => {
      const items = filteredTodos.value;
      if (props.grouping === 'none' || !props.grouping) {
        return [{ group: '', items }];
      }
      if (props.grouping === 'date') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayWeek = getISOWeekNumber(today);
        const todayYear = today.getFullYear();
        const groups = { today: [], thisWeek: [], earlier: [] };
        for (const todo of items) {
          const d = new Date(todo.created_at);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() === today.getTime()) {
            groups.today.push(todo);
          } else if (d.getFullYear() === todayYear && getISOWeekNumber(d) === todayWeek) {
            groups.thisWeek.push(todo);
          } else {
            groups.earlier.push(todo);
          }
        }
        const result = [];
        if (groups.today.length) result.push({ group: t('groupToday'), items: groups.today });
        if (groups.thisWeek.length) result.push({ group: t('groupThisWeek'), items: groups.thisWeek });
        if (groups.earlier.length) result.push({ group: t('groupEarlier'), items: groups.earlier });
        return result;
      }
      if (props.grouping === 'alpha') {
        const map = {};
        for (const todo of items) {
          const ch = (todo.title || '#')[0].toUpperCase();
          const letter = /[A-Z]/.test(ch) ? ch : '#';
          if (!map[letter]) map[letter] = [];
          map[letter].push(todo);
        }
        const result = [];
        const keys = Object.keys(map).sort();
        for (const k of keys) {
          result.push({ group: k === '#' ? t('groupAZ') : k, items: map[k] });
        }
        return result.length ? result : [{ group: '', items }];
      }
      return [{ group: '', items }];
    });
    
    const getPriorityLabel = (priority) => {
      const map = { high: t('priorityHigh'), medium: t('priorityMedium'), low: t('priorityLow') };
      return map[priority] || priority;
    };
    
    const toggleTodo = async (todo) => {
      try {
        const updateData = { completed: !todo.completed };
        if (!todo.completed && todo.repeat_type) {
          updateData.last_completed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        await window.electronAPI.todos.update(todo.id, updateData);
        emit('refresh');
      } catch (error) {
        console.error('Failed to toggle todo:', error);
      }
    };
    
    const editTodo = (todo) => {
      emit('edit', todo);
    };
    
    const deleteTodo = async (todo) => {
      if (!confirm(t('confirmDeleteTodo'))) return;
      try {
        // Soft delete: set deleted_at (moves to trash, auto-purged after 30 days).
        await window.electronAPI.todos.delete(todo.id);
        emit('refresh');
        emit('deleted', { type: 'todo', id: todo.id, title: todo.title });
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    };

    // Open the todo in an independent desktop window (Windows Sticky Notes style).
    const popOutTodo = async (todo) => {
      try {
        await window.electronAPI.floatingTodo.create(todo.id, { alwaysOnTop: false });
      } catch (error) {
        console.error('Failed to pop out todo:', error);
      }
    };
    
    return {
      filteredTodos,
      groupedTodos,
      getPriorityLabel,
      formatDate,
      isOverdue,
      toggleTodo,
      editTodo,
      deleteTodo,
      popOutTodo,
      highlightText,
      draggedTodoId,
      dragOverTodoId,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      getSubtasksFor,
      subtaskProgress,
      splitTags,
      getColorName,
      t
    };
  }
};

// ============================================
// NoteEditor Component
// ============================================
const NoteEditor = {
  template: `
    <div class="editor-container">
      <div class="content-scroll">
        <input 
          v-model="title" 
          class="editor-title" 
          :placeholder="t('titlePlaceholder')"
          ref="titleInput"
        />
        <div class="editor-toolbar">
          <button class="toolbar-btn" @click="execFormat('bold')" :title="t('bold')"><b>B</b></button>
          <button class="toolbar-btn" @click="execFormat('italic')" :title="t('italic')"><i>I</i></button>
          <button class="toolbar-btn" @click="execFormat('underline')" :title="t('underline')"><u>U</u></button>
          <button class="toolbar-btn" @click="execFormat('strikeThrough')" :title="t('strikethrough')"><s>S</s></button>
          <button class="toolbar-btn" @click="execFormat('insertUnorderedList')" :title="t('list')">•━</button>
          <button class="toolbar-btn" @click="pickImage" :title="t('insertImage')"><span class="icon-image"></span></button>
          <span class="toolbar-divider" v-if="selectedImg"></span>
          <button class="toolbar-btn" v-if="selectedImg" @click="resizeSelectedImage(-20)" :title="t('shrinkImage')">◀</button>
          <button class="toolbar-btn" v-if="selectedImg" @click="resetSelectedImageSize" :title="t('resetImageSize')">⤢</button>
          <button class="toolbar-btn" v-if="selectedImg" @click="resizeSelectedImage(20)" :title="t('enlargeImage')">▶</button>
          <span class="toolbar-divider"></span>
          <button class="toolbar-btn" :class="{ 'voice-recording': isRecording }" @click="toggleVoiceInput" :title="t('voiceInput')">🎤</button>
          <button class="toolbar-btn" @click="toggleFocusMode" :title="t('focusMode')">🎯</button>
          <span class="toolbar-divider"></span>
          <select class="font-size-select" @change="onFontSizeChange" :value="currentFontSize" :title="t('fontSize')">
            <option value="1">{{ t('fontSmall') }}</option>
            <option value="3">{{ t('fontNormal') }}</option>
            <option value="5">{{ t('fontLarge') }}</option>
            <option value="7">{{ t('fontXLarge') }}</option>
          </select>
          <span class="toolbar-divider"></span>
          <div class="color-palette-wrapper">
            <button class="toolbar-btn" @click="showColorPalette = !showColorPalette" :title="t('textColor')">🎨</button>
            <div v-if="showColorPalette" class="color-palette">
              <div v-for="c in textColors" :key="c" class="color-palette-swatch" :style="{ backgroundColor: c }" @click="applyTextColor(c)"></div>
            </div>
          </div>
          <input type="file" ref="imageInput" accept="image/*" style="display:none" @change="onImageFileSelected" />
        </div>
        <div class="editor-content" contenteditable="true" ref="editorContent" @input="onContentInput" @keydown="onContentKeydown" @paste="onContentPaste" @drop="onContentDrop" @dragover.prevent @click="onContentClick" :data-placeholder="t('contentPlaceholder')"></div>

        <!-- Slash Menu -->
        <div v-if="showSlashMenu" class="slash-menu" :style="{ top: slashMenuPos.y + 'px', left: slashMenuPos.x + 'px' }">
          <div v-for="(cmd, idx) in filteredSlashCommands" :key="cmd.key"
            class="slash-menu-item" :class="{ selected: slashSelectedIdx === idx }"
            @click="executeSlashCommand(cmd)"
            @mouseenter="slashSelectedIdx = idx"
          >
            <span class="slash-menu-icon">{{ cmd.icon }}</span>
            <span class="slash-menu-label">{{ cmd.label }}</span>
          </div>
        </div>

        <!-- Inline Todos (only shown when editing an existing note) -->
        <div v-if="note && note.id" class="inline-todos-section">
          <div class="inline-todos-header">
            <label class="option-label">{{ t('todoList') }}</label>
            <button class="inline-todo-add" @click="addInlineTodo" :title="t('addInlineTodo')">+</button>
          </div>
          <div v-if="inlineTodos.length === 0" class="inline-todos-empty">
            {{ t('noTodosHint') }}
          </div>
          <div 
            v-for="todo in inlineTodos" 
            :key="todo.id"
            class="inline-todo-item"
            :class="{ completed: todo.completed }"
          >
            <div 
              class="todo-checkbox"
              :class="{ checked: todo.completed }"
              @click="toggleInlineTodo(todo)"
            ></div>
            <span class="inline-todo-title" :class="{ 'line-through': todo.completed }">{{ todo.title }}</span>
            <button class="inline-todo-delete" @click="deleteInlineTodo(todo)" :title="t('delete')">✕</button>
          </div>
        </div>

        <div class="tags-section">
          <label class="option-label">📌 {{ t('tags') }}</label>
          <div class="tags-chips">
            <span v-for="(tag, idx) in tagsArray" :key="idx" class="tag-chip">
              {{ tag }}
              <button class="tag-chip-remove" @click="removeTag(idx)">×</button>
            </span>
            <div v-if="showTagInput" class="tag-input-wrapper">
              <input
                class="tag-input"
                v-model="newTagValue"
                :placeholder="t('tagPlaceholder')"
                @keydown.enter="addTag"
                @blur="addTag"
                ref="tagInputRef"
              />
            </div>
            <button v-else class="tag-add-btn" @click="startAddTag">+ {{ t('addTag') }}</button>
          </div>
          <div v-if="tagsArray.length === 0 && !showTagInput" class="tags-empty">{{ t('noTags') }}</div>
        </div>

        <!-- Backlinks Section -->
        <div v-if="note && note.id" class="backlinks-section">
          <div class="backlinks-header">{{ t('backlinks') }}</div>
          <div v-if="backlinks.length === 0" class="backlinks-empty">{{ t('noBacklinks') }}</div>
          <div v-for="bl in backlinks" :key="bl.id" class="backlink-item" @click="$emit('edit', bl)">{{ bl.title || t('noteTitle') }}</div>
        </div>

        <div class="editor-options">
          <div class="option-section">
            <label class="option-label">{{ t('color') }}</label>
            <div class="color-picker">
              <div 
                v-for="color in NOTE_COLORS" 
                :key="color.value"
                class="color-option"
                :class="{ selected: selectedColor === color.value }"
                :style="{ backgroundColor: 'var(--color-note-' + color.value + ')' }"
                @click="selectedColor = color.value"
                :title="t(color.key)"
              ></div>
            </div>
          </div>
          
          <div class="option-section">
            <label class="option-label">
              📌 {{ t('floatingWindow') }}
            </label>
            <button 
              class="pin-toggle-btn"
              :class="{ active: isPinned }"
              @click="isPinned = !isPinned"
            >
              <span class="toggle-text">{{ isPinned ? t('pinned') : t('unpinned') }}</span>
            </button>
          </div>

          <div class="option-section">
            <label class="option-label">🔒 {{ t('encryptNote') }}</label>
            <button class="pin-toggle-btn" :class="{ active: isEncrypted }" @click="toggleEncryption">
              <span class="toggle-text">{{ isEncrypted ? t('encrypted') : t('encryptNote') }}</span>
            </button>
          </div>

          <div class="option-section">
            <label class="option-label">📄 {{ t('template') }}</label>
            <div class="template-wrapper">
              <button class="pin-toggle-btn" @click="showTemplateMenu = !showTemplateMenu">{{ t('template') }}</button>
              <div v-if="showTemplateMenu" class="template-menu">
                <div class="template-menu-item" @click="applyTemplate('meeting')">{{ t('tplMeeting') }}</div>
                <div class="template-menu-item" @click="applyTemplate('reading')">{{ t('tplReading') }}</div>
                <div class="template-menu-item" @click="applyTemplate('shopping')">{{ t('tplShopping') }}</div>
                <div class="template-menu-item" @click="applyTemplate('weekly')">{{ t('tplWeekly') }}</div>
                <div class="template-menu-item" @click="applyTemplate('goals')">{{ t('tplGoals') }}</div>
              </div>
            </div>
          </div>

          <div class="option-section" v-if="note && note.id">
            <label class="option-label">📜 {{ t('versionHistory') }}</label>
            <button class="pin-toggle-btn" @click="showVersionHistory">{{ t('versionHistory') }}</button>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-secondary" @click="handleCancel">{{ t('cancel') }}</button>
        <button class="btn btn-secondary" @click="copyNoteContent" :title="t('copyNote')">📋</button>
        <button v-if="note && note.id" class="btn btn-secondary" @click="shareAsImage" :title="t('shareImage')">📷</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="!canSave">{{ t('save') }}</button>
      </div>

      <!-- Version History Overlay -->
      <div v-if="showVersions" class="version-history-overlay" @click.self="showVersions = false">
        <div class="version-history-modal">
          <div class="version-history-header">
            <span>{{ t('versionHistory') }}</span>
            <button @click="showVersions = false">×</button>
          </div>
          <div v-if="versions.length === 0" class="version-history-empty">{{ t('noVersions') }}</div>
          <div v-else class="version-history-list">
            <div v-for="v in versions" :key="v.id" class="version-item" @click="previewVersion(v)">
              <div class="version-item-info">
                <div class="version-item-title">{{ v.title || t('noteTitle') }}</div>
                <div class="version-item-time">{{ v.saved_at }}</div>
              </div>
              <button class="btn btn-secondary" @click.stop="restoreVersion(v.id)">{{ t('restoreVersion') }}</button>
            </div>
          </div>
          <div v-if="previewVersionData" class="version-preview">
            <div class="version-preview-content" v-html="sanitizeVersionContent(previewVersionData.content)"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  
  props: {
    note: { type: Object, default: null },
    allNotes: { type: Array, default: () => [] }
  },
  
  emits: ['close', 'saved', 'edit'],
  
  setup(props, { emit }) {
    const title = ref('');
    const content = ref('');
    const selectedColor = ref(NOTE_COLORS[0].value);
    const isPinned = ref(false);
    const titleInput = ref(null);
    const editorContent = ref(null);
    const imageInput = ref(null);
    const inlineTodos = ref([]);
    const newTodoTitle = ref('');
    const selectedImg = ref(null);  // currently-selected <img> in editor
    const tagsArray = ref([]);
    const showTagInput = ref(false);
    const newTagValue = ref('');
    const tagInputRef = ref(null);
    const currentFontSize = ref('3');
    const showColorPalette = ref(false);
    const textColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#000000'];
    const isRecording = ref(false);
    const focusMode = ref(false);
    const showSlashMenu = ref(false);
    const slashMenuPos = ref({ x: 0, y: 0 });
    const slashQuery = ref('');
    const slashSelectedIdx = ref(0);
    const showTemplateMenu = ref(false);
    const isEncrypted = ref(false);
    const encryptionPassword = ref('');
    const showVersions = ref(false);
    const versions = ref([]);
    const previewVersionData = ref(null);
    // BUG-04: Sanitize version preview content before rendering to prevent XSS.
    const sanitizeVersionContent = (content) => sanitizeHtmlGlobal(content);
    let recognition = null;
    
    const execFormat = (command) => {
      document.execCommand(command, false, null);
      if (editorContent.value) editorContent.value.focus();
    };
    
    // Click inside editor: select image if clicked on <img>, else deselect
    const onContentClick = (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains('wiki-link')) {
        e.preventDefault();
        const noteTitle = target.getAttribute('data-note-title');
        if (noteTitle && props.allNotes) {
          const found = props.allNotes.find((n) => n.title === noteTitle);
          if (found) {
            emit('edit', found);
          } else if (confirm(t('createLinkedNote') + ': ' + noteTitle)) {
            emit('saved');
            nextTick(() => {
              emit('edit', { title: noteTitle, content: '', color: selectedColor.value });
            });
          }
        }
        return;
      }
      if (target && target.tagName === 'IMG') {
        // Clear previous selection
        const imgs = editorContent.value.querySelectorAll('img.selected');
        imgs.forEach((i) => i.classList.remove('selected'));
        target.classList.add('selected');
        selectedImg.value = target;
      } else {
        // Clicked outside any image — clear selection
        const imgs = editorContent.value.querySelectorAll('img.selected');
        imgs.forEach((i) => i.classList.remove('selected'));
        selectedImg.value = null;
      }
      // BUG-05: detect font size at cursor position
      setTimeout(() => {
        try {
          const sel = window.getSelection();
          if (!sel.rangeCount) return;
          let node = sel.anchorNode;
          if (node && node.nodeType === 3) node = node.parentElement;
          while (node && node !== editorContent.value) {
            const fontSize = node.style && node.style.fontSize;
            const fontTag = node.tagName === 'FONT' ? node.getAttribute('size') : null;
            if (fontTag) { currentFontSize.value = fontTag; return; }
            if (fontSize) {
              const px = parseInt(fontSize);
              if (px <= 11) currentFontSize.value = '1';
              else if (px <= 13) currentFontSize.value = '2';
              else if (px <= 15) currentFontSize.value = '3';
              else if (px <= 17) currentFontSize.value = '4';
              else if (px <= 23) currentFontSize.value = '5';
              else currentFontSize.value = '6';
              return;
            }
            node = node.parentElement;
          }
          currentFontSize.value = '3'; // default
        } catch (_) {}
      }, 0);
    };
    
    // Resize selected image by delta pixels (preserves aspect ratio)
    const resizeSelectedImage = (delta) => {
      if (!selectedImg.value) return;
      const img = selectedImg.value;
      const curW = img.offsetWidth || img.naturalWidth || 200;
      const newW = Math.max(50, Math.min(2000, curW + delta));
      img.style.width = newW + 'px';
      img.style.height = 'auto';
      content.value = editorContent.value.innerHTML;
    };
    
    const resetSelectedImageSize = () => {
      if (!selectedImg.value) return;
      const img = selectedImg.value;
      img.style.width = '';
      img.style.height = '';
      content.value = editorContent.value.innerHTML;
    };
    
    const onContentInput = () => {
      if (editorContent.value) {
        content.value = editorContent.value.innerHTML;
        const text = editorContent.value.innerText || '';
        // BUG-02: use Unicode-aware regex to match CJK characters in tags
        const hashTags = text.match(/#([\w\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u00C0-\u024f]+)/g);
        if (hashTags) {
          const extracted = hashTags.map((h) => h.slice(1).toLowerCase());
          const existing = tagsArray.value.map((t) => t.toLowerCase());
          for (const tag of extracted) {
            if (!existing.includes(tag)) {
              tagsArray.value.push(tag);
            }
          }
        }
        // Wiki link: detect ALL [[...]] and convert each one
        // BUG-07: use matchAll instead of match to handle multiple wiki links
        const wikiMatches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)];
        if (wikiMatches.length > 0) {
          const html = editorContent.value.innerHTML;
          let updated = html;
          for (const m of wikiMatches) {
            const noteTitle = m[1];
            // app-C-05: HTML-escape noteTitle before inserting into attributes/text to prevent XSS
            const escTitle = noteTitle.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            const escaped = m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'g');
            updated = updated.replace(re, '<a class="wiki-link" data-note-title="' + escTitle + '">' + escTitle + '</a>');
          }
          editorContent.value.innerHTML = updated;
          content.value = editorContent.value.innerHTML;
        }
        // Slash command: detect / at line start
        const beforeCursor = getCursorText();
        if (beforeCursor !== null) {
          const slashMatch = beforeCursor.match(/\/([^\s]*)$/);
          if (slashMatch) {
            slashQuery.value = slashMatch[1];
            showSlashMenu.value = true;
            const rect = getCaretRect();
            if (rect) { slashMenuPos.value = { x: rect.x, y: rect.y + 20 }; }
            slashSelectedIdx.value = 0;
          } else {
            showSlashMenu.value = false;
          }
        }
      }
    };

    const getCursorText = () => {
      try {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        if (!range.collapsed) return null;
        const node = range.startContainer;
        if (node.nodeType !== 3) return null;
        const text = node.textContent;
        const offset = range.startOffset;
        let lineStart = offset;
        while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
        return text.slice(lineStart, offset);
      } catch (_) { return null; }
    };

    const getCaretRect = () => {
      try {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorContent.value.getBoundingClientRect();
        return { x: rect.left - editorRect.left, y: rect.top - editorRect.top };
      } catch (_) { return null; }
    };

    const slashCommands = computed(() => [
      { key: 'h1', icon: 'H1', label: t('slashHeading1'), tag: 'h1' },
      { key: 'h2', icon: 'H2', label: t('slashHeading2'), tag: 'h2' },
      { key: 'h3', icon: 'H3', label: t('slashHeading3'), tag: 'h3' },
      { key: 'list', icon: '•', label: t('slashList'), tag: 'ul' },
      { key: 'todo', icon: '☑', label: t('slashTodo'), tag: 'checklist' },
      { key: 'code', icon: '</>', label: t('slashCode'), tag: 'pre' },
      { key: 'quote', icon: '❝', label: t('slashQuote'), tag: 'blockquote' },
      { key: 'hr', icon: '—', label: t('slashHr'), tag: 'hr' },
      { key: 'table', icon: '⊞', label: t('slashTable'), tag: 'table' },
      { key: 'link', icon: '🔗', label: t('slashLink'), tag: 'a' },
          { key: 'image', icon: '📷', label: t('slashImage'), tag: 'img' },
      { key: 'date', icon: '📅', label: t('slashDate'), tag: 'date' },
      { key: 'time', icon: '⏰', label: t('slashTime'), tag: 'time' }
    ]);

    const filteredSlashCommands = computed(() => {
      if (!slashQuery.value) return slashCommands.value;
      const q = slashQuery.value.toLowerCase();
      return slashCommands.value.filter((c) => c.label.toLowerCase().includes(q) || c.key.includes(q));
    });

    const executeSlashCommand = (cmd) => {
      showSlashMenu.value = false;
      if (!editorContent.value) return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== 3) return;
      const text = node.textContent;
      const offset = range.startOffset;
      let lineStart = offset;
      while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
      const slashStart = text.lastIndexOf('/', offset);
      if (slashStart >= 0 && slashStart >= lineStart) {
        node.textContent = text.slice(0, slashStart) + text.slice(offset);
      }
      let el;
      const now = new Date();
      if (cmd.tag === 'hr') {
        el = document.createElement('hr');
      } else if (cmd.tag === 'date') {
        el = document.createElement('span');
        el.textContent = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      } else if (cmd.tag === 'time') {
        el = document.createElement('span');
        el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      } else if (cmd.tag === 'a') {
        el = document.createElement('a');
        el.href = 'https://';
        el.textContent = 'Link';
        el.target = '_blank';
      } else if (cmd.tag === 'img') {
        pickImage();
        content.value = editorContent.value.innerHTML;
        return;
      } else if (cmd.tag === 'checklist') {
        el = document.createElement('ul');
        el.className = 'checklist';
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.setAttribute('contenteditable', 'false');
        li.appendChild(cb);
        li.appendChild(document.createTextNode(' '));
        el.appendChild(li);
      } else if (cmd.tag === 'table') {
        el = document.createElement('table');
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.textContent = 'Header';
        const td = document.createElement('td'); td.appendChild(document.createElement('br'));
        tr.appendChild(th); tr.appendChild(td);
        el.appendChild(tr);
      } else if (cmd.tag === 'pre') {
        el = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = ' ';
        el.appendChild(code);
      } else {
        el = document.createElement(cmd.tag);
        el.textContent = ' ';
      }
      if (node.parentElement) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        if (node.parentElement === editorContent.value) {
          editorContent.value.insertBefore(el, node.nextSibling || null);
          editorContent.value.insertBefore(p, el.nextSibling);
        } else {
          node.parentElement.insertBefore(el, node.nextSibling || null);
          node.parentElement.insertBefore(p, el.nextSibling);
        }
      }
      content.value = editorContent.value.innerHTML;
      editorContent.value.focus();
    };

    const toggleVoiceInput = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(t('voiceNotSupported'));
        return;
      }
      if (isRecording.value && recognition) {
        recognition.stop();
        isRecording.value = false;
        return;
      }
      recognition = new SpeechRecognition();
      const localeMap = { zh: 'zh-CN', en: 'en-US', vi: 'vi-VN' };
      recognition.lang = localeMap[locale.value] || 'zh-CN';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (editorContent.value) {
          editorContent.value.focus();
          document.execCommand('insertText', false, transcript + ' ');
          content.value = editorContent.value.innerHTML;
        }
        isRecording.value = false;
      };
      recognition.onerror = () => { isRecording.value = false; };
      recognition.onend = () => { isRecording.value = false; };
      recognition.start();
      isRecording.value = true;
    };

    const toggleFocusMode = () => {
      focusMode.value = !focusMode.value;
      const container = editorContent.value?.closest('.editor-container');
      if (container) {
        container.classList.toggle('focus-mode', focusMode.value);
      }
    };

    // BUG-04: byte-level XOR via TextEncoder/TextDecoder for CJK safety
    const encryptContent = (text, password) => {
      const textBytes = new TextEncoder().encode(text);
      const pwBytes = new TextEncoder().encode(password);
      const result = new Uint8Array(textBytes.length);
      for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ pwBytes[i % pwBytes.length];
      }
      // Uint8Array → base64
      let binary = '';
      for (let i = 0; i < result.length; i++) binary += String.fromCharCode(result[i]);
      return btoa(binary);
    };

    const decryptContent = (encrypted, password) => {
      try {
        const binary = atob(encrypted);
        const cipher = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) cipher[i] = binary.charCodeAt(i);
        const pwBytes = new TextEncoder().encode(password);
        const result = new Uint8Array(cipher.length);
        for (let i = 0; i < cipher.length; i++) {
          result[i] = cipher[i] ^ pwBytes[i % pwBytes.length];
        }
        return new TextDecoder().decode(result);
      } catch (_) {
        return null;
      }
    };

    const toggleEncryption = () => {
      if (isEncrypted.value) {
        const pw = prompt(t('enterPassword'));
        if (!pw) return;
        if (props.note && props.note.encrypted_content) {
          const decrypted = decryptContent(props.note.encrypted_content, pw);
          if (decrypted === null) {
            alert(t('wrongPassword'));
            return;
          }
          isEncrypted.value = false;
          encryptionPassword.value = '';
          content.value = decrypted;
          if (editorContent.value) editorContent.value.innerHTML = decrypted;
        }
      } else {
        const pw = prompt(t('enterPassword'));
        if (!pw) return;
        isEncrypted.value = true;
        encryptionPassword.value = pw;
      }
    };

    const showVersionHistory = async () => {
      if (!props.note || !props.note.id) return;
      try {
        versions.value = await window.electronAPI.notes.getVersions(props.note.id);
        showVersions.value = true;
      } catch (_) { versions.value = []; showVersions.value = true; }
    };

    const previewVersion = (v) => {
      previewVersionData.value = v;
    };

    const restoreVersion = async (versionId) => {
      try {
        await window.electronAPI.notes.restoreVersion(versionId);
        emit('saved');
        showVersions.value = false;
      } catch (_) {}
    };

    const backlinks = computed(() => {
      if (!props.note || !props.note.title || !props.allNotes) return [];
      return props.allNotes.filter((n) => {
        if (n.id === props.note.id) return false;
        return (n.content || '').includes('data-note-title="' + props.note.title + '"');
      });
    });

    const templates = {
      meeting: '<h2>会议记录</h2><p><b>日期：</b></p><p><b>参会人：</b></p><p><b>议题：</b></p><ul><li>议题一</li><li>议题二</li></ul><p><b>决议：</b></p><p><b>待办：</b></p>',
      reading: '<h2>读书笔记</h2><p><b>书名：</b></p><p><b>作者：</b></p><p><b>核心观点：</b></p><ul><li></li></ul><p><b>金句摘录：</b></p><blockquote></blockquote><p><b>个人感悟：</b></p>',
      shopping: '<h2>购物清单</h2><ul class="checklist"><li><input type="checkbox"> 物品一</li><li><input type="checkbox"> 物品二</li><li><input type="checkbox"> 物品三</li></ul>',
      weekly: '<h2>周计划</h2><p><b>本周目标：</b></p><ul><li></li></ul><p><b>周一：</b></p><p><b>周二：</b></p><p><b>周三：</b></p><p><b>周四：</b></p><p><b>周五：</b></p><p><b>本周总结：</b></p>',
      goals: '<h2>目标追踪</h2><p><b>目标：</b></p><p><b>截止日期：</b></p><p><b>进度：</b></p><table><tr><th>里程碑</th><th>状态</th></tr><tr><td></td><td></td></tr></table><p><b>备注：</b></p>'
    };

    const applyTemplate = (key) => {
      showTemplateMenu.value = false;
      if (editorContent.value && templates[key]) {
        editorContent.value.innerHTML = templates[key];
        content.value = editorContent.value.innerHTML;
      }
    };

    const shareAsImage = async () => {
      if (!props.note || !props.note.id) return;
      try {
        await window.electronAPI.note.exportImage({
          title: title.value,
          content: content.value,
          color: selectedColor.value
        });
        alert(t('imageSaved'));
      } catch (_) {}
    };
    
    const onContentKeydown = (e) => {
      // Slash menu navigation
      if (showSlashMenu.value) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          slashSelectedIdx.value = Math.min(slashSelectedIdx.value + 1, filteredSlashCommands.value.length - 1);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          slashSelectedIdx.value = Math.max(slashSelectedIdx.value - 1, 0);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredSlashCommands.value[slashSelectedIdx.value]) {
            executeSlashCommand(filteredSlashCommands.value[slashSelectedIdx.value]);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          showSlashMenu.value = false;
          return;
        }
      }
      // Focus mode exit
      if (e.key === 'Escape' && focusMode.value) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
        else if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
        else if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
        else if (e.key === 't') { e.preventDefault(); document.execCommand('strikeThrough'); }
        else if (e.key === 'L' && e.shiftKey) { e.preventDefault(); document.execCommand('insertUnorderedList'); }
        return;
      }
      // Tab in list: indent; Shift+Tab: outdent; Tab in table: next cell
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        let liCheck = window.getSelection().anchorNode;
        if (liCheck && liCheck.nodeType === 3) liCheck = liCheck.parentElement;
        let inTable = false;
        let tableCell = null;
        let walkEl = liCheck;
        while (walkEl && walkEl !== editorContent.value) {
          if (walkEl.tagName === 'TD' || walkEl.tagName === 'TH') { inTable = true; tableCell = walkEl; break; }
          walkEl = walkEl.parentElement;
        }
        if (inTable && tableCell) {
          e.preventDefault();
          const row = tableCell.parentElement;
          const nextCell = tableCell.nextElementSibling;
          if (nextCell) {
            const r = document.createRange();
            r.selectNodeContents(nextCell);
            r.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
          } else {
            const nextRow = row.nextElementSibling;
            if (nextRow) {
              const firstCell = nextRow.firstElementChild;
              if (firstCell) {
                const r = document.createRange();
                r.selectNodeContents(firstCell);
                r.collapse(true);
                const s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
              }
            }
          }
          return;
        }
        walkEl = liCheck;
        while (walkEl && walkEl !== editorContent.value) {
          if (walkEl.tagName === 'LI') {
            e.preventDefault();
            if (e.shiftKey) { document.execCommand('outdent'); }
            else { document.execCommand('indent'); }
            content.value = editorContent.value.innerHTML;
            return;
          }
          walkEl = walkEl.parentElement;
        }
      }
      // Escape in code block: exit
      if (e.key === 'Escape') {
        let node = window.getSelection().anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        while (node && node !== editorContent.value) {
          if (node.tagName === 'PRE') {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            node.parentNode.insertBefore(p, node.nextSibling);
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            content.value = editorContent.value.innerHTML;
            return;
          }
          node = node.parentElement;
        }
      }
      // Markdown line-level conversion on space
      if (e.key === ' ' && !e.shiftKey) {
        handleMarkdownTrigger(e);
      }
      // Link conversion: [text](url) + space — only if markdown didn't already handle it
      if (e.key === ' ' && !e.shiftKey && !e.defaultPrevented) {
        handleLinkTrigger(e);
      }
    };
    
    // Detect markdown prefix at the start of current line, convert on space
    const handleMarkdownTrigger = (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      
      const node = range.startContainer;
      if (node.nodeType !== 3) return;  // text node only
      
      const text = node.textContent;
      const offset = range.startOffset;
      // Look back for line start (BOL or \n)
      let lineStart = offset;
      while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
      const prefix = text.slice(lineStart, offset);
      
      // Match markdown prefixes
      // # / ## / ### / #### / ##### / ######  → h1..h6
      // - / * / +  → unordered list
      // 1. / 2. / ... → ordered list
      // > → blockquote
      const hMatch = prefix.match(/^(#{1,6})$/);
      const ulMatch = prefix.match(/^([-*+])$/);
      const olMatch = prefix.match(/^(\d+)\.$/);
      const quoteMatch = prefix.match(/^>$/);
      const hrMatch = prefix.match(/^---$/);
      const checklistMatch = prefix.match(/^- \[([ xX])\]$/);
      const tableMatch = prefix.match(/^\|(.+)\|$/);
      const codeMatch = prefix.match(/^```$/);
      
      let action = null;
      if (hMatch)        action = { tag: 'h' + hMatch[1].length };
      else if (checklistMatch) action = { tag: 'checklist', checked: checklistMatch[1] !== ' ' };
      else if (ulMatch)  action = { tag: 'ul' };
      else if (olMatch)  action = { tag: 'ol', start: olMatch[1] };
      else if (quoteMatch) action = { tag: 'blockquote' };
      else if (hrMatch)  action = { tag: 'hr' };
      else if (tableMatch) action = { tag: 'table', headerText: tableMatch[1] };
      else if (codeMatch) action = { tag: 'pre' };
      
      if (!action) return;
      
      e.preventDefault();
      
      // BUG-09: skip markdown conversion if cursor is inside a <li> — would create invalid nesting
      let liCheck = node.parentElement;
      while (liCheck && liCheck !== editorContent.value) {
        if (liCheck.tagName === 'LI') return;  // already in a list, skip
        liCheck = liCheck.parentElement;
      }
      
      // Find the parent block element (P or DIV)
      let block = node.parentElement;
      while (block && block.tagName !== 'P' && block.tagName !== 'DIV' && block !== editorContent.value) {
        block = block.parentElement;
      }
      if (!block || block === editorContent.value) {
        // No wrapping block: wrap the current text node into one
        const p = document.createElement('p');
        node.parentNode.insertBefore(p, node);
        p.appendChild(node);
        block = p;
        // Reset range reference
        const newRange = document.createRange();
        newRange.setStart(node, offset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      
      // Remove the markdown prefix from the text node
      const textNode = block.querySelector('br') ? block.firstChild : block.firstChild;
      // Simpler: just strip prefix from block's innerText
      const blockText = block.textContent;
      const stripped = blockText.slice(prefix.length);
      
      // Build replacement element
      let newEl;
      if (action.tag === 'ul' || action.tag === 'ol') {
        newEl = document.createElement(action.tag);
        if (action.start != null) newEl.setAttribute('start', action.start);
        const li = document.createElement('li');
        li.textContent = stripped;
        newEl.appendChild(li);
      } else if (action.tag === 'checklist') {
        newEl = document.createElement('ul');
        newEl.className = 'checklist';
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = action.checked;
        cb.setAttribute('contenteditable', 'false');
        li.appendChild(cb);
        li.appendChild(document.createTextNode(stripped));
        newEl.appendChild(li);
      } else if (action.tag === 'hr') {
        newEl = document.createElement('hr');
      } else if (action.tag === 'table') {
        newEl = document.createElement('table');
        const thead = document.createElement('thead');
        const hrRow = document.createElement('tr');
        const cols = action.headerText.split('|').map((c) => c.trim()).filter(Boolean);
        cols.forEach((colText) => {
          const th = document.createElement('th');
          th.textContent = colText;
          hrRow.appendChild(th);
        });
        thead.appendChild(hrRow);
        newEl.appendChild(thead);
        const tbody = document.createElement('tbody');
        const bodyRow = document.createElement('tr');
        cols.forEach(() => {
          const td = document.createElement('td');
          td.appendChild(document.createElement('br'));
          bodyRow.appendChild(td);
        });
        tbody.appendChild(bodyRow);
        newEl.appendChild(tbody);
      } else if (action.tag === 'pre') {
        newEl = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = stripped;
        newEl.appendChild(code);
      } else {
        newEl = document.createElement(action.tag);
        newEl.textContent = stripped;
      }
      
      // Replace the block with new element + empty paragraph for continued typing
      const empty = document.createElement('p');
      empty.innerHTML = '<br>';
      block.parentNode.insertBefore(newEl, block);
      block.parentNode.insertBefore(empty, block.nextSibling);
      block.parentNode.removeChild(block);
      
      // Place cursor in the empty paragraph
      const newRange = document.createRange();
      newRange.setStart(empty, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      
      content.value = editorContent.value.innerHTML;
    };
    
    const handleLinkTrigger = (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const node = range.startContainer;
      if (node.nodeType !== 3) return;
      const text = node.textContent;
      const offset = range.startOffset;
      const before = text.slice(0, offset);
      const linkMatch = before.match(/\[([^\]]+)\]\(([^)]+)\)$/);
      if (!linkMatch) return;
      e.preventDefault();
      const fullMatch = linkMatch[0];
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const start = offset - fullMatch.length;
      node.textContent = text.slice(0, start) + text.slice(offset);
      const a = document.createElement('a');
      a.href = linkUrl;
      a.textContent = linkText;
      a.target = '_blank';
      if (node.parentElement && node.parentElement !== editorContent.value) {
        const afterNode = node.splitText(start);
        node.parentElement.insertBefore(a, afterNode);
        node.parentElement.insertBefore(document.createTextNode(' '), afterNode);
      } else if (node.parentElement === editorContent.value) {
        // BUG-07: text node is direct child of editorContent — insert link directly
        const afterNode = node.splitText(start);
        editorContent.value.insertBefore(a, afterNode);
        editorContent.value.insertBefore(document.createTextNode(' '), afterNode);
      }
      content.value = editorContent.value.innerHTML;
    };
    
    const compressImage = (file) => compressImageFile(file);  // OPT-04: use shared util
    
    const insertImageAtCursor = (src) => {
      if (editorContent.value) {
        editorContent.value.focus();
        document.execCommand('insertImage', false, src);
        content.value = editorContent.value.innerHTML;
      }
    };
    
    const pickImage = () => {
      if (imageInput.value) imageInput.value.click();
    };
    
    const onImageFileSelected = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const src = await compressImage(file);
      if (src) insertImageAtCursor(src);
      e.target.value = '';
    };
    
    const onContentPaste = async (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const src = await compressImage(file);
          if (src) insertImageAtCursor(src);
          return;
        }
      }
    };
    
    const onContentDrop = async (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          const src = await compressImage(file);
          if (src) insertImageAtCursor(src);
          return;
        }
      }
    };
    
    const copyNoteContent = () => {
      if (editorContent.value) {
        const range = document.createRange();
        range.selectNodeContents(editorContent.value);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
    };
    
    const onFontSizeChange = (e) => {
      const size = e.target.value;
      document.execCommand('fontSize', false, size);
      currentFontSize.value = size;
      if (editorContent.value) {
        content.value = editorContent.value.innerHTML;
        editorContent.value.focus();
      }
    };

    const applyTextColor = (color) => {
      document.execCommand('foreColor', false, color);
      showColorPalette.value = false;
      if (editorContent.value) {
        content.value = editorContent.value.innerHTML;
        editorContent.value.focus();
      }
    };

    const startAddTag = () => {
      showTagInput.value = true;
      newTagValue.value = '';
      nextTick(() => {
        if (tagInputRef.value) tagInputRef.value.focus();
      });
    };

    const addTag = () => {
      const val = newTagValue.value.trim().replace(/^#/, '');
      if (val && !tagsArray.value.map((t) => t.toLowerCase()).includes(val.toLowerCase())) {
        tagsArray.value.push(val);
      }
      newTagValue.value = '';
      showTagInput.value = false;
    };

    const removeTag = (idx) => {
      tagsArray.value.splice(idx, 1);
    };
    
    const loadInlineTodos = async () => {
      if (!props.note || !props.note.id) {
        inlineTodos.value = [];
        return;
      }
      try {
        inlineTodos.value = await window.electronAPI.todos.getByNote(props.note.id);
      } catch (error) {
        console.error('Failed to load inline todos:', error);
      }
    };

    const addInlineTodo = async () => {
      const title = prompt(t('promptTodoTitle'));
      if (!title || !title.trim()) return;
      try {
        await window.electronAPI.todos.create({
          title: title.trim(),
          note_id: props.note.id,
          priority: 'medium',
          completed: 0,
          due_date: null,
          category: '',
        });
        await loadInlineTodos();
      } catch (error) {
        console.error('Failed to add inline todo:', error);
      }
    };

    const toggleInlineTodo = async (todo) => {
      try {
        await window.electronAPI.todos.update(todo.id, { completed: !todo.completed });
        await loadInlineTodos();
      } catch (error) {
        console.error('Failed to toggle inline todo:', error);
      }
    };

    const deleteInlineTodo = async (todo) => {
      try {
        await window.electronAPI.todos.delete(todo.id);
        await loadInlineTodos();
      } catch (error) {
        console.error('Failed to delete inline todo:', error);
      }
    };
    
    // Sync editor state from props.note (used by both onMounted and watch)
    const syncFromProp = () => {
      if (props.note) {
        title.value = props.note.title || '';
        content.value = props.note.content || '';
        selectedColor.value = getColorName(props.note.color);
        isPinned.value = props.note.is_pinned || false;
        tagsArray.value = (props.note.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        isEncrypted.value = props.note.is_encrypted === 1;
        if (isEncrypted.value && props.note.encrypted_content) {
          content.value = '🔒 ' + t('encrypted');
        }
        loadInlineTodos();
      } else {
        title.value = '';
        content.value = '';
        selectedColor.value = NOTE_COLORS[0].value;
        isPinned.value = false;
        tagsArray.value = [];
      }
      if (editorContent.value) {
        editorContent.value.innerHTML = content.value;
        editorContent.value.setAttribute('data-placeholder', t('contentPlaceholder'));
      }
      if (titleInput.value) titleInput.value.focus();
    };
    
    onMounted(() => {
      syncFromProp();
    });
    
    // Watch for prop change — when user switches notes without unmounting the editor
    watch(() => props.note, () => {
      syncFromProp();
    });
    
    const canSave = computed(() => {
      const text = content.value.replace(/<[^>]*>/g, '').trim();
      return title.value.trim() || text;
    });
    
    const handleSave = async () => {
      if (!canSave.value) return;

      const noteData = {
        title: title.value.trim(),
        // R2-04: When encrypted, store placeholder in content — plaintext lives only in encrypted_content.
        content: isEncrypted.value ? '🔒 ' + t('encrypted') : content.value.trim(),
        color: selectedColor.value,
        is_pinned: isPinned.value,
        tags: tagsArray.value.join(','),
        is_encrypted: isEncrypted.value ? 1 : 0,
        encrypted_content: isEncrypted.value ? encryptContent(content.value, encryptionPassword.value || 'stickytodo') : null
      };

      try {
        let savedNote;
        if (props.note && props.note.id) {
          savedNote = await window.electronAPI.notes.update(props.note.id, noteData);
        } else {
          savedNote = await window.electronAPI.notes.create(noteData);
        }

        // Handle floating note for newly created notes with pin
        if (isPinned.value && savedNote && savedNote.id) {
          await window.electronAPI.floatingNote.create(savedNote.id, { alwaysOnTop: false });
        } else if (isPinned.value && props.note) {
          await window.electronAPI.floatingNote.create(props.note.id, { alwaysOnTop: false });
        }

        emit('saved');
      } catch (error) {
        console.error('Failed to save note:', error);
      }
    };
    
    const handleCancel = () => {
      emit('close');
    };
    
    return {
      title,
      content,
      selectedColor,
      isPinned,
      titleInput,
      editorContent,
      imageInput,
      NOTE_COLORS,
      canSave,
      handleSave,
      handleCancel,
      inlineTodos,
      addInlineTodo,
      toggleInlineTodo,
      deleteInlineTodo,
      execFormat,
      onContentInput,
      onContentKeydown,
      onContentPaste,
      onContentDrop,
      onContentClick,
      pickImage,
      onImageFileSelected,
      copyNoteContent,
      selectedImg,
      resizeSelectedImage,
      resetSelectedImageSize,
      tagsArray,
      showTagInput,
      newTagValue,
      tagInputRef,
      startAddTag,
      addTag,
      removeTag,
      currentFontSize,
      onFontSizeChange,
      showColorPalette,
      textColors,
      applyTextColor,
      isRecording,
      toggleVoiceInput,
      focusMode,
      toggleFocusMode,
      showSlashMenu,
      slashMenuPos,
      slashQuery,
      slashSelectedIdx,
      filteredSlashCommands,
      executeSlashCommand,
      showTemplateMenu,
      applyTemplate,
      isEncrypted,
      toggleEncryption,
      showVersions,
      versions,
      previewVersionData,
      sanitizeVersionContent,
      showVersionHistory,
      previewVersion,
      restoreVersion,
      backlinks,
      shareAsImage,
      t
    };
  }
};

// ============================================
// NoteList Component
// ============================================
const NoteList = {
  template: `
    <div class="note-list">
      <div v-if="sortedNotes.length === 0 && searchQuery" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">{{ t('searchNoResults') }}</div>
      </div>
      <div v-else-if="notes.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">{{ showArchived ? t('archivedNotes') : t('noNotes') }}</div>
        <div v-if="!showArchived" class="empty-hint">{{ t('noNotesHint') }}</div>
      </div>
      
      <template v-for="group in groupedNotes" :key="group.group">
        <div v-if="group.group" class="group-header">{{ group.group }}</div>
        <div 
          v-for="note in group.items" 
          :key="note.id"
          class="note-card"
          :class="['color-' + getColorName(note.color), { dragging: draggedNoteId === note.id, 'drag-over': dragOverNoteId === note.id }]"
          draggable="true"
          @dragstart="onDragStart($event, note)"
          @dragover.prevent="onDragOver($event, note)"
          @drop="onDrop($event, note, group)"
          @dragend="onDragEnd"
          @click="editNote(note)"
          @contextmenu.prevent="$emit('context-menu', $event, note)"
        >
          <input v-if="multiSelectMode" type="checkbox" class="batch-checkbox" :checked="selectedIds.has(note.id)" @click.stop="$emit('toggle-select', note.id)" />
          <div class="note-card-header">
            <div class="note-card-title" v-html="highlightText(note.title || t('noteTitle'))"></div>
            <span v-if="note.is_encrypted" class="note-encrypted-badge">🔒</span>
            <div class="note-card-actions">
              <button v-if="!showArchived && !multiSelectMode"
                class="note-action-btn"
                @click.stop="$emit('duplicate', note)"
                :title="t('duplicateNote')"
              >⧉</button>
              <button
                class="note-action-btn"
                @click.stop="togglePin(note)"
                :title="t('popOutNote')"
              >
                📌
              </button>
              <button v-if="showArchived"
                class="note-action-btn"
                @click.stop="$emit('restore', note)"
                :title="t('restore')"
              >↩</button>
              <button v-if="!showArchived"
                class="note-action-btn"
                @click.stop="$emit('archive', note)"
                :title="t('archive')"
              >📦</button>
              <button 
                class="note-action-btn delete"
                @click.stop="deleteNote(note)"
                :title="t('delete')"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div class="note-card-content" v-if="note.content" v-html="highlightContent(note.content)"></div>
          
          <div class="note-card-footer" v-if="note.is_pinned || getBacklinkCount(note) > 0">
            <span v-if="note.is_pinned" class="note-pin-indicator">{{ t('pinIndicator') }}</span>
            <span v-if="getBacklinkCount(note) > 0" class="backlink-badge">🔗 {{ getBacklinkCount(note) }}</span>
          </div>
      </div>

      </template>
    </div>
  `,
  
  props: {
    notes: { type: Array, default: () => [] },
    grouping: { type: String, default: 'none' },
    searchQuery: { type: String, default: '' },
    showArchived: { type: Boolean, default: false },
    multiSelectMode: { type: Boolean, default: false },
    selectedIds: { type: Object, default: () => new Set() }
  },
  
  emits: ['edit', 'refresh', 'duplicate', 'archive', 'restore', 'stick', 'toggle-select', 'deleted', 'context-menu'],
  
  setup(props, { emit }) {
    const draggedNoteId = ref(null);
    const dragOverNoteId = ref(null);

    const onDragStart = (e, note) => {
      draggedNoteId.value = note.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(note.id));
      // Notify main process to track cursor — pop out floating window if dragged outside
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.start({ type: 'note', id: note.id });
      }
    };

    const onDragOver = (e, note) => {
      e.preventDefault();
      dragOverNoteId.value = note.id;
    };

    const onDrop = async (e, targetNote, group) => {
      e.preventDefault();
      dragOverNoteId.value = null;
      const fromId = draggedNoteId.value;
      if (!fromId || fromId === targetNote.id) { draggedNoteId.value = null; return; }

      let items = group ? group.items : sortedNotes.value;
      const fromIdx = items.findIndex((n) => n.id === fromId);
      const toIdx = items.findIndex((n) => n.id === targetNote.id);
      if (fromIdx < 0 || toIdx < 0) { draggedNoteId.value = null; return; }

      const reordered = [...items];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // BUG-03: use global max order_index as base offset
      const allMaxOrder = props.notes.reduce((mx, n) => Math.max(mx, n.order_index || 0), 0);
      const baseOffset = allMaxOrder + 1;
      for (let i = 0; i < reordered.length; i++) {
        const newOrder = baseOffset + i;
        if (reordered[i].order_index !== newOrder) {
          try {
            await window.electronAPI.notes.update(reordered[i].id, { order_index: newOrder });
          } catch (_) {}
        }
      }
      draggedNoteId.value = null;
      emit('refresh');
    };

    const onDragEnd = () => {
      draggedNoteId.value = null;
      dragOverNoteId.value = null;
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.stop();
      }
    };

    const highlightText = (text) => {
      if (!text || !props.searchQuery) return text || '';
      // O9: HTML-escape text first to prevent XSS via v-html, then highlight.
      const escText = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const escaped = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return escText.replace(regex, '<mark class="search-match">$1</mark>');
    };

    const highlightContent = (html) => {
      if (!html || !props.searchQuery) return sanitizeHtml(html);
      // BUG-01: Only highlight in text nodes, not inside HTML tags.
      // Split by tags, highlight only text segments, then rejoin.
      const safe = sanitizeHtml(html);
      const escaped = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      // Split into tag and text segments
      const segments = safe.split(/(<[^>]*>)/g);
      const result = segments.map((seg) => {
        if (seg.startsWith('<') && seg.endsWith('>')) return seg; // tag — skip
        return seg.replace(regex, '<mark class="search-match">$1</mark>');
      });
      return result.join('');
    };

    // getColorName + COLOR_MAP are now module-level (shared with App floating view)

    
    const sanitizeHtml = sanitizeHtmlGlobal; // SEC-01: use module-level improved sanitizer
    
    const sortedNotes = computed(() => {
      let result = [...props.notes];
      result = result.filter((n) => props.showArchived ? n.is_archived === 1 : n.is_archived !== 1);
      if (props.searchQuery) {
        const q = props.searchQuery.toLowerCase();
        result = result.filter((note) => {
          const titleMatch = (note.title || '').toLowerCase().includes(q);
          const contentMatch = (note.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(q);
          return titleMatch || contentMatch;
        });
      }
      return result.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // Order by order_index (drag-reorderable) first, fallback to created_at desc
        if (a.order_index != null && b.order_index != null && a.order_index !== b.order_index) {
          return a.order_index - b.order_index;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
    });

    const getISOWeekNumber = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      return Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
    };

    const groupedNotes = computed(() => {
      const items = sortedNotes.value;
      if (props.grouping === 'none' || !props.grouping) {
        return [{ group: '', items }];
      }
      if (props.grouping === 'date') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayWeek = getISOWeekNumber(today);
        const todayYear = today.getFullYear();
        const groups = { today: [], thisWeek: [], earlier: [] };
        for (const note of items) {
          const d = new Date(note.created_at);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() === today.getTime()) {
            groups.today.push(note);
          } else if (d.getFullYear() === todayYear && getISOWeekNumber(d) === todayWeek) {
            groups.thisWeek.push(note);
          } else {
            groups.earlier.push(note);
          }
        }
        const result = [];
        if (groups.today.length) result.push({ group: t('groupToday'), items: groups.today });
        if (groups.thisWeek.length) result.push({ group: t('groupThisWeek'), items: groups.thisWeek });
        if (groups.earlier.length) result.push({ group: t('groupEarlier'), items: groups.earlier });
        return result;
      }
      if (props.grouping === 'alpha') {
        const map = {};
        for (const note of items) {
          const ch = (note.title || '#')[0].toUpperCase();
          const letter = /[A-Z]/.test(ch) ? ch : '#';
          if (!map[letter]) map[letter] = [];
          map[letter].push(note);
        }
        const result = [];
        const keys = Object.keys(map).sort();
        for (const k of keys) {
          result.push({ group: k === '#' ? '#' : k, items: map[k] });
        }
        return result.length ? result : [{ group: '', items }];
      }
      return [{ group: '', items }];
    });
    
    const editNote = (note) => {
      emit('edit', note);
    };
    
    const deleteNote = async (note) => {
      if (!confirm(t('confirmDeleteNote'))) return;
      try {
        // Soft delete: set deleted_at (moves to trash, auto-purged after 30 days).
        await window.electronAPI.notes.delete(note.id);
        if (note.is_pinned) {
          await window.electronAPI.floatingNote.close(note.id);
        }
        emit('refresh');
        emit('deleted', { type: 'note', id: note.id, title: note.title });
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    };

    // Open the note in an independent desktop window (Windows Sticky Notes
    // style). Does NOT toggle is_pinned — the window opens non-on-top by
    // default; the user can toggle always-on-top from the floating toolbar.
    const togglePin = async (note) => {
      try {
        await window.electronAPI.floatingNote.create(note.id, { alwaysOnTop: false });
      } catch (error) {
        console.error('Failed to open note window:', error);
      }
    };
    
    // R2-11: Build backlink map once per notes change (O(N²) once) instead of
    // per-render per-note (O(N²) × render count).
    const backlinkMap = computed(() => {
      const map = {};
      for (const n of props.notes) {
        if (!n.title) continue;
        map[n.id] = 0;
      }
      for (const n of props.notes) {
        if (!n.content) continue;
        for (const other of props.notes) {
          if (other.id === n.id || !other.title) continue;
          if (n.content.includes('data-note-title="' + other.title + '"')) {
            map[other.id] = (map[other.id] || 0) + 1;
          }
        }
      }
      return map;
    });

    const getBacklinkCount = (note) => {
      if (!note || !note.title) return 0;
      return backlinkMap.value[note.id] || 0;
    };

    return {
      sortedNotes,
      groupedNotes,
      getColorName,
      sanitizeHtml,
      highlightText,
      highlightContent,
      editNote,
      deleteNote,
      togglePin,
      draggedNoteId,
      dragOverNoteId,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      getBacklinkCount,
      t
    };
  }
};

// ============================================
// TodoEditor Component
// ============================================
const TodoEditor = {
  template: `
    <div class="editor-container">
      <div class="content-scroll">
        <input 
          v-model="title" 
          class="editor-title" 
          :placeholder="t('todoTitlePlaceholder')"
          ref="titleInput"
        />
        
        <div class="editor-options">
          <div class="option-section">
            <label class="option-label">{{ t('priority') }}</label>
            <div class="priority-options">
              <button 
                v-for="priority in priorities" 
                :key="priority.value"
                class="priority-btn"
                :class="{ 
                  selected: selectedPriority === priority.value,
                  ['priority-' + priority.value]: true
                }"
                @click="selectedPriority = priority.value"
              >
                {{ priority.label }}
              </button>
            </div>
          </div>
          
          <div class="option-section">
            <label class="option-label">{{ t('dueDate') }}</label>
            <div class="due-date-row">
              <input 
                v-model="dueDate"
                type="datetime-local"
                lang="en-GB"
                class="date-input"
              />
              <button class="smart-date-btn" @click="parseSmartDate" :title="t('smartDate')">🧠</button>
            </div>
            <div v-if="smartDateMsg" class="smart-date-msg">{{ smartDateMsg }}</div>
          </div>
          
          <div class="option-section">
            <label class="option-label">{{ t('category') }}</label>
            <input 
              v-model="category" 
              class="category-input" 
              :placeholder="t('categoryPlaceholder')"
            />
          </div>
          
          <div class="option-section" v-if="notes.length > 0">
            <label class="option-label">{{ t('linkNote') }}</label>
            <select v-model="selectedNoteId" class="note-select">
              <option :value="null">—</option>
              <option v-for="note in notes" :key="note.id" :value="note.id">
                {{ note.title || t('noteTitle') }}
              </option>
            </select>
          </div>

          <div class="option-section">
            <label class="option-label">📌 {{ t('tags') }}</label>
            <div class="tags-chips">
              <span v-for="(tag, idx) in todoTags" :key="idx" class="tag-chip">
                {{ tag }}
                <button class="tag-chip-remove" @click="removeTodoTag(idx)">×</button>
              </span>
              <div v-if="showTodoTagInput" class="tag-input-wrapper">
                <input
                  class="tag-input"
                  v-model="newTodoTagValue"
                  :placeholder="t('tagPlaceholder')"
                  @keydown.enter="addTodoTag"
                  @blur="addTodoTag"
                />
              </div>
              <button v-else class="tag-add-btn" @click="showTodoTagInput = true">+ {{ t('addTag') }}</button>
            </div>
          </div>

          <div class="option-section">
            <label class="option-label">🔁 {{ t('repeat') }}</label>
            <div class="repeat-options">
              <button v-for="opt in repeatOptions" :key="opt.value" class="priority-btn" :class="{ selected: selectedRepeat === opt.value, 'priority-medium': true }" @click="selectedRepeat = opt.value">{{ opt.label }}</button>
            </div>
          </div>

          <div class="option-section" v-if="todo && todo.id">
            <label class="option-label">📋 {{ t('subtasks') }}</label>
            <div v-if="subtasks.length === 0" class="tags-empty">{{ t('noSubtasks') }}</div>
            <div v-for="sub in subtasks" :key="sub.id" class="subtask-editor-item">
              <div class="todo-checkbox subtask-checkbox" :class="{ checked: sub.completed }" @click="toggleSubtask(sub)"></div>
              <span class="subtask-title" :class="{ 'line-through': sub.completed }">{{ sub.title }}</span>
              <button class="inline-todo-delete" @click="deleteSubtask(sub)">✕</button>
            </div>
            <div class="subtask-add-row">
              <input class="tag-input" v-model="newSubtaskTitle" :placeholder="t('subtaskPlaceholder')" @keydown.enter="addSubtask" />
              <button class="tag-add-btn" @click="addSubtask">{{ t('addSubtask') }}</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-secondary" @click="handleCancel">{{ t('cancel') }}</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="!canSave">{{ t('save') }}</button>
      </div>
    </div>
  `,
  
  props: {
    todo: { type: Object, default: null },
    notes: { type: Array, default: () => [] }
  },
  
  emits: ['close', 'saved'],
  
  setup(props, { emit }) {
    const title = ref('');
    const selectedPriority = ref('medium');
    const dueDate = ref('');
    const category = ref('');
    const selectedNoteId = ref(null);
    const titleInput = ref(null);
    const todoTags = ref([]);
    const showTodoTagInput = ref(false);
    const newTodoTagValue = ref('');
    const selectedRepeat = ref(null);
    const subtasks = ref([]);
    const newSubtaskTitle = ref('');
    const smartDateMsg = ref('');
    
    const priorities = computed(() => [
      { value: 'high', label: t('priorityHigh') },
      { value: 'medium', label: t('priorityMedium') },
      { value: 'low', label: t('priorityLow') }
    ]);

    const repeatOptions = computed(() => [
      { value: null, label: t('repeatNone') },
      { value: 'daily', label: t('repeatDaily') },
      { value: 'weekly', label: t('repeatWeekly') },
      { value: 'monthly', label: t('repeatMonthly') }
    ]);
    
    onMounted(() => {
      if (props.todo) {
        title.value = props.todo.title || '';
        selectedPriority.value = props.todo.priority || 'medium';
        dueDate.value = props.todo.due_date ? props.todo.due_date.slice(0, 16) : '';
        category.value = props.todo.category || '';
        selectedNoteId.value = props.todo.note_id || null;
        todoTags.value = (props.todo.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        selectedRepeat.value = props.todo.repeat_type || null;
        loadSubtasks();
      }
      if (titleInput.value) {
        titleInput.value.focus();
      }
    });

    const loadSubtasks = async () => {
      if (!props.todo || !props.todo.id) { subtasks.value = []; return; }
      try {
        subtasks.value = await window.electronAPI.todos.getSubtasks(props.todo.id);
      } catch (_) { subtasks.value = []; }
    };

    const toggleSubtask = async (sub) => {
      try {
        await window.electronAPI.todos.update(sub.id, { completed: !sub.completed });
        await loadSubtasks();
      } catch (_) {}
    };

    const deleteSubtask = async (sub) => {
      try {
        await window.electronAPI.todos.delete(sub.id);
        await loadSubtasks();
      } catch (_) {}
    };

    const addSubtask = async () => {
      const val = newSubtaskTitle.value.trim();
      if (!val || !props.todo || !props.todo.id) return;
      try {
        await window.electronAPI.todos.create({
          title: val,
          parent_id: props.todo.id,
          is_subtask: 1,
          priority: 'medium',
          completed: 0
        });
        newSubtaskTitle.value = '';
        await loadSubtasks();
      } catch (_) {}
    };

    const parseSmartDate = () => {
      const text = title.value;
      if (!text) { smartDateMsg.value = t('smartDateNotFound'); return; }
      const now = new Date();
      const patterns = [
        { re: /今天/g, fn: () => now },
        { re: /明天/g, fn: () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d; } },
        { re: /后天/g, fn: () => { const d = new Date(now); d.setDate(d.getDate() + 2); return d; } },
        { re: /tomorrow/gi, fn: () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d; } },
        { re: /next week/gi, fn: () => { const d = new Date(now); d.setDate(d.getDate() + 7); return d; } },
        { re: /ngày mai/gi, fn: () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d; } },
        { re: /(\d+)天后/g, fn: (m) => { const d = new Date(now); d.setDate(d.getDate() + parseInt(m[1])); return d; } },
        { re: /in (\d+) days/gi, fn: (m) => { const d = new Date(now); d.setDate(d.getDate() + parseInt(m[1])); return d; } },
        { re: /下周一/g, fn: () => { const d = new Date(now); const daysUntilMon = (1 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + daysUntilMon); return d; } },
        { re: /(\d{1,2})[\/\-](\d{1,2})/g, fn: (m) => { const d = new Date(now.getFullYear(), parseInt(m[1]) - 1, parseInt(m[2])); return d; } }
      ];
      for (const p of patterns) {
        const match = text.match(p.re);
        if (match) {
          const date = p.fn(match);
          const val = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + 'T09:00';
          dueDate.value = val;
          smartDateMsg.value = t('smartDateFound') + val.replace('T09:00', '');
          return;
        }
      }
      smartDateMsg.value = t('smartDateNotFound');
    };

    const removeTodoTag = (idx) => {
      todoTags.value.splice(idx, 1);
    };

    const addTodoTag = () => {
      const val = newTodoTagValue.value.trim().replace(/^#/, '');
      if (val && !todoTags.value.map((t) => t.toLowerCase()).includes(val.toLowerCase())) {
        todoTags.value.push(val);
      }
      newTodoTagValue.value = '';
      showTodoTagInput.value = false;
    };

    const canSave = computed(() => {
      return title.value.trim();
    });

    const handleSave = async () => {
      if (!canSave.value) return;

      const todoData = {
        title: title.value.trim(),
        priority: selectedPriority.value,
        due_date: dueDate.value || null,
        category: category.value.trim(),
        note_id: selectedNoteId.value,
        tags: todoTags.value.join(','),
        repeat_type: selectedRepeat.value
      };

      try {
        if (props.todo && props.todo.id) {
          await window.electronAPI.todos.update(props.todo.id, todoData);
        } else {
          await window.electronAPI.todos.create(todoData);
        }
        emit('saved');
      } catch (error) {
        console.error('Failed to save todo:', error);
      }
    };
    
    const handleCancel = () => {
      emit('close');
    };
    
    return {
      title,
      selectedPriority,
      dueDate,
      category,
      selectedNoteId,
      titleInput,
      priorities,
      canSave,
      handleSave,
      handleCancel,
      todoTags,
      showTodoTagInput,
      newTodoTagValue,
      removeTodoTag,
      addTodoTag,
      selectedRepeat,
      repeatOptions,
      subtasks,
      newSubtaskTitle,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      smartDateMsg,
      parseSmartDate,
      t
    };
  }
};

// ============================================
// BoardView Component (Kanban)
// ============================================
const BoardView = {
  template: `
    <div class="board-view">
      <div v-for="col in columns" :key="col.color" class="board-column"
        @dragover.prevent="onColumnDragOver($event, col.color)"
        @dragleave="onColumnDragLeave($event)"
        @drop="onColumnDrop($event, col.color)"
      >
        <div class="board-column-header" :style="{ borderBottomColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="board-col-count">{{ col.notes.length }}</span>
        </div>
        <div class="board-column-body">
          <div v-if="col.notes.length === 0" class="board-column-empty">{{ t('boardEmpty') }}</div>
          <div v-for="note in col.notes" :key="note.id" class="board-card"
            draggable="true"
            @dragstart="onCardDragStart($event, note)"
            @dragend="onCardDragEnd"
            @click="$emit('edit', note)"
          >
            <div class="board-card-title">{{ note.title || t('noteTitle') }}</div>
              <div class="board-card-preview" v-if="note.content">{{ stripHtml(note.content) }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    notes: { type: Array, default: () => [] },
    searchQuery: { type: String, default: '' }
  },
  emits: ['edit', 'update-note', 'refresh'],
  setup(props, { emit }) {
    const draggedNote = ref(null);
    const columns = computed(() => {
      const filtered = props.searchQuery
        ? props.notes.filter((n) => {
            const q = props.searchQuery.toLowerCase();
            return (n.title || '').toLowerCase().includes(q) || (n.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(q);
          })
        : props.notes.filter((n) => !n.is_archived);
      return NOTE_COLORS.map((c) => ({
        color: c.value,
        label: t(c.key),
        notes: filtered.filter((n) => n.color === c.value)
      }));
    });
    const stripHtml = (html) => {
      return String(html).replace(/<[^>]*>/g, '').slice(0, 80);
    };
    const onCardDragStart = (e, note) => {
      draggedNote.value = note;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(note.id));
    };
    const onCardDragEnd = () => {
      draggedNote.value = null;
    };
    const onColumnDragOver = (e, color) => {
      e.currentTarget.classList.add('drag-over');
    };
    const onColumnDragLeave = (e) => {
      e.currentTarget.classList.remove('drag-over');
    };
    const onColumnDrop = async (e, color) => {
      e.currentTarget.classList.remove('drag-over');
      if (!draggedNote.value || draggedNote.value.color === color) return;
      try {
        await window.electronAPI.notes.update(draggedNote.value.id, { color });
        emit('refresh');
      } catch (_) {}
    };
    return { columns, stripHtml, onCardDragStart, onCardDragEnd, onColumnDragOver, onColumnDragLeave, onColumnDrop, t };
  }
};

// ============================================
// TimelineView Component
// ============================================
const TimelineView = {
  template: `
    <div class="timeline-view">
      <div v-if="events.length === 0" class="empty-state">
        <div class="empty-icon">📈</div>
        <div class="empty-text">{{ t('timelineEmpty') }}</div>
      </div>
      <div v-for="(evt, idx) in events" :key="idx" class="timeline-item" :class="evt.cls">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-icon">{{ evt.icon }}</span>
          <span class="timeline-label">{{ evt.label }}</span>
          <span class="timeline-title">{{ evt.title }}</span>
          <span class="timeline-time">{{ evt.time }}</span>
        </div>
      </div>
    </div>
  `,
  props: {
    notes: { type: Array, default: () => [] },
    todos: { type: Array, default: () => [] }
  },
  setup(props) {
    const events = computed(() => {
      const list = [];
      for (const n of props.notes) {
        if (n.is_archived) continue;
        list.push({ cls: 'tl-note-created', icon: '📝', label: t('tlNoteCreated'), title: n.title || t('noteTitle'), time: n.created_at, ts: new Date(n.created_at).getTime() });
        if (n.updated_at && n.updated_at !== n.created_at) {
          list.push({ cls: 'tl-note-updated', icon: '✏️', label: t('tlNoteUpdated'), title: n.title || t('noteTitle'), time: n.updated_at, ts: new Date(n.updated_at).getTime() });
        }
      }
      for (const todo of props.todos) {
        if (todo.is_archived || todo.is_subtask) continue;
        list.push({ cls: 'tl-todo-created', icon: '✅', label: t('tlTodoCreated'), title: todo.title, time: todo.created_at, ts: new Date(todo.created_at).getTime() });
        if (todo.completed) {
          list.push({ cls: 'tl-todo-completed', icon: '🎉', label: t('tlTodoCompleted'), title: todo.title, time: todo.updated_at || todo.created_at, ts: new Date(todo.updated_at || todo.created_at).getTime() });
        }
      }
      list.sort((a, b) => b.ts - a.ts);
      return list.slice(0, 50);
    });
    return { events, t };
  }
};

// ============================================
// AllView Component (unified notes + todos list)
// ============================================
const AllView = {
  template: `
    <div class="all-view-container">
      <div v-if="allItems.length === 0" class="empty-state">
        <div class="empty-text">{{ t('noNotes') }}</div>
      </div>
      <div
        v-for="item in allItems"
        :key="item.type + '-' + item.id"
        class="all-item"
        :class="[
          'all-item-' + item.type,
          { dragging: draggedId === item.uniqueId, 'drag-over': dragOverId === item.uniqueId },
          item.type === 'note' ? ['color-' + getColorName(item.color)] : (item.color ? ['color-' + getColorName(item.color)] : [])
        ]"
        draggable="true"
        @dragstart="onDragStart($event, item)"
        @dragover.prevent="onDragOver($event, item)"
        @drop="onDrop($event, item)"
        @dragend="onDragEnd"
        @click="popOut(item)"
        @contextmenu.prevent="onContextMenu($event, item)"
      >
        <span v-if="item.type === 'note'" class="all-item-icon">📝</span>
        <input v-else type="checkbox" class="all-item-checkbox" :checked="item.completed === 1" @click.stop="toggleTodoComplete(item)" :title="t('toggleTodo')" />
        <div class="all-item-body">
          <div class="all-item-title" :class="{ 'todo-done': item.type === 'todo' && item.completed }" v-html="highlightText(item.title || (item.type === 'note' ? t('noteTitle') : t('todoTitlePlaceholder')))"></div>
          <div v-if="getContentPreview(item)" class="all-item-content" v-html="highlightText(getContentPreview(item))"></div>
          <div class="all-item-meta">
            <span v-if="item.type === 'todo'" class="all-item-priority" :class="'pri-' + (item.priority || 'medium')">{{ getPriorityLabel(item.priority) }}</span>
            <span v-if="item.due_date" class="all-item-date">📅 {{ formatDate(item.due_date) }}</span>
            <span class="all-item-type-label">{{ item.type === 'note' ? t('tabNotes') : t('tabTodos') }}</span>
          </div>
        </div>
        <div class="all-item-actions">
          <button class="all-item-btn" @click.stop="popOut(item)" :title="t('popOutNote')">📌</button>
          <button class="all-item-btn" @click.stop="onDuplicate(item)" :title="t('duplicateNote')">⧉</button>
          <button class="all-item-btn" @click.stop="onArchive(item)" :title="t('archive')">📦</button>
          <button class="all-item-btn delete" @click.stop="onDelete(item)" :title="t('delete')">✕</button>
        </div>
      </div>
    </div>

    <!-- Right-click context menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @mouseleave="contextMenu.visible = false" @click.stop>
      <button class="ctx-item" @click="ctxAction('popOut')">🪟 {{ t('popOutNote') }}</button>
      <button class="ctx-item" @click="ctxAction('edit')">✎ {{ t('edit') }}</button>
      <div class="ctx-sep"></div>
      <button v-if="contextMenu.item && contextMenu.item.type === 'todo'" class="ctx-item" @click="ctxAction('toggle')">✓ {{ t('toggleTodo') }}</button>
      <button class="ctx-item" @click="ctxAction('duplicate')">⧉ {{ t('duplicateNote') }}</button>
      <button class="ctx-item" @click="ctxAction('color')">🎨 {{ t('color') }}</button>
      <div v-if="contextMenu.showColors" class="ctx-color-row">
        <div v-for="c in NOTE_COLORS" :key="c.value" class="ctx-color-dot" :style="{ backgroundColor: 'var(--color-note-' + c.value + ')' }" @click="ctxChangeColor(c.value)"></div>
      </div>
      <button v-if="contextMenu.item && contextMenu.item.type === 'todo'" class="ctx-item" @click="ctxAction('date')">📅 {{ t('dueDate') }}</button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" @click="ctxAction('archive')">📦 {{ t('archive') }}</button>
      <button class="ctx-item ctx-danger" @click="ctxAction('delete')">✕ {{ t('delete') }}</button>
    </div>
    <!-- Hidden date picker for context menu -->
    <input v-if="contextMenu.showDate" type="datetime-local" lang="en-GB" ref="ctxDatePicker" class="ctx-date-picker" @change="ctxSetDate($event)" @blur="contextMenu.showDate = false" />
  `,

  props: {
    notes: { type: Array, default: () => [] },
    todos: { type: Array, default: () => [] },
    searchQuery: { type: String, default: '' },
    filter: { type: String, default: 'all' },
  },

  emits: ['pop-out', 'delete-item', 'duplicate-item', 'archive-item', 'refresh', 'edit-in-sidebar'],

  setup(props, { emit }) {
    const draggedId = ref(null);
    const dragOverId = ref(null);

    const allItems = computed(() => {
      // Merge notes and todos into one array, tagged by type.
      let noteItems = props.notes
        .filter((n) => n.is_archived !== 1)
        .map((n) => ({ ...n, type: 'note', uniqueId: 'note-' + n.id }));
      let todoItems = props.todos
        .filter((t2) => t2.is_archived !== 1 && !t2.is_subtask)
        .map((t2) => ({ ...t2, type: 'todo', uniqueId: 'todo-' + t2.id }));

      let combined = [...noteItems, ...todoItems];

      // Type filter (all / note / todo)
      if (props.filter && props.filter !== 'all') {
        combined = combined.filter((item) => item.type === props.filter);
      }

      // Search filter
      if (props.searchQuery) {
        const q = props.searchQuery.toLowerCase();
        combined = combined.filter((item) => {
          const titleMatch = (item.title || '').toLowerCase().includes(q);
          const contentMatch = (item.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(q);
          return titleMatch || contentMatch;
        });
      }

      // Sort by updated_at descending (most recent first)
      combined.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });

      return combined;
    });

    const popOut = (item) => {
      emit('pop-out', item);
    };

    const onDelete = async (item) => {
      const msg = item.type === 'note' ? t('confirmDeleteNote') : t('confirmDeleteTodo');
      if (!confirm(msg)) return;
      try {
        const api = item.type === 'note' ? window.electronAPI.notes : window.electronAPI.todos;
        await api.delete(item.id);
        emit('delete-item', { type: item.type, id: item.id, title: item.title });
        emit('refresh');
      } catch (e) { console.error('Delete failed:', e); }
    };

    const onDuplicate = async (item) => {
      try {
        if (item.type === 'note') {
          const dup = await window.electronAPI.notes.create({
            title: (item.title || '') + ' ' + t('duplicateSuffix'),
            content: item.content || '',
            color: getColorName(item.color),
          });
        } else {
          await window.electronAPI.todos.create({
            title: (item.title || '') + ' ' + t('duplicateSuffix'),
            priority: item.priority || 'medium',
            due_date: item.due_date || null,
            content: item.content || null,  // R3-09: preserve content field
          });
        }
        emit('refresh');
      } catch (e) { console.error('Duplicate failed:', e); }
    };

    const onArchive = async (item) => {
      try {
        const api = item.type === 'note' ? window.electronAPI.notes : window.electronAPI.todos;
        await api.update(item.id, { is_archived: 1 });
        emit('refresh');
      } catch (e) { console.error('Archive failed:', e); }
    };

    // Toggle todo completion from the checkbox in the all-view.
    const toggleTodoComplete = async (item) => {
      try {
        const newCompleted = item.completed === 1 ? 0 : 1;
        await window.electronAPI.todos.update(item.id, { completed: newCompleted });
        emit('refresh');
      } catch (e) { console.error('Toggle todo failed:', e); }
    };

    // ---- Right-click context menu ----
    const contextMenu = ref({ visible: false, x: 0, y: 0, item: null, showColors: false, showDate: false });
    const ctxDatePicker = ref(null);

    const onContextMenu = (e, item) => {
      contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, item: item, showColors: false, showDate: false };
    };

    const ctxAction = (action) => {
      const item = contextMenu.value.item;
      if (!item) return;
      contextMenu.value.visible = false;
      switch (action) {
        case 'popOut': popOut(item); break;
        case 'edit': emit('edit-in-sidebar', item); break;
        case 'toggle': toggleTodoComplete(item); break;
        case 'duplicate': onDuplicate(item); break;
        case 'color': contextMenu.value.visible = true; contextMenu.value.showColors = true; break;
        case 'date': contextMenu.value.visible = true; contextMenu.value.showDate = true; nextTick(() => { if (ctxDatePicker.value) ctxDatePicker.value.focus(); }); break;
        case 'archive': onArchive(item); break;
        case 'delete': onDelete(item); break;
      }
    };

    const ctxChangeColor = async (color) => {
      const item = contextMenu.value.item;
      if (!item) return;
      try {
        const api = item.type === 'note' ? window.electronAPI.notes : window.electronAPI.todos;
        await api.update(item.id, { color });
        emit('refresh');
      } catch (e) { console.error('Change color failed:', e); }
      contextMenu.value = { visible: false, x: 0, y: 0, item: null, showColors: false, showDate: false };
    };

    const ctxSetDate = async (e) => {
      const item = contextMenu.value.item;
      if (!item) return;
      try { await window.electronAPI.todos.update(item.id, { due_date: e.target.value }); emit('refresh'); } catch (er) {}
      contextMenu.value = { visible: false, x: 0, y: 0, item: null, showColors: false, showDate: false };
    };

    const highlightText = (text) => {
      if (!text || !props.searchQuery) return text || '';
      // R3-06: Escape HTML first to prevent injection via v-html, then highlight
      const escapedHtml = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const escaped = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return escapedHtml.replace(regex, '<mark class="search-match">$1</mark>');
    };

    // Strip HTML tags and truncate for a one-line content preview.
    const getContentPreview = (item) => {
      const raw = item.content || '';
      const text = raw.replace(/<[^>]*>/g, '').trim();
      return text.length > 80 ? text.slice(0, 80) + '…' : text;
    };

    const getPriorityLabel = (p) => {
      const map = { high: t('priorityHigh'), medium: t('priorityMedium'), low: t('priorityLow') };
      return map[p] || p || '';
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const today = new Date();
      const hm = ` ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      if (d.toDateString() === today.toDateString()) return t('groupToday') + hm;
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) return t('tomorrow') + hm;
      return `${d.getMonth()+1}/${d.getDate()}` + hm;
    };

    // Drag and drop for reordering
    const onDragStart = (e, item) => {
      draggedId.value = item.uniqueId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.uniqueId);
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.start({ type: item.type, id: item.id });
      }
    };

    const onDragOver = (e, item) => {
      e.preventDefault();
      dragOverId.value = item.uniqueId;
    };

    const onDrop = async (e, targetItem) => {
      e.preventDefault();
      dragOverId.value = null;
      const fromId = draggedId.value;
      if (!fromId || fromId === targetItem.uniqueId) { draggedId.value = null; return; }

      const fromItem = allItems.value.find((i) => i.uniqueId === fromId);
      if (!fromItem) { draggedId.value = null; return; }

      // R2-02: Cross-type drops don't swap order_index (independent sequences).
      // Same-type drops swap order_index for reordering.
      try {
        if (fromItem.type !== targetItem.type) {
          // Cross-type: no reorder, just refresh (user can use 📌 to pop out)
          emit('refresh');
        } else {
          const api = fromItem.type === 'note' ? window.electronAPI.notes : window.electronAPI.todos;
          await api.update(fromItem.id, { order_index: targetItem.order_index });
          await api.update(targetItem.id, { order_index: fromItem.order_index });
          emit('refresh');
        }
      } catch (err) {
        console.error('Reorder failed:', err);
      }
      draggedId.value = null;
    };

    const onDragEnd = () => {
      draggedId.value = null;
      dragOverId.value = null;
      if (window.electronAPI && window.electronAPI.drag) {
        window.electronAPI.drag.stop();
      }
    };

    return { allItems, draggedId, dragOverId, t, popOut, onDelete, onDuplicate, onArchive, toggleTodoComplete, getContentPreview, highlightText, getPriorityLabel, formatDate, getColorName, onDragStart, onDragOver, onDrop, onDragEnd, contextMenu, ctxDatePicker, onContextMenu, ctxAction, ctxChangeColor, ctxSetDate, NOTE_COLORS };
  }
};

// ============================================
// Main App Component
// ============================================
const App = {
  template: `
    <div id="app" @click="closeAllMenus">
      <!-- Floating Note Window (single-note view, Windows Sticky Notes style) -->
      <div v-if="isFloatingNote" class="floating-note-window sticky-mode" :class="['color-' + (floatingNote ? getColorName(floatingNote.color) : 'yellow')]">
        <div class="floating-note-titlebar">
          <div style="position:relative" @click.stop>
            <button class="titlebar-add-btn" @mousedown.prevent="showNoteAddMenu = !showNoteAddMenu" :title="t('addNote')">+</button>
            <div v-if="showNoteAddMenu" class="titlebar-add-dropdown" @mouseleave="showNoteAddMenu = false">
              <button class="titlebar-add-item" @mousedown.prevent="showNoteAddMenu = false; createNoteInWindow()">📝 {{ t('tabNotes') }}</button>
              <button class="titlebar-add-item" @mousedown.prevent="showNoteAddMenu = false; createTodoInWindow()">✓ {{ t('tabTodos') }}</button>
            </div>
          </div>
          <span class="floating-note-title-text">{{ floatingNote && (floatingNote.title || t('noteTitle')) }}</span>
          <div class="floating-note-toolbar">
            <div class="fmt-color-picker" @click.stop>
              <button class="floating-note-tool-btn" @mousedown.prevent="toggleColorPicker" title="🎨">🎨</button>
              <div v-if="showColorPicker" class="color-dot-row">
                <div v-for="c in NOTE_COLORS" :key="c.value"
                     class="color-dot" :class="{ active: getColorName(floatingNote.color) === c.value }"
                     :style="{ backgroundColor: 'var(--color-note-' + c.value + ')' }"
                     @mousedown.prevent="changeNoteColor(c.value)"></div>
              </div>
            </div>
            <button class="floating-note-tool-btn" @click="toggleFloatingOnTop" :title="t('toggleFloatingOnTop')">{{ floatingOnTop ? '📌' : '📍' }}</button>
            <button class="floating-note-close" @click="closeFloatingNote" :title="t('close')" :aria-label="t('close')">×</button>
          </div>
        </div>
        <div class="floating-note-content" v-if="floatingNote">
          <!-- R3-01: Encrypted notes show locked placeholder, editing disabled -->
          <div v-if="floatingNote.is_encrypted" class="floating-encrypted-notice">🔒 {{ t('encrypted') }}</div>
          <template v-else>
          <input
            v-model="floatingNote.title"
            class="editor-title"
            :placeholder="t('titlePlaceholder')"
            @input="floatingDirty = true; scheduleFloatingSave()"
            @blur="onFloatingNoteBlur"
          />
          <div
            class="editor-content floating-editor"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            ref="floatingEditorContent"
            :data-placeholder="t('contentPlaceholder')"
            :aria-label="t('contentPlaceholder')"
            @input="onFloatingContentInput"
            @blur="onFloatingNoteBlur"
            @paste="onFloatingContentPaste"
            @drop="onFloatingContentDrop"
            @dragover.prevent
          ></div>
          </template>
        </div>
        <!-- Format toolbar (bottom, below content) -->
        <div class="floating-format-toolbar" v-if="floatingNote && !floatingNote.is_encrypted">
          <button class="fmt-btn" @mousedown.prevent="formatCmd('bold')" :title="t('bold')" style="font-weight:bold">B</button>
          <button class="fmt-btn" @mousedown.prevent="formatCmd('italic')" :title="t('italic')" style="font-style:italic">I</button>
          <button class="fmt-btn" @mousedown.prevent="formatCmd('underline')" :title="t('underline')" style="text-decoration:underline">U</button>
          <button class="fmt-btn" @mousedown.prevent="formatCmd('strikeThrough')" :title="t('strikethrough')" style="text-decoration:line-through">S</button>
          <span class="fmt-sep"></span>
          <button class="fmt-btn" @mousedown.prevent="formatCmd('insertUnorderedList')" :title="t('list')">•</button>
          <button class="fmt-btn" @mousedown.prevent="formatCmd('insertOrderedList')" :title="t('list')">1.</button>
          <span class="fmt-sep"></span>
          <button class="fmt-btn" @mousedown.prevent="insertImageFloating" :title="t('insertImage')"><span class="icon-image"></span></button>
          <button class="fmt-btn" @mousedown.prevent="shrinkImageFloating" :title="t('shrinkImage')">−</button>
          <button class="fmt-btn" @mousedown.prevent="enlargeImageFloating" :title="t('enlargeImage')">+</button>
        </div>
        <div v-else class="empty-state">
          <div class="empty-text">{{ t('loading') }}</div>
        </div>
      </div>

      <!-- Floating Todo Window (independent desktop window) -->
      <div v-else-if="isFloatingTodo" class="floating-todo-window" :class="['priority-' + (floatingTodo ? floatingTodo.priority : 'medium'), 'color-' + (floatingTodo ? getColorName(floatingTodoColor) : 'blue')]">
        <div class="floating-note-titlebar">
          <div style="position:relative" @click.stop>
            <button class="titlebar-add-btn" @mousedown.prevent="showTodoAddMenu = !showTodoAddMenu" :title="t('addNote')">+</button>
            <div v-if="showTodoAddMenu" class="titlebar-add-dropdown" @mouseleave="showTodoAddMenu = false">
              <button class="titlebar-add-item" @mousedown.prevent="showTodoAddMenu = false; createNoteInWindow()">📝 {{ t('tabNotes') }}</button>
              <button class="titlebar-add-item" @mousedown.prevent="showTodoAddMenu = false; createTodoInWindow()">✓ {{ t('tabTodos') }}</button>
            </div>
          </div>
          <span class="floating-note-title-text">{{ floatingTodo ? (floatingTodo.title || t('todoTitlePlaceholder')) : t('loading') }}</span>
          <div class="floating-note-toolbar">
            <div class="fmt-color-picker" @click.stop>
              <button class="floating-note-tool-btn" @mousedown.prevent="toggleTodoColorPicker" title="🎨">🎨</button>
              <div v-if="showTodoColorPicker" class="color-dot-row">
                <div v-for="c in NOTE_COLORS" :key="c.value"
                     class="color-dot" :class="{ active: floatingTodoColor === c.value }"
                     :style="{ backgroundColor: 'var(--color-note-' + c.value + ')' }"
                     @mousedown.prevent="changeTodoColor(c.value)"></div>
              </div>
            </div>
            <button class="floating-note-tool-btn" @click="toggleFloatingTodoOnTop" :title="t('toggleFloatingOnTop')">{{ floatingTodoOnTop ? '📌' : '📍' }}</button>
            <button class="floating-note-close" @click="closeFloatingTodo" :title="t('close')" :aria-label="t('close')">×</button>
          </div>
        </div>
        <div class="floating-todo-content" v-if="floatingTodo">
          <div class="floating-todo-row">
            <input type="checkbox" class="floating-todo-checkbox" v-model="floatingTodo.completed" :true-value="1" :false-value="0" @change="onFloatingTodoChange" />
            <input v-model="floatingTodo.title" class="editor-title" :placeholder="t('todoTitlePlaceholder')" @blur="onFloatingTodoChange" />
          </div>
          <div class="floating-todo-meta">
            <label class="floating-todo-field">
              <span class="floating-todo-field-label">{{ t('priority') }}</span>
              <select v-model="floatingTodo.priority" @change="onFloatingTodoChange" class="floating-todo-select">
                <option value="high">{{ t('priorityHigh') }}</option>
                <option value="medium">{{ t('priorityMedium') }}</option>
                <option value="low">{{ t('priorityLow') }}</option>
              </select>
            </label>
            <label class="floating-todo-field">
              <span class="floating-todo-field-label">{{ t('dueDate') }}</span>
              <input type="datetime-local" lang="en-GB" v-model="floatingTodo.due_date" @change="onFloatingTodoChange" class="floating-todo-date" />
            </label>
          </div>
          <div
            class="editor-content floating-todo-notes"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            ref="floatingTodoContent"
            :data-placeholder="t('contentPlaceholder')"
            :aria-label="t('contentPlaceholder')"
            @input="onFloatingTodoInput"
            @blur="onFloatingTodoChange"
          ></div>
        </div>
        <!-- Format toolbar (bottom, below content) -->
        <div class="floating-format-toolbar" v-if="floatingTodo">
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('bold')" :title="t('bold')" style="font-weight:bold">B</button>
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('italic')" :title="t('italic')" style="font-style:italic">I</button>
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('underline')" :title="t('underline')" style="text-decoration:underline">U</button>
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('strikeThrough')" :title="t('strikethrough')" style="text-decoration:line-through">S</button>
          <span class="fmt-sep"></span>
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('insertUnorderedList')" :title="t('list')">•</button>
          <button class="fmt-btn" @mousedown.prevent="formatTodoCmd('insertOrderedList')" :title="t('list')">1.</button>
          <span class="fmt-sep"></span>
          <button class="fmt-btn" @mousedown.prevent="insertImageFloatingTodo" :title="t('insertImage')"><span class="icon-image"></span></button>
          <button class="fmt-btn" @mousedown.prevent="shrinkImageFloatingTodo" :title="t('shrinkImage')">−</button>
          <button class="fmt-btn" @mousedown.prevent="enlargeImageFloatingTodo" :title="t('enlargeImage')">+</button>
        </div>
        <div v-else class="empty-state">
          <div class="empty-text">{{ t('loading') }}</div>
        </div>
      </div>

      <!-- Sidebar (main window) -->
      <template v-else>
      <!-- Sidebar Edge (hover to expand when collapsed) -->
      <div
        v-if="isCollapsed"
        class="sidebar-edge"
        @click="toggleCollapse"
        @mouseenter="expandFromEdge"
      ></div>

      <!-- Main Sidebar -->
      <div
        class="sidebar"
        :class="{ collapsed: isCollapsed }"
      >
        <div class="sidebar-inner">
          <!-- Window Header -->
          <div class="window-header">
            <div class="window-title">StickyTodo</div>
            <div class="window-controls">
              <button class="window-btn theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? t('toggleLight') : t('toggleDark')" :aria-label="theme === 'dark' ? t('toggleLight') : t('toggleDark')">{{ theme === 'dark' ? '☀' : '🌙' }}</button>
              <div style="position:relative;display:inline-block" @click.stop>
                <button class="window-btn" @click="showLangMenu = !showLangMenu" :title="t('language')" :aria-label="t('language')" :aria-expanded="showLangMenu" aria-haspopup="true">🌐</button>
                <div v-if="showLangMenu" class="lang-dropdown" role="menu">
                  <button @click="setLocale('zh')" role="menuitem">中文</button>
                  <button @click="setLocale('en')" role="menuitem">English</button>
                  <button @click="setLocale('vi')" role="menuitem">Tiếng Việt</button>
                </div>
              </div>
              <button class="window-btn" @click="showSettings = true" :title="t('settings')" :aria-label="t('settings')">⚙</button>
              <div class="opacity-control">
                <input type="range" class="opacity-slider" min="0.1" max="1.0" step="0.05" v-model.number="opacity" @input="onOpacityChange" :title="t('opacity')" :aria-label="t('opacity')" />
              </div>
              <button class="window-btn pin-top" :class="{ active: alwaysOnTop }" @click="toggleAlwaysOnTop" :title="alwaysOnTop ? t('unpinFromTop') : t('pinOnTop')" :aria-label="alwaysOnTop ? t('unpinFromTop') : t('pinOnTop')" :aria-pressed="alwaysOnTop">{{ alwaysOnTop ? '📌' : '📍' }}</button>
              <button class="window-btn" @click="exportData" :title="t('export')" :aria-label="t('export')">⬇</button>
              <button class="window-btn minimize" @click="minimizeWindow" :title="t('minimize')" :aria-label="t('minimize')">▬</button>
              <button class="window-btn close" @click="hideWindow" :title="t('close')" :aria-label="t('close')">✕</button>
            </div>
          </div>
          
          <!-- Tabs -->
          <div class="tabs" role="tablist" :aria-label="t('settings')">
            <button v-if="showTabAll"
              class="tab-btn" 
              :class="{ active: currentTab === 'all' }"
              @click="currentTab = 'all'"
              role="tab"
              :aria-selected="currentTab === 'all'"
            >
              {{ t('tabAll') }}
            </button>
            <button v-if="showTabNotes"
              class="tab-btn" 
              :class="{ active: currentTab === 'notes' }"
              @click="currentTab = 'notes'"
              role="tab"
              :aria-selected="currentTab === 'notes'"
            >
              {{ t('tabNotes') }}
            </button>
            <button v-if="showTabTodos"
              class="tab-btn" 
              :class="{ active: currentTab === 'todos' }"
              @click="currentTab = 'todos'"
              role="tab"
              :aria-selected="currentTab === 'todos'"
            >
              {{ t('tabTodos') }}
            </button>
            <button v-if="showTabTimeline"
              class="tab-btn" 
              :class="{ active: currentTab === 'timeline' }"
              @click="currentTab = 'timeline'"
              role="tab"
              :aria-selected="currentTab === 'timeline'"
            >
              {{ t('tabTimeline') }}
            </button>
            <button v-if="showTabCalendar"
              class="tab-btn" 
              :class="{ active: currentTab === 'calendar' }"
              @click="currentTab = 'calendar'"
              role="tab"
              :aria-selected="currentTab === 'calendar'"
            >
              {{ t('tabCalendar') }}
            </button>
            <button v-if="showTabBoard"
              class="tab-btn" 
              :class="{ active: currentTab === 'board' }"
              @click="currentTab = 'board'"
              role="tab"
              :aria-selected="currentTab === 'board'"
            >
              {{ t('tabBoard') }}
            </button>
            <button v-if="showTabTrash"
              class="tab-btn trash-tab" 
              :class="{ active: currentTab === 'trash' }"
              @click="currentTab = 'trash'; loadTrash()"
              role="tab"
              :aria-selected="currentTab === 'trash'"
            >
              🗑 {{ t('trash') }}
            </button>
          </div>
          
          <!-- Content Area -->
          <div class="sidebar-content">
            <!-- Reminder Banner -->
            <div v-if="reminders.length > 0" class="reminder-banner">
              <div v-for="r in reminders" :key="r.id" class="reminder-item">
                <span class="reminder-icon">📅</span>
                <span class="reminder-text">{{ r.title }}</span>
                <span class="reminder-due">{{ r.due_date }}</span>
                <button class="reminder-dismiss" @click="dismissReminder(r.id, r.due_date)" :title="t('reminderDismiss')">✕</button>
              </div>
            </div>

            <!-- All Tab (unified view) -->
            <template v-if="currentTab === 'all'">
              <div class="content-header">
                <div class="content-title">{{ t('tabAll') }}</div>
                <select v-model="allFilter" class="all-filter-select" :aria-label="t('filterAll')">
                  <option value="all">{{ t('tabAll') }}</option>
                  <option value="note">{{ t('tabNotes') }}</option>
                  <option value="todo">{{ t('tabTodos') }}</option>
                </select>
                <div class="search-box-wrapper">
                  <span class="search-icon" aria-hidden="true">🔍</span>
                  <input type="text" class="search-box" :value="searchQuery" @input="onSearchInput" :placeholder="t('searchPlaceholder')" :aria-label="t('searchPlaceholder')" />
                  <button v-if="searchQuery" class="search-clear" @click="clearSearch" :title="t('clearSearch')" :aria-label="t('clearSearch')">×</button>
                </div>
                <div style="position:relative" @click.stop>
                  <button class="add-btn" @click="showAddNoteMenu = !showAddNoteMenu" :title="t('addNote')" :aria-label="t('addNote')" :aria-expanded="showAddNoteMenu" aria-haspopup="true">+</button>
                  <div v-if="showAddNoteMenu" class="add-dropdown" @mouseleave="showAddNoteMenu = false" role="menu">
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; createNoteInWindow()" role="menuitem">🪟 {{ t('tabNotes') }}{{ t('addInWindow') }}</button>
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; createTodoInWindow()" role="menuitem">🪟 {{ t('tabTodos') }}{{ t('addInWindow') }}</button>
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; currentTab = 'notes'; showNewNoteEditor()" role="menuitem">📝 {{ t('tabNotes') }}{{ t('addInSidebar') }}</button>
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; currentTab = 'todos'; showNewTodoEditor()" role="menuitem">✓ {{ t('tabTodos') }}{{ t('addInSidebar') }}</button>
                  </div>
                </div>
              </div>
              <AllView
                :notes="notes"
                :todos="todos"
                :search-query="debouncedSearchQuery"
                :filter="allFilter"
                @edit-note="editNote"
                @edit-todo="editTodo"
                @edit-in-sidebar="editInSidebar"
                @pop-out="popOutItem"
                @delete-item="onItemDeleted"
                @refresh="loadAll"
              />
            </template>

            <!-- Notes Tab -->
            <template v-if="currentTab === 'notes'">
              <div class="content-header" v-if="!showingEditor">
                <div class="content-title">{{ showArchived ? t('archivedNotes') : t('notes') }}</div>
                <button class="header-icon-btn" :class="{ active: showArchived }" @click="showArchived = !showArchived" :title="t('archive')">📦</button>
                <button class="header-icon-btn" :class="{ active: multiSelectMode }" @click="multiSelectMode = !multiSelectMode" :title="t('multiSelect')">☑</button>
                <div class="search-box-wrapper">
                  <span class="search-icon">🔍</span>
                  <input type="text" class="search-box" :value="searchQuery" @input="onSearchInput" :placeholder="t('searchPlaceholder')" />
                  <button v-if="searchQuery" class="search-clear" @click="clearSearch" :title="t('clearSearch')">×</button>
                </div>
                <div style="position:relative" @click.stop>
                  <button class="add-btn" @click="showAddNoteMenu = !showAddNoteMenu" :title="t('addNote')">+</button>
                  <div v-if="showAddNoteMenu" class="add-dropdown" @mouseleave="showAddNoteMenu = false">
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; showNewNoteEditor()">📝 {{ t('addInSidebar') }}</button>
                    <button class="add-dropdown-item" @click="showAddNoteMenu = false; createNoteInWindow()">🪟 {{ t('addInWindow') }}</button>
                  </div>
                </div>
              </div>
              
              <!-- Batch action bar for notes -->
              <div v-if="multiSelectMode && currentTab === 'notes'" class="batch-action-bar">
                <span class="batch-count">{{ t('selectedCount').replace('{n}', selectedIds.size) }}</span>
                <button class="btn btn-secondary" @click="selectAll">{{ t('selectAll') }}</button>
                <button class="btn btn-secondary" style="color:var(--danger)" @click="batchDelete">{{ t('batchDelete') }}</button>
                <button class="btn btn-secondary" @click="batchArchive">{{ t('batchArchive') }}</button>
                <div class="batch-color-pick">
                  <span class="batch-color-label">{{ t('batchColor') }}</span>
                  <div v-for="c in NOTE_COLORS" :key="c.value" class="batch-color-dot" :style="{ backgroundColor: 'var(--color-note-' + c.value + ')' }" @click="batchColor(c.value)"></div>
                </div>
                <button class="btn btn-secondary" @click="exitMultiSelect">{{ t('exitMultiSelect') }}</button>
              </div>
              
              <div v-if="showingEditor" class="editor-wrapper">
                <NoteEditor 
                  :note="editingNote"
                  :all-notes="notes"
                  @close="hideEditor"
                  @saved="onNoteSaved"
                  @edit="editNote"
                />
              </div>
              <div v-else class="content-scroll">
                <NoteList 
                  :notes="notes"
                  :grouping="groupingMode"
                  :search-query="debouncedSearchQuery"
                  :show-archived="showArchived"
                  :multi-select-mode="multiSelectMode"
                  :selected-ids="selectedIds"
                  @edit="editNote"
                  @refresh="loadAll"
                  @deleted="onItemDeleted"
                  @duplicate="duplicateNote"
                  @archive="archiveNote"
                  @restore="restoreNote"
                  @toggle-select="toggleSelect"
                  @context-menu="showNoteContextMenu"
                />
              </div>
            </template>
            
            <!-- Todos Tab -->
            <template v-if="currentTab === 'todos'">
              <div class="content-header" v-if="!showingEditor">
                <div class="content-title">{{ showArchived ? t('archivedTodos') : t('todos') }}</div>
                <button class="header-icon-btn" :class="{ active: showArchived }" @click="showArchived = !showArchived" :title="t('archive')">📦</button>
                <button class="header-icon-btn" :class="{ active: multiSelectMode }" @click="multiSelectMode = !multiSelectMode" :title="t('multiSelect')">☑</button>
                <div class="search-box-wrapper">
                  <span class="search-icon">🔍</span>
                  <input type="text" class="search-box" :value="searchQuery" @input="onSearchInput" :placeholder="t('searchPlaceholder')" />
                  <button v-if="searchQuery" class="search-clear" @click="clearSearch" :title="t('clearSearch')">×</button>
                </div>
                <div style="position:relative" @click.stop>
                  <button class="add-btn" @click="showAddTodoMenu = !showAddTodoMenu" :title="t('addTodo')">+</button>
                  <div v-if="showAddTodoMenu" class="add-dropdown" @mouseleave="showAddTodoMenu = false">
                    <button class="add-dropdown-item" @click="showAddTodoMenu = false; showNewTodoEditor()">✓ {{ t('addInSidebar') }}</button>
                    <button class="add-dropdown-item" @click="showAddTodoMenu = false; createTodoInWindow()">🪟 {{ t('addInWindow') }}</button>
                  </div>
                </div>
              </div>

              <!-- Batch action bar for todos -->
              <div v-if="multiSelectMode && currentTab === 'todos'" class="batch-action-bar">
                <span class="batch-count">{{ t('selectedCount').replace('{n}', selectedIds.size) }}</span>
                <button class="btn btn-secondary" @click="selectAll">{{ t('selectAll') }}</button>
                <button class="btn btn-secondary" style="color:var(--danger)" @click="batchDelete">{{ t('batchDelete') }}</button>
                <button class="btn btn-secondary" @click="batchArchive">{{ t('batchArchive') }}</button>
                <button class="btn btn-secondary" @click="exitMultiSelect">{{ t('exitMultiSelect') }}</button>
              </div>
              
              <div v-if="showingEditor" class="editor-wrapper">
                <TodoEditor 
                  :todo="editingTodo"
                  :notes="notes"
                  @close="hideEditor"
                  @saved="onTodoSaved"
                />
              </div>
              <div v-else class="content-scroll">
                <FilterBar 
                  :current-filter="todoFilter"
                  :priority-filter="priorityFilter"
                  :tag-filter="tagFilter"
                  :all-tags="allTags"
                  @filter-change="todoFilter = $event"
                  @priority-change="priorityFilter = $event"
                  @tag-change="tagFilter = $event"
                />
                <TodoList 
                  :todos="todos"
                  :current-filter="todoFilter"
                  :priority-filter="priorityFilter"
                  :grouping="groupingMode"
                  :search-query="debouncedSearchQuery"
                  :tag-filter="tagFilter"
                  :show-archived="showArchived"
                  :multi-select-mode="multiSelectMode"
                  :selected-ids="selectedIds"
                  @edit="editTodo"
                  @refresh="loadAll"
                  @deleted="onItemDeleted"
                  @archive="archiveTodo"
                  @restore="restoreTodo"
                  @toggle-select="toggleSelect"
                  @context-menu="showTodoContextMenu"
                />
              </div>
            </template>
            
            <!-- Timeline Tab -->
            <template v-if="currentTab === 'timeline'">
              <div class="content-header">
                <div class="content-title">{{ t('tabTimeline') }}</div>
              </div>
              <TimelineView :notes="notes" :todos="todos" />
            </template>

            <!-- Calendar Tab -->
            <template v-if="currentTab === 'calendar'">
              <CalendarView :todos="todos" @edit-todo="editTodo" />
            </template>

            <!-- Board Tab -->
            <template v-if="currentTab === 'board'">
              <div class="content-header">
                <div class="content-title">{{ t('tabBoard') }}</div>
              </div>
              <BoardView :notes="notes" :search-query="debouncedSearchQuery" @edit="editNote" @refresh="loadAll" />
            </template>

            <!-- Trash Tab (Recycle Bin) -->
            <template v-if="currentTab === 'trash'">
              <div class="content-header">
                <div class="content-title">🗑 {{ t('trash') }}</div>
              </div>
              <div class="trash-container">
                <div class="trash-hint">{{ t('autoPurgeHint') }}</div>
                <div v-if="trashList.notes.length === 0 && trashList.todos.length === 0" class="empty-state">
                  <div class="empty-text">{{ t('trashEmpty') }}</div>
                </div>
                <template v-else>
                  <div v-for="note in trashList.notes" :key="'tn'+note.id" class="trash-item">
                    <span class="trash-item-type">📝</span>
                    <span class="trash-item-title">{{ note.title || t('noteTitle') }}</span>
                    <span class="trash-item-date">{{ formatDateStr(note.deleted_at) }}</span>
                    <button class="trash-btn restore" @click="restoreFromTrash('note', note.id)">↩</button>
                    <button class="trash-btn delete" @click="permanentlyDelete('note', note.id)">✕</button>
                  </div>
                  <div v-for="todo in trashList.todos" :key="'tt'+todo.id" class="trash-item">
                    <span class="trash-item-type">✓</span>
                    <span class="trash-item-title">{{ todo.title || t('todoTitlePlaceholder') }}</span>
                    <span class="trash-item-date">{{ formatDateStr(todo.deleted_at) }}</span>
                    <button class="trash-btn restore" @click="restoreFromTrash('todo', todo.id)">↩</button>
                    <button class="trash-btn delete" @click="permanentlyDelete('todo', todo.id)">✕</button>
                  </div>
                </template>
              </div>
            </template>
          </div>
          
          <!-- Right-click context menu for NoteList/TodoList -->
          <div v-if="appContextMenu.visible" class="context-menu" :style="{ top: appContextMenu.y + 'px', left: appContextMenu.x + 'px' }" @mouseleave="appContextMenu.visible = false" @click.stop>
            <button class="ctx-item" @click="appCtxAction('popOut')">🪟 {{ t('popOutNote') }}</button>
            <button class="ctx-item" @click="appCtxAction('edit')">✎ {{ t('edit') }}</button>
            <div class="ctx-sep"></div>
      <button v-if="appContextMenu.item && appContextMenu.itemType === 'todo'" class="ctx-item" @click="appCtxAction('toggle')">✓ {{ t('toggleTodo') }}</button>
      <button class="ctx-item" @click="appCtxAction('duplicate')">⧉ {{ t('duplicateNote') }}</button>
      <button class="ctx-item" @click="appCtxAction('color')">🎨 {{ t('color') }}</button>
            <div v-if="appContextMenu.showColors" class="ctx-color-row">
              <div v-for="c in NOTE_COLORS" :key="c.value" class="ctx-color-dot" :style="{ backgroundColor: 'var(--color-note-' + c.value + ')' }" @click="appCtxChangeColor(c.value)"></div>
            </div>
            <div class="ctx-sep"></div>
            <button class="ctx-item" @click="appCtxAction('archive')">📦 {{ t('archive') }}</button>
            <button class="ctx-item ctx-danger" @click="appCtxAction('delete')">✕ {{ t('delete') }}</button>
          </div>

          <!-- Collapse Toggle -->
          <button
            class="collapse-toggle"
            @click="toggleCollapse"
            :title="isCollapsed ? t('expand') : t('collapse')"
          >
            {{ isCollapsed ? '←' : '→' }}
          </button>
          <!-- Pomodoro Widget -->
          <div class="pomodoro-widget">
            <span>⏱</span>
            <span class="pomodoro-time">{{ pomodoroMinutes }}:{{ pomodoroSecondsDisplay }}</span>
            <button class="pomodoro-btn" @click="pomodoroRunning ? pausePomodoro() : startPomodoro()">{{ pomodoroRunning ? t('pomodoroPause') : t('pomodoroStart') }}</button>
            <button class="pomodoro-btn" @click="resetPomodoro">{{ t('pomodoroReset') }}</button>
          </div>
          <!-- Footer Copyright -->
          <div class="sidebar-footer">©JIE_SUN孙胜杰 · v2.0</div>
        </div>
      </div>

      <!-- Command Palette -->
<div v-if="showCommandPalette" class="command-palette-overlay" @click.self="showCommandPalette = false">
<div class="command-palette-modal" role="dialog" aria-modal="true" :aria-label="t('cmdPlaceholder')">
          <input class="command-palette-input" v-model="commandQuery" :placeholder="t('cmdPlaceholder')" ref="commandInput" @keydown="onCommandKeydown" />
          <div class="command-palette-results">
            <div v-for="(item, idx) in commandResults" :key="item.key"
              class="command-palette-item" :class="{ selected: commandSelectedIdx === idx }"
              @click="executeCommand(item)"
              @mouseenter="commandSelectedIdx = idx"
            >
              <span class="command-palette-icon">{{ item.icon }}</span>
              <span class="command-palette-label">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- R3-02: Undo toast — shows delete hint and permanent-delete failure -->
      <div v-if="undoToast" class="undo-toast">{{ undoToast }}</div>

      <!-- Settings Modal -->
<div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
<div class="settings-modal" @keydown="onShortcutKeydown" role="dialog" aria-modal="true" :aria-label="t('settings')">
          <div class="settings-header">
            <span class="settings-title">{{ t('settings') }}</span>
            <button class="settings-close" @click="showSettings = false">×</button>
          </div>
          <div class="settings-body">
            <!-- Language -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('language') }}</div>
              <div class="settings-radio-group">
                <label class="settings-radio"><input type="radio" value="zh" v-model="locale" @change="setLocale(locale)" /> 中文</label>
                <label class="settings-radio"><input type="radio" value="en" v-model="locale" @change="setLocale(locale)" /> English</label>
                <label class="settings-radio"><input type="radio" value="vi" v-model="locale" @change="setLocale(locale)" /> Tiếng Việt</label>
              </div>
            </div>
            <!-- Shortcut -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('shortcut') }}</div>
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
              <div class="settings-section-title">{{ t('grouping') }}</div>
              <div class="settings-radio-group">
                <label class="settings-radio"><input type="radio" value="date" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByDate') }}</label>
                <label class="settings-radio"><input type="radio" value="alpha" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByAlpha') }}</label>
                <label class="settings-radio"><input type="radio" value="none" v-model="groupingMode" @change="onGroupingChange" /> {{ t('groupByNone') }}</label>
              </div>
            </div>
            <!-- Color Scheme -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('colorScheme') }}</div>
              <div class="settings-radio-group">
                <label class="settings-radio"><input type="radio" value="default" v-model="colorScheme" @change="setColorScheme('default')" /> {{ t('schemeDefault') }}</label>
                <label class="settings-radio"><input type="radio" value="windows" v-model="colorScheme" @change="setColorScheme('windows')" /> {{ t('schemeWindows') }}</label>
                <label class="settings-radio"><input type="radio" value="morandi" v-model="colorScheme" @change="setColorScheme('morandi')" /> {{ t('schemeMorandi') }}</label>
              </div>
            </div>
            <!-- Tab visibility -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('tabVisibility') }}</div>
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
            <!-- Backup -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('backup') }}</div>
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
                    <button class="btn btn-secondary" style="color:var(--danger)" @click="doDeleteBackup(b.path, b.name)">{{ t('backupDelete') }}</button>
                  </div>
                </div>
              </div>
              <div v-else class="backup-empty">{{ t('backupList') }}: —</div>
            </div>
            <!-- Import Data -->
            <div class="settings-section">
              <div class="settings-section-title">{{ t('importData') }}</div>
              <div class="import-row">
                <label class="import-label btn btn-secondary" for="import-file-input">{{ t('importSelect') }}</label>
                <input type="file" id="import-file-input" accept=".json" style="display:none" @change="onImportFile" />
                <span v-if="importResultMsg" class="import-result">{{ importResultMsg }}</span>
              </div>
            </div>
            <!-- Statistics -->
            <div class="settings-section stats-section">
              <div class="settings-section-title">{{ t('stats') }}</div>
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
      </template>
    </div>
  `,
  
  components: {
    NoteEditor,
    NoteList,
    TodoEditor,
    TodoList,
    FilterBar,
    CalendarView,
    BoardView,
    TimelineView,
    AllView
  },
  
  setup() {
    const currentTab = ref('all');
    const isCollapsed = ref(false);
    const showingEditor = ref(false);
    const editingNote = ref(null);
    const editingTodo = ref(null);
    const notes = ref([]);

    // ---- Trash / undo state ----
    const trashList = ref({ notes: [], todos: [] });
    const undoStack = ref([]); // [{type:'note'|'todo', id, ts}] for Ctrl+Z
    const undoToast = ref(''); // shows "Deleted, Ctrl+Z to undo" briefly
    const todos = ref([]);
    const todoFilter = ref('all');
    const priorityFilter = ref('all');
    const tagFilter = ref('');
    const theme = ref('dark');
    const opacity = ref(0.95);
    const alwaysOnTop = ref(false);
    const showLangMenu = ref(false);
    const showSettings = ref(false);
    const groupingMode = ref('none');
    const colorScheme = ref('default'); // default | windows | morandi

    // Tab visibility — all hidden by default for a clean UI; user enables in Settings.
    const showTabTimeline = ref(false);
    const showTabTrash = ref(false);
    const showTabCalendar = ref(false);
    const showTabBoard = ref(false);
    // Core tabs (all/notes/todos) default to visible
    const showTabAll = ref(true);
    const showTabNotes = ref(true);
    const showTabTodos = ref(true);

    const saveTabVisibility = async () => {
      // R2-05: Prevent hiding ALL core tabs — force at least one visible.
      if (!showTabAll.value && !showTabNotes.value && !showTabTodos.value) {
        showTabAll.value = true;
      }
      try {
        await window.electronAPI.sidebar.setState('tabTimeline', showTabTimeline.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabTrash', showTabTrash.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabCalendar', showTabCalendar.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabBoard', showTabBoard.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabAll', showTabAll.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabNotes', showTabNotes.value ? 'true' : 'false');
        await window.electronAPI.sidebar.setState('tabTodos', showTabTodos.value ? 'true' : 'false');
        // If the currently active tab was just hidden, fall back to a visible one.
        const fallback = showTabAll.value ? 'all' : showTabNotes.value ? 'notes' : showTabTodos.value ? 'todos' : 'all';
        if (currentTab.value === 'timeline' && !showTabTimeline.value) currentTab.value = fallback;
        if (currentTab.value === 'trash' && !showTabTrash.value) currentTab.value = fallback;
        if (currentTab.value === 'calendar' && !showTabCalendar.value) currentTab.value = fallback;
        if (currentTab.value === 'board' && !showTabBoard.value) currentTab.value = fallback;
        if (currentTab.value === 'all' && !showTabAll.value) currentTab.value = fallback;
        if (currentTab.value === 'notes' && !showTabNotes.value) currentTab.value = fallback;
        if (currentTab.value === 'todos' && !showTabTodos.value) currentTab.value = fallback;
      } catch (e) { console.error('saveTabVisibility failed:', e); }
    };
    const currentShortcut = ref('Super+Alt+S');
    const recordingShortcut = ref(false);
    const recordedShortcut = ref('');
    const searchQuery = ref('');
    // OPT-03: debounce search input to avoid re-filtering on every keystroke
    const debouncedSearchQuery = ref('');
    let searchTimer = null;
    const showArchived = ref(false);
    const multiSelectMode = ref(false);
    const selectedIds = ref(new Set());
    const showCommandPalette = ref(false);
    const commandQuery = ref('');
    const commandSelectedIdx = ref(0);
    const commandInput = ref(null);
    const pomodoroSeconds = ref(1500);
    const pomodoroRunning = ref(false);
    let pomodoroTimer = null;
    const importResultMsg = ref('');
    const onSearchInput = (e) => {
      searchQuery.value = e.target.value;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { debouncedSearchQuery.value = searchQuery.value; }, 200);
    };
    const clearSearch = () => {
      searchQuery.value = '';
      debouncedSearchQuery.value = '';
      if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
    };

    // Command Palette
    const commandResults = computed(() => {
      const q = commandQuery.value.toLowerCase();
      const commands = [
        { key: 'new-note', icon: '📝', label: t('cmdNewNote'), action: () => { showNewNoteEditor(); } },
        { key: 'new-todo', icon: '✅', label: t('cmdNewTodo'), action: () => { showNewTodoEditor(); } },
        { key: 'toggle-theme', icon: theme.value === 'dark' ? '☀' : '🌙', label: t('cmdToggleTheme'), action: () => { toggleTheme(); } },
        { key: 'export', icon: '⬇', label: t('cmdExportData'), action: () => { exportData(); } },
        { key: 'settings', icon: '⚙', label: t('cmdOpenSettings'), action: () => { showSettings.value = true; } },
        { key: 'archive', icon: '📦', label: t('cmdArchiveNotes'), action: () => { currentTab.value = 'notes'; showArchived.value = true; } }
      ];
      // Also add matching notes and todos
      const noteResults = notes.value.filter((n) => !q || (n.title || '').toLowerCase().includes(q)).slice(0, 5).map((n) => ({
        key: 'note-' + n.id, icon: '📝', label: n.title || t('noteTitle'), action: () => { editNote(n); }
      }));
      const todoResults = todos.value.filter((t) => !t.is_subtask && (!q || (t.title || '').toLowerCase().includes(q))).slice(0, 5).map((t) => ({
        key: 'todo-' + t.id, icon: '✅', label: t.title, action: () => { editTodo(t); }
      }));
      const all = [...commands.filter((c) => !q || c.label.toLowerCase().includes(q)), ...noteResults, ...todoResults];
      return all.slice(0, 20);
    });

    const onCommandKeydown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        commandSelectedIdx.value = Math.min(commandSelectedIdx.value + 1, commandResults.value.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commandSelectedIdx.value = Math.max(commandSelectedIdx.value - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (commandResults.value[commandSelectedIdx.value]) {
          executeCommand(commandResults.value[commandSelectedIdx.value]);
        }
      } else if (e.key === 'Escape') {
        showCommandPalette.value = false;
      }
    };

    const executeCommand = (item) => {
      showCommandPalette.value = false;
      commandQuery.value = '';
      if (item && item.action) item.action();
    };

    // Ctrl+P for command palette
    const onGlobalKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showCommandPalette.value = !showCommandPalette.value;
        if (showCommandPalette.value) {
          commandQuery.value = '';
          commandSelectedIdx.value = 0;
          nextTick(() => { if (commandInput.value) commandInput.value.focus(); });
        }
      }
      // Ctrl+Z: undo last deletion (restore from trash)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !showingEditor.value) {
        e.preventDefault();
        undoLastDelete();
      }
    };

    // ---- Trash / undo-delete ----
    const onItemDeleted = (item) => {
      if (!item || item.id == null) return;
      undoStack.value.push({ type: item.type, id: item.id, ts: Date.now() });
      // Show toast for 5 seconds
      undoToast.value = t('undoDelete');
      setTimeout(() => { if (undoToast.value === t('undoDelete')) undoToast.value = ''; }, 5000);
    };

    const undoLastDelete = async () => {
      if (undoStack.value.length === 0) return;
      const item = undoStack.value.pop();
      try {
        const restored = await window.electronAPI.trash.restore(item.type, item.id);
        if (!restored) {
          // R2-06: Item was permanently deleted — can't restore.
          undoToast.value = t('undoDeleteFailed');
          setTimeout(() => { undoToast.value = ''; }, 3000);
          return;
        }
        loadNotes();
        loadTodos();
        undoToast.value = '';
      } catch (e) {
        console.error('Undo delete failed:', e);
        // Put it back so user can retry
        undoStack.value.push(item);
      }
    };

    const loadTrash = async () => {
      try {
        trashList.value = await window.electronAPI.trash.list();
      } catch (e) {
        console.error('Failed to load trash:', e);
      }
    };

    const restoreFromTrash = async (type, id) => {
      try {
        await window.electronAPI.trash.restore(type, id);
        await loadTrash();
        loadNotes();
        loadTodos();
      } catch (e) { console.error('Restore failed:', e); }
    };

    const permanentlyDelete = async (type, id) => {
      if (!confirm(t('confirmPermanentDelete'))) return;
      try {
        await window.electronAPI.trash.delete(type, id);
        await loadTrash();
      } catch (e) { console.error('Permanent delete failed:', e); }
    };

    // Archive / Restore
    const archiveNote = async (note) => {
      try {
        await window.electronAPI.notes.update(note.id, { is_archived: 1 });
        if (note.is_pinned) await window.electronAPI.floatingNote.close(note.id);
        loadAll();
      } catch (_) {}
    };
    const restoreNote = async (note) => {
      try {
        await window.electronAPI.notes.update(note.id, { is_archived: 0 });
        loadAll();
      } catch (_) {}
    };
    const archiveTodo = async (todo) => {
      try {
        await window.electronAPI.todos.update(todo.id, { is_archived: 1 });
        loadAll();
      } catch (_) {}
    };
    const restoreTodo = async (todo) => {
      try {
        await window.electronAPI.todos.update(todo.id, { is_archived: 0 });
        loadAll();
      } catch (_) {}
    };

    // Duplicate Note
    const duplicateNote = async (note) => {
      try {
        await window.electronAPI.notes.create({
          title: (note.title || '') + ' (' + t('duplicateSuffix') + ')',
          content: note.content,
          color: note.color,
          tags: note.tags,
          is_pinned: 0
        });
        loadAll();
      } catch (_) {}
    };

    // Multi-select
    const toggleSelect = (id) => {
      const newSet = new Set(selectedIds.value);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      selectedIds.value = newSet;
    };
    const selectAll = () => {
      // BUG-10: Select only items not archived (visible items), not all DB records.
      const items = currentTab.value === 'notes'
        ? notes.value.filter((n) => n.is_archived !== 1 && n.deleted_at == null)
        : todos.value.filter((t) => t.is_archived !== 1 && t.deleted_at == null && !t.is_subtask);
      selectedIds.value = new Set(items.map((i) => i.id));
    };
    const batchDelete = async () => {
      if (!confirm(t('batchDelete') + '?')) return;
      const api = currentTab.value === 'notes' ? window.electronAPI.notes : window.electronAPI.todos;
      for (const id of selectedIds.value) {
        try { await api.delete(id); } catch (_) {}
      }
      selectedIds.value = new Set();
      loadAll();
    };
    const batchArchive = async () => {
      const api = currentTab.value === 'notes' ? window.electronAPI.notes : window.electronAPI.todos;
      for (const id of selectedIds.value) {
        try { await api.update(id, { is_archived: 1 }); } catch (_) {}
      }
      selectedIds.value = new Set();
      loadAll();
    };
    const batchColor = async (color) => {
      for (const id of selectedIds.value) {
        try { await window.electronAPI.notes.update(id, { color }); } catch (_) {}
      }
      selectedIds.value = new Set();
      loadAll();
    };
    const exitMultiSelect = () => {
      multiSelectMode.value = false;
      selectedIds.value = new Set();
    };

    // Pomodoro
    const pomodoroMinutes = computed(() => Math.floor(pomodoroSeconds.value / 60));
    const pomodoroSecondsDisplay = computed(() => String(pomodoroSeconds.value % 60).padStart(2, '0'));
    const startPomodoro = () => {
      if (pomodoroRunning.value) return;
      pomodoroRunning.value = true;
      pomodoroTimer = setInterval(() => {
        if (pomodoroSeconds.value <= 0) {
          pausePomodoro();
          // BUG-12: reset timer BEFORE showing alert to avoid blocking
          pomodoroSeconds.value = 1500;
          try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 800; osc.start(); osc.stop(ctx.currentTime + 0.2); } catch (_) {}
          setTimeout(() => alert(t('pomodoroComplete')), 100);
          return;
        }
        pomodoroSeconds.value--;
      }, 1000);
    };
    const pausePomodoro = () => {
      pomodoroRunning.value = false;
      if (pomodoroTimer) { clearInterval(pomodoroTimer); pomodoroTimer = null; }
    };
    const resetPomodoro = () => {
      pausePomodoro();
      pomodoroSeconds.value = 1500;
    };

    // Data Import
    const onImportFile = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await window.electronAPI.data.importFromFile(data);
        importResultMsg.value = t('importResult') + ' ' + (result.notesImported || 0) + ' notes, ' + (result.todosImported || 0) + ' todos';
        loadNotes();
        loadTodos();
      } catch (err) {
        importResultMsg.value = t('importError') + ': ' + (err.message || '');
      }
      e.target.value = '';
    };
    const reminders = ref([]);
    const backupList = ref([]);
    let reminderInterval = null;

    const allTags = computed(() => {
      const tagSet = new Set();
      for (const note of notes.value) {
        if (note.tags) note.tags.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => tagSet.add(t));
      }
      for (const todo of todos.value) {
        if (todo.tags) todo.tags.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => tagSet.add(t));
      }
      return Array.from(tagSet).sort();
    });

    const setLocale = async (val) => {
      locale.value = val;
      showLangMenu.value = false;
      document.documentElement.dataset.locale = val;
      try {
        await window.electronAPI.sidebar.setState('locale', val);
      } catch (error) {
        console.error('Failed to save locale:', error);
      }
    };

    const onGroupingChange = async () => {
      try {
        await window.electronAPI.sidebar.setState('grouping', groupingMode.value);
      } catch (error) {
        console.error('Failed to save grouping:', error);
      }
    };

    const startRecording = () => {
      recordingShortcut.value = true;
      recordedShortcut.value = '';
    };

    const onShortcutKeydown = (e) => {
      if (!recordingShortcut.value) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) return;
      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return;
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Super');
      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName.length === 1) keyName = keyName.toUpperCase();
      parts.push(keyName);
      recordedShortcut.value = parts.join('+');
    };

    const saveShortcut = async () => {
      if (!recordedShortcut.value) return;
      const res = await window.electronAPI.shortcut.set(recordedShortcut.value);
      if (res && res.ok) {
        currentShortcut.value = recordedShortcut.value;
        recordingShortcut.value = false;
        recordedShortcut.value = '';
      } else {
        alert(res?.error || 'Failed');
      }
    };

    // Floating note mode: when this window was opened with a noteId via
    // additionalArguments, preload.js exposes it as window.electronAPI.noteId.
    // In that case we render a single-note view instead of the full sidebar.
    const isFloatingNote = ref(
      typeof window !== 'undefined' &&
      !!window.electronAPI &&
      window.electronAPI.noteId != null
    );
    // B1: floatingDirty at setup scope so all functions (including onMounted callback) can access it.
    const floatingDirty = ref(false);
    const floatingNoteId = ref(isFloatingNote.value ? window.electronAPI.noteId : null);
    const floatingNote = ref(null);
    const floatingNoteSaving = ref(false);
    // Initial always-on-top state for this floating window (passed by main.js
    // via additionalArguments). The user can toggle it from the floating toolbar.
    const floatingOnTop = ref(
      typeof window !== 'undefined' &&
      !!window.electronAPI &&
      window.electronAPI.noteOnTop === true
    );

    // ---- Floating Todo window state ----
    const isFloatingTodo = ref(
      typeof window !== 'undefined' &&
      !!window.electronAPI &&
      window.electronAPI.todoId != null
    );
    const floatingTodoId = ref(isFloatingTodo.value ? window.electronAPI.todoId : null);
    const floatingTodo = ref(null);
    const floatingTodoSaving = ref(false);
    const floatingTodoOnTop = ref(
      typeof window !== 'undefined' &&
      !!window.electronAPI &&
      window.electronAPI.todoOnTop === true
    );

    // Load sidebar state on mount (sidebar mode only; floating notes skip this).
    onMounted(async () => {
      // Restore theme + color scheme for ALL windows (including floating).
      try {
        const savedTheme = await window.electronAPI.sidebar.getState('theme');
        if (savedTheme) {
          theme.value = savedTheme;
          document.documentElement.dataset.theme = savedTheme;
        }
        const savedScheme = await window.electronAPI.sidebar.getState('colorScheme');
        if (savedScheme && ['default','windows','morandi'].includes(savedScheme)) {
          colorScheme.value = savedScheme;
          document.documentElement.dataset.colorScheme = savedScheme;
        }
      } catch (e) { console.error('Failed to restore theme/scheme:', e); }

      // Listen for settings changes broadcast from other windows (theme, colorScheme).
      // Applies to ALL windows including floating note/todo windows.
      if (window.electronAPI.settings && window.electronAPI.settings.onChanged) {
        window.electronAPI.settings.onChanged((payload) => {
          if (!payload) return;
          if (payload.key === 'theme' && payload.value) {
            theme.value = payload.value;
            document.documentElement.dataset.theme = payload.value;
          }
          if (payload.key === 'colorScheme' && payload.value) {
            colorScheme.value = payload.value;
            document.documentElement.dataset.colorScheme = payload.value;
          }
        });
      }

      // Listen for data changes broadcast from other windows — refresh floating window content.
      // B1: floatingDirty moved to setup scope (not onMounted closure) so all functions can access it.
      let dataChangedTimer = null;
      if (window.electronAPI.data && window.electronAPI.data.onChanged) {
        window.electronAPI.data.onChanged(() => {
          if (floatingDirty.value) return; // B1: skip all reloads while editing
          if (isFloatingNote.value) {
            loadFloatingNote();
          } else if (isFloatingTodo.value) {
            loadFloatingTodo();
          } else {
            if (dataChangedTimer) clearTimeout(dataChangedTimer);
            dataChangedTimer = setTimeout(() => { loadNotes(); loadTodos(); }, 200);
          }
        });
      }

      if (isFloatingNote.value) {
        await loadFloatingNote();
        return;
      }
      if (isFloatingTodo.value) {
        await loadFloatingTodo();
        return;
      }

      try {
        const state = await window.electronAPI.sidebar.getState('collapsed');
        if (state !== null && state !== undefined) {
          isCollapsed.value = (state === true) || (state === 'true');
        }
        // Theme already restored above — skip duplicate read.
        const savedOpacity = await window.electronAPI.sidebar.getState('opacity');
        if (savedOpacity != null) {
          opacity.value = parseFloat(savedOpacity);
        }
        if (window.electronAPI.window && window.electronAPI.window.setOpacity) {
          await window.electronAPI.window.setOpacity(opacity.value);
        }
        // Restore always-on-top state
        const savedOnTop = await window.electronAPI.sidebar.getState('alwaysOnTop');
        if (savedOnTop === 'true') {
          alwaysOnTop.value = true;
          await window.electronAPI.window.setAlwaysOnTop(true);
        }
        const savedLocale = await window.electronAPI.sidebar.getState('locale');
        if (savedLocale && I18N[savedLocale]) {
          locale.value = savedLocale;
          document.documentElement.dataset.locale = savedLocale;
        }
        const savedGrouping = await window.electronAPI.sidebar.getState('grouping');
        if (savedGrouping) {
          groupingMode.value = savedGrouping;
        }
        // Color scheme already restored above (before floating window early return).
        // Load tab visibility settings (default: all hidden)
        const sTL = await window.electronAPI.sidebar.getState('tabTimeline');
        if (sTL === 'true') showTabTimeline.value = true;
        const sTT = await window.electronAPI.sidebar.getState('tabTrash');
        if (sTT === 'true') showTabTrash.value = true;
        const sTC = await window.electronAPI.sidebar.getState('tabCalendar');
        if (sTC === 'true') showTabCalendar.value = true;
        const sTB = await window.electronAPI.sidebar.getState('tabBoard');
        if (sTB === 'true') showTabBoard.value = true;
        // Core tabs default to true; only hide if explicitly set to 'false'
        const sTA = await window.electronAPI.sidebar.getState('tabAll');
        if (sTA === 'false') showTabAll.value = false;
        const sTN = await window.electronAPI.sidebar.getState('tabNotes');
        if (sTN === 'false') showTabNotes.value = false;
        const sTD = await window.electronAPI.sidebar.getState('tabTodos');
        if (sTD === 'false') showTabTodos.value = false;
        const savedShortcut = await window.electronAPI.sidebar.getState('shortcut');
        if (savedShortcut) {
          currentShortcut.value = savedShortcut;
        }
        const width = isCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
        await window.electronAPI.sidebar.resize(width);
      } catch (error) {
        console.error('Failed to load sidebar state:', error);
      }

      await Promise.all([loadNotes(), loadTodos()]);

      // data:changed listener already set up above (before floating window early return).
      // Start reminder check interval
      const checkReminders = async () => {
        try {
          if (window.electronAPI.reminder && window.electronAPI.reminder.check) {
            const dueSoon = await window.electronAPI.reminder.check();
            if (Array.isArray(dueSoon)) {
              reminders.value = dueSoon;
            }
          }
        } catch (_) {}
      };
      await checkReminders();
      reminderInterval = setInterval(checkReminders, 60 * 1000);

      // Register global keyboard shortcut for command palette
      document.addEventListener('keydown', onGlobalKeydown);
    });

    // Watch for collapse changes (sidebar mode only — floating notes never persist collapse)
    watch(isCollapsed, async (newValue) => {
      if (isFloatingNote.value) return;
      try {
        await window.electronAPI.sidebar.setState('collapsed', newValue);
        // Physically resize window on collapse state change
        const width = newValue ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
        await window.electronAPI.sidebar.resize(width);
      } catch (error) {
        console.error('Failed to save sidebar state:', error);
      }
    });

    onBeforeUnmount(() => {
      if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
      if (pomodoroTimer) { clearInterval(pomodoroTimer); pomodoroTimer = null; }
      // R3-10: Clear floating save timers to prevent saves after unmount
      if (floatingSaveTimer) { clearTimeout(floatingSaveTimer); floatingSaveTimer = null; }
      if (floatingTodoSaveTimer) { clearTimeout(floatingTodoSaveTimer); floatingTodoSaveTimer = null; }
      if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
      document.removeEventListener('keydown', onGlobalKeydown);
    });
    
    const loadNotes = async () => {
      try {
        notes.value = await window.electronAPI.notes.getAll();
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    
    const loadTodos = async () => {
      try {
        todos.value = await window.electronAPI.todos.getAll();
      } catch (error) {
        console.error('Failed to load todos:', error);
      }
    };

    // Refresh both notes and todos — used by AllView for real-time updates.
    const loadAll = async () => {
      // OPT-01: Load notes and todos in parallel for faster refresh.
      await Promise.all([loadNotes(), loadTodos()]);
    };

    const floatingEditorContent = ref(null);

    // Fetch just the single note this floating window represents.
    const loadFloatingNote = async () => {
      if (floatingNoteId.value == null) return;
      try {
        // OPT-07: O(1) getById instead of O(n) getAll+find
        floatingNote.value = await window.electronAPI.notes.getById(floatingNoteId.value);
        // B5: If note was deleted (getById returns null), close this floating window.
        if (!floatingNote.value) {
          try { await window.electronAPI.floatingNote.close(floatingNoteId.value); } catch (_) {}
          return;
        }
        // After Vue updates, populate the contenteditable with HTML content
        await nextTick();
        if (floatingEditorContent.value && floatingNote.value) {
          floatingEditorContent.value.innerHTML = floatingNote.value.content || '';
        }
      } catch (error) {
        console.error('Failed to load floating note:', error);
      }
    };

    // Persist edits from the floating note view back to the DB.
    const saveFloatingNote = async () => {
      if (!floatingNote.value || floatingNoteSaving.value) return;
      floatingNoteSaving.value = true;
      try {
        await window.electronAPI.notes.update(floatingNote.value.id, {
          title: floatingNote.value.title,
          content: floatingNote.value.content,
        });
        // B1: Clear dirty after successful save — next data:changed will reload.
        floatingDirty.value = false;
      } catch (error) {
        console.error('Failed to save floating note:', error);
      } finally {
        floatingNoteSaving.value = false;
      }
    };

    // OPT-06: debounced auto-save so content persists even without blur
    let floatingSaveTimer = null;
    const scheduleFloatingSave = () => {
      if (floatingSaveTimer) clearTimeout(floatingSaveTimer);
      floatingSaveTimer = setTimeout(() => saveFloatingNote(), 1500);
    };
    
    const onFloatingContentInput = () => {
      if (!floatingNote.value || !floatingEditorContent.value) return;
      floatingNote.value.content = floatingEditorContent.value.innerHTML;
      floatingDirty.value = true; // B1: mark dirty — skip reloads while editing
      scheduleFloatingSave();  // auto-save 1.5s after last keystroke
    };

    const onFloatingContentPaste = (e) => {
      // Allow default paste, but if clipboard has an image, insert as base64
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) insertImageFileToFloating(file);
          return;
        }
      }
      // Default: let browser paste text/HTML
    };

    const onFloatingContentDrop = (e) => {
      // BUG-05: Only preventDefault if there are image files; let non-image drops use default behavior.
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;
      let hasImage = false;
      for (const file of files) {
        if (file.type.startsWith('image/')) { hasImage = true; break; }
      }
      if (!hasImage) return; // Let browser handle non-image drops
      e.preventDefault();
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          insertImageFileToFloating(file);
        }
      }
    };

    const insertImageFileToFloating = async (file) => {
      const compressed = await compressImageFile(file);  // OPT-04: shared util, returns null on error
      if (!compressed) return;
      if (floatingEditorContent.value) {
        floatingEditorContent.value.focus();
        const imgEl = document.createElement('img');
        imgEl.src = compressed;
        imgEl.style.maxWidth = '100%';
        imgEl.style.height = 'auto';
        imgEl.addEventListener('dblclick', () => { imgEl.style.width = ''; imgEl.style.height = ''; onFloatingContentInput(); });
        floatingEditorContent.value.appendChild(imgEl);
        onFloatingContentInput();
      }
    };

    // Insert image via hidden file input (floating note window).
    const insertImageFloating = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) insertImageFileToFloating(file);
      };
      input.click();
    };

    // Resize selected image in floating note (−10% / +10%, double-click resets).
    const _resizeSelectedImage = (editorRef, saveFn) => {
      const sel = window.getSelection();
      if (!sel || !sel.focusNode) return;
      let node = sel.focusNode;
      // walk up to find an <img> inside the editor
      while (node && node !== editorRef.value) {
        if (node.nodeType === 1 && node.tagName === 'IMG') break;
        node = node.parentNode;
      }
      if (!node || node === editorRef.value) {
        // fallback: find last img in editor
        const imgs = editorRef.value ? editorRef.value.querySelectorAll('img') : [];
        if (imgs.length) node = imgs[imgs.length - 1]; else return;
      }
      if (node.tagName !== 'IMG') return;
      const curW = node.offsetWidth || 200;
      return curW;
    };

    const shrinkImageFloating = () => {
      if (!floatingEditorContent.value) return;
      const imgs = floatingEditorContent.value.querySelectorAll('img');
      if (!imgs.length) return;
      const img = imgs[imgs.length - 1];
      const cur = img.offsetWidth || 200;
      img.style.width = Math.max(40, Math.round(cur * 0.9)) + 'px';
      img.style.height = 'auto';
      onFloatingContentInput();
    };

    const enlargeImageFloating = () => {
      if (!floatingEditorContent.value) return;
      const imgs = floatingEditorContent.value.querySelectorAll('img');
      if (!imgs.length) return;
      const img = imgs[imgs.length - 1];
      const cur = img.offsetWidth || 200;
      img.style.width = Math.min(800, Math.round(cur * 1.1)) + 'px';
      img.style.height = 'auto';
      onFloatingContentInput();
    };

    // ---- Floating todo image functions ----
    const insertImageFloatingTodo = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const compressed = await compressImageFile(file);
        if (!compressed) return;
        if (floatingTodoContent.value) {
          floatingTodoContent.value.focus();
          const imgEl = document.createElement('img');
          imgEl.src = compressed;
          imgEl.style.maxWidth = '100%';
          imgEl.style.height = 'auto';
          imgEl.addEventListener('dblclick', () => { imgEl.style.width = ''; imgEl.style.height = ''; onFloatingTodoInput(); });
          floatingTodoContent.value.appendChild(imgEl);
          onFloatingTodoInput();
        }
      };
      input.click();
    };

    const shrinkImageFloatingTodo = () => {
      if (!floatingTodoContent.value) return;
      const imgs = floatingTodoContent.value.querySelectorAll('img');
      if (!imgs.length) return;
      const img = imgs[imgs.length - 1];
      const cur = img.offsetWidth || 200;
      img.style.width = Math.max(40, Math.round(cur * 0.9)) + 'px';
      img.style.height = 'auto';
      onFloatingTodoInput();
    };

    const enlargeImageFloatingTodo = () => {
      if (!floatingTodoContent.value) return;
      const imgs = floatingTodoContent.value.querySelectorAll('img');
      if (!imgs.length) return;
      const img = imgs[imgs.length - 1];
      const cur = img.offsetWidth || 200;
      img.style.width = Math.min(800, Math.round(cur * 1.1)) + 'px';
      img.style.height = 'auto';
      onFloatingTodoInput();
    };

    const onFloatingNoteBlur = () => {
      // Debounce-free immediate save; better-sqlite3 is synchronous so this is cheap.
      saveFloatingNote();
    };

    const closeFloatingNote = async () => {
      if (floatingNoteId.value == null) return;
      try {
        if (floatingEditorContent.value && floatingNote.value) {
          floatingNote.value.content = floatingEditorContent.value.innerHTML;
        }
        await saveFloatingNote();
        // Auto-clean: if the note is completely empty (no title + no text + no images), soft-delete it
        // C-12: Preserve notes that contain only images — check img tag before stripping HTML.
        if (floatingNote.value) {
          const title = (floatingNote.value.title || '').trim();
          const raw = floatingNote.value.content || '';
          const contentText = raw.replace(/<[^>]*>/g, '').trim();
          const hasImage = /<img\b/i.test(raw);
          if (!title && !contentText && !hasImage) {
            await window.electronAPI.notes.delete(floatingNote.value.id);
          }
        }
      } catch (e) {
        console.error('Pre-close save failed:', e);
      }
      try {
        await window.electronAPI.floatingNote.close(floatingNoteId.value);
      } catch (error) {
        console.error('Failed to close floating note:', error);
      }
    };

    // Toggle always-on-top on this floating window. Targets the sender
    // window via BrowserWindow.fromWebContents in main.js, so each
    // floating note keeps its own always-on-top state.
    const toggleFloatingOnTop = async () => {
      const next = !floatingOnTop.value;
      try {
        const res = await window.electronAPI.floatingNote.setAlwaysOnTop(next);
        if (res && res.alwaysOnTop === next) {
          floatingOnTop.value = next;
        } else if (res && res.error) {
          console.error('setAlwaysOnTop failed:', res.error);
        }
      } catch (error) {
        console.error('Failed to toggle floating always-on-top:', error);
      }
    };

    // ---- Floating note format toolbar ----
    // execCommand on the focused contenteditable. mousedown.prevent keeps
    // the selection in the editor so the command applies correctly.
    const formatCmd = (cmd) => {
      try {
        if (floatingEditorContent.value) floatingEditorContent.value.focus();
        document.execCommand(cmd, false, null);
        if (floatingNote.value && floatingEditorContent.value) {
          floatingNote.value.content = floatingEditorContent.value.innerHTML;
          scheduleFloatingSave();
        }
      } catch (e) {
        console.error('formatCmd failed:', e);
      }
    };

    const showColorPicker = ref(false);
    const toggleColorPicker = () => { showColorPicker.value = !showColorPicker.value; };

    // Change the note's color — updates DB + live window background.
    const changeNoteColor = async (color) => {
      if (!floatingNote.value) return;
      try {
        floatingNote.value.color = color;
        // C-11/C-24: color change is instant UI update, no dirty flag needed
        await window.electronAPI.notes.update(floatingNote.value.id, { color });
        showColorPicker.value = false;
      } catch (e) {
        console.error('changeNoteColor failed:', e);
      }
    };

    // Create a new todo and open it in an independent window.
    const createTodoInWindow = async () => {
      let newTodo = null;
      try {
        newTodo = await window.electronAPI.todos.create({ title: '', note_id: null });
        if (newTodo && newTodo.id) {
          const res = await window.electronAPI.floatingTodo.create(newTodo.id, { alwaysOnTop: false });
          if (res && res.error) {
            // BUG-06: Window failed to open — clean up the ghost record.
            await window.electronAPI.todos.delete(newTodo.id);
          }
        }
      } catch (e) {
        console.error('createTodoInWindow failed:', e);
        // BUG-06: Clean up ghost record on exception.
        if (newTodo && newTodo.id) {
          try { await window.electronAPI.todos.delete(newTodo.id); } catch (_) {}
        }
      }
    };

    // ---- Floating todo window logic ----
    const floatingTodoContent = ref(null);
    // Todo window color (separate ref so we can change it live without reload).
    // Defaults to blue; loaded from DB in loadFloatingTodo.
    const floatingTodoColor = ref('blue');
    const showTodoColorPicker = ref(false);

    const loadFloatingTodo = async () => {
      if (floatingTodoId.value == null) return;
      try {
        floatingTodo.value = await window.electronAPI.todos.getById(floatingTodoId.value);
        // B5: If todo was deleted, close this floating window.
        if (!floatingTodo.value) {
          try { await window.electronAPI.floatingTodo.close(floatingTodoId.value); } catch (_) {}
          return;
        }
        if (floatingTodo.value && floatingTodo.value.color) {
          floatingTodoColor.value = getColorName(floatingTodo.value.color);
        }
        // P0: Cache initial completed state for 0→1 edge detection in saveFloatingTodo.
        if (floatingTodo.value) {
          floatingTodo.value._prevCompleted = floatingTodo.value.completed === 1 || floatingTodo.value.completed === true;
        }
        await nextTick();
        if (floatingTodoContent.value && floatingTodo.value) {
          floatingTodoContent.value.innerHTML = floatingTodo.value.content || '';
        }
      } catch (error) {
        console.error('Failed to load floating todo:', error);
      }
    };

    const saveFloatingTodo = async () => {
      if (!floatingTodo.value || floatingTodoSaving.value) return;
      floatingTodoSaving.value = true;
      try {
        const updateData = {
          title: floatingTodo.value.title,
          completed: floatingTodo.value.completed,
          priority: floatingTodo.value.priority,
          due_date: floatingTodo.value.due_date,
          content: floatingTodo.value.content,
        };
        // D4/P0: Only set last_completed_at on the 0→1 transition (completion edge),
        // NOT on every save — otherwise editing a completed todo resets the timer
        // and repeat tasks never reset (elapsedHours stays < 24).
        const prevCompleted = floatingTodo.value._prevCompleted;
        const currCompleted = floatingTodo.value.completed === 1 || floatingTodo.value.completed === true;
        if (currCompleted && !prevCompleted) {
          updateData.last_completed_at = new Date().toISOString();
        }
        floatingTodo.value._prevCompleted = currCompleted; // cache for next save
        await window.electronAPI.todos.update(floatingTodo.value.id, updateData);
        // B1: Clear dirty after successful save.
        floatingDirty.value = false;
      } catch (error) {
        console.error('Failed to save floating todo:', error);
      } finally {
        floatingTodoSaving.value = false;
      }
    };

    let floatingTodoSaveTimer = null;
    const scheduleFloatingTodoSave = () => {
      if (floatingTodoSaveTimer) clearTimeout(floatingTodoSaveTimer);
      floatingTodoSaveTimer = setTimeout(() => saveFloatingTodo(), 1500);
    };

    const onFloatingTodoInput = () => {
      if (!floatingTodo.value || !floatingTodoContent.value) return;
      floatingTodo.value.content = floatingTodoContent.value.innerHTML;
      floatingDirty.value = true; // B1: mark dirty
      scheduleFloatingTodoSave();
    };

    const onFloatingTodoChange = () => {
      saveFloatingTodo();
    };

    const closeFloatingTodo = async () => {
      if (floatingTodoId.value == null) return;
      try {
        if (floatingTodoContent.value && floatingTodo.value) {
          floatingTodo.value.content = floatingTodoContent.value.innerHTML;
        }
        await saveFloatingTodo();
        // Auto-clean: if the todo is completely empty (no title + no content), soft-delete it
        if (floatingTodo.value) {
          const title = (floatingTodo.value.title || '').trim();
          const contentText = (floatingTodo.value.content || '').replace(/<[^>]*>/g, '').trim();
          if (!title && !contentText) {
            await window.electronAPI.todos.delete(floatingTodo.value.id);
          }
        }
      } catch (e) {
        console.error('Pre-close save failed:', e);
      }
      try {
        await window.electronAPI.floatingTodo.close(floatingTodoId.value);
      } catch (error) {
        console.error('Failed to close floating todo:', error);
      }
    };

    const toggleFloatingTodoOnTop = async () => {
      const next = !floatingTodoOnTop.value;
      try {
        const res = await window.electronAPI.floatingTodo.setAlwaysOnTop(next);
        if (res && res.alwaysOnTop === next) {
          floatingTodoOnTop.value = next;
        }
      } catch (error) {
        console.error('Failed to toggle todo always-on-top:', error);
      }
    };

    // Format commands for the todo notes area.
    const formatTodoCmd = (cmd) => {
      try {
        if (floatingTodoContent.value) floatingTodoContent.value.focus();
        document.execCommand(cmd, false, null);
        if (floatingTodo.value && floatingTodoContent.value) {
          floatingTodo.value.content = floatingTodoContent.value.innerHTML;
          scheduleFloatingTodoSave();
        }
      } catch (e) { console.error('formatTodoCmd failed:', e); }
    };

    const toggleTodoColorPicker = () => { showTodoColorPicker.value = !showTodoColorPicker.value; };

    const changeTodoColor = async (color) => {
      floatingTodoColor.value = color;
      if (floatingTodo.value) {
        try {
          await window.electronAPI.todos.update(floatingTodo.value.id, { color });
        } catch (e) {
          console.error('changeTodoColor failed:', e);
        }
      }
      showTodoColorPicker.value = false;
    };
    
    const showNewNoteEditor = () => {
      editingNote.value = null;
      showingEditor.value = true;
    };

    // Create a new note directly as an independent floating window.
    const showAddNoteMenu = ref(false);
    const allFilter = ref('all');
    const showNoteAddMenu = ref(false);
    const showTodoAddMenu = ref(false);
    const createNoteInWindow = async () => {
      let newNote = null;
      try {
        newNote = await window.electronAPI.notes.create({ title: '', content: '', color: 'yellow' });
        if (newNote && newNote.id) {
          const res = await window.electronAPI.floatingNote.create(newNote.id, { alwaysOnTop: false });
          if (res && res.error) {
            // BUG-06: Window failed to open — clean up the ghost record.
            await window.electronAPI.notes.delete(newNote.id);
          }
          loadNotes();
        }
      } catch (e) {
        console.error('createNoteInWindow failed:', e);
        if (newNote && newNote.id) {
          try { await window.electronAPI.notes.delete(newNote.id); } catch (_) {}
        }
      }
    };

    // Pop out an item (note or todo) from the AllView into an independent window.
    const popOutItem = async (item) => {
      try {
        if (item.type === 'note') {
          await window.electronAPI.floatingNote.create(item.id, { alwaysOnTop: false });
        } else {
          await window.electronAPI.floatingTodo.create(item.id, { alwaysOnTop: false });
        }
      } catch (e) { console.error('popOutItem failed:', e); }
    };

    // ---- Context menu for NoteList/TodoList ----
    const appContextMenu = ref({ visible: false, x: 0, y: 0, item: null, itemType: null, showColors: false });

    const showNoteContextMenu = (e, note) => {
      appContextMenu.value = { visible: true, x: e.clientX, y: e.clientY, item: note, itemType: 'note', showColors: false };
    };
    const showTodoContextMenu = (e, todo) => {
      appContextMenu.value = { visible: true, x: e.clientX, y: e.clientY, item: todo, itemType: 'todo', showColors: false };
    };

    const appCtxAction = (action) => {
      const item = appContextMenu.value.item;
      const type = appContextMenu.value.itemType;
      if (!item) return;
      if (action === 'color') { appContextMenu.value.showColors = true; return; }
      appContextMenu.value.visible = false;
      switch (action) {
        case 'popOut': popOutItem({ ...item, type }); break;
        case 'edit': type === 'note' ? editNote(item) : editTodo(item); break;
        case 'toggle': (async () => { try { await window.electronAPI.todos.update(item.id, { completed: item.completed === 1 ? 0 : 1 }); loadAll(); } catch (e) {} })(); break;
        case 'duplicate': type === 'note' ? duplicateNote(item) : (async () => { try { await window.electronAPI.todos.create({ title: (item.title||'') + ' ' + t('duplicateSuffix'), priority: item.priority, due_date: item.due_date }); loadAll(); } catch (e) {} })(); break;
        case 'archive': type === 'note' ? archiveNote(item) : archiveTodo(item); break;
        case 'delete':
          if (type === 'note') { if (confirm(t('confirmDeleteNote'))) { window.electronAPI.notes.delete(item.id).then(() => { loadAll(); onItemDeleted({ type: 'note', id: item.id }); }); } }
          else { if (confirm(t('confirmDeleteTodo'))) { window.electronAPI.todos.delete(item.id).then(() => { loadAll(); onItemDeleted({ type: 'todo', id: item.id }); }); } }
          break;
      }
    };

    const appCtxChangeColor = async (color) => {
      const item = appContextMenu.value.item;
      const type = appContextMenu.value.itemType;
      if (!item) return;
      try {
        const api = type === 'note' ? window.electronAPI.notes : window.electronAPI.todos;
        await api.update(item.id, { color });
        loadAll();
      } catch (e) { console.error('Change color failed:', e); }
      appContextMenu.value = { visible: false, x: 0, y: 0, item: null, itemType: null, showColors: false };
    };
    
    const showNewTodoEditor = () => {
      editingTodo.value = null;
      showingEditor.value = true;
    };

    // Dropdown state for todo + button
    const showAddTodoMenu = ref(false);
    
    const editNote = (note) => {
      editingNote.value = note;
      showingEditor.value = true;
    };
    
    const editTodo = (todo) => {
      editingTodo.value = todo;
      showingEditor.value = true;
    };

    // Edit item in the sidebar — switch to the correct tab first, then open editor.
    const editInSidebar = (item) => {
      if (item.type === 'note') {
        currentTab.value = 'notes';
        editNote(item);
      } else {
        currentTab.value = 'todos';
        editTodo(item);
      }
    };
    
    const hideEditor = () => {
      showingEditor.value = false;
      editingNote.value = null;
      editingTodo.value = null;
    };
    
    const onNoteSaved = () => {
      hideEditor();
      loadAll();
    };
    
    const onTodoSaved = () => {
      hideEditor();
      loadAll();
    };
    
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value;
      // Physically resize the Electron window to match collapse state
      const width = isCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
      window.electronAPI.sidebar.resize(width).catch((e) => console.error('resize failed:', e));
    };

    // Auto-expand when mouse hovers over the collapsed edge strip.
    const expandFromEdge = () => {
      if (isCollapsed.value) {
        isCollapsed.value = false;
        const width = SIDEBAR_EXPANDED_WIDTH;
        window.electronAPI.sidebar.resize(width).catch((e) => console.error('resize failed:', e));
      }
    };

    // R2-08: Removed dead code collapseIfEdge/cancelCollapse — user-confirmed
    // behavior is "mouse leave stays expanded, click ←/→ to collapse".
    
    // I1/I2: Close all dropdown/context menus when clicking anywhere in the app.
    const closeAllMenus = () => {
      showLangMenu.value = false;
      showAddNoteMenu.value = false;
      showAddTodoMenu.value = false;
      showNoteAddMenu.value = false;
      showTodoAddMenu.value = false;
      showColorPicker.value = false;
      showTodoColorPicker.value = false;
      contextMenu.value.visible = false;
      appContextMenu.value.visible = false;
    };

    const hideWindow = async () => {
      if (window.electronAPI && window.electronAPI.app && window.electronAPI.app.hide) {
        await window.electronAPI.app.hide();
      }
    };

    const minimizeWindow = async () => {
      if (window.electronAPI.app && window.electronAPI.app.minimize) {
        await window.electronAPI.app.minimize();
      }
    };
    
    const quitApp = async () => {
      if (window.electronAPI.app && window.electronAPI.app.quit) {
        await window.electronAPI.app.quit();
      }
    };
    
    const exportData = async () => {
      try {
        const result = await window.electronAPI.data.exportToFile();
        if (result && result.path) {
          alert(t('exportSuccess') + result.path);
        }
      } catch (error) {
        console.error('Failed to export data:', error);
        alert(t('exportFail') + error.message);
      }
    };
    
    const toggleTheme = async () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme.value;
      try {
        await window.electronAPI.sidebar.setState('theme', theme.value);
        // Broadcast to all floating windows so they update in real time
        if (window.electronAPI.settings) {
          window.electronAPI.settings.broadcastChange({ key: 'theme', value: theme.value });
        }
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };

    const setColorScheme = async (scheme) => {
      colorScheme.value = scheme;
      document.documentElement.dataset.colorScheme = scheme;
      try {
        await window.electronAPI.sidebar.setState('colorScheme', scheme);
        // Broadcast to all floating windows so they update in real time
        if (window.electronAPI.settings) {
          window.electronAPI.settings.broadcastChange({ key: 'colorScheme', value: scheme });
        }
      } catch (error) {
        console.error('Failed to save color scheme:', error);
      }
    };
    
    const onOpacityChange = async () => {
      try {
        await window.electronAPI.window.setOpacity(opacity.value);
        await window.electronAPI.sidebar.setState('opacity', String(opacity.value));
      } catch (error) {
        console.error('Failed to set opacity:', error);
      }
    };
    
    const toggleAlwaysOnTop = async () => {
      alwaysOnTop.value = !alwaysOnTop.value;
      try {
        await window.electronAPI.window.setAlwaysOnTop(alwaysOnTop.value);
        await window.electronAPI.sidebar.setState('alwaysOnTop', alwaysOnTop.value ? 'true' : 'false');
      } catch (error) {
        console.error('Failed to toggle always-on-top:', error);
        // Rollback on error
        alwaysOnTop.value = !alwaysOnTop.value;
      }
    };

    const dismissReminder = async (id, dueDate) => {
      try {
        if (window.electronAPI.reminder && window.electronAPI.reminder.markNotified) {
          await window.electronAPI.reminder.markNotified(id, dueDate);
        }
      } catch (_) {}
      reminders.value = reminders.value.filter((r) => r.id !== id);
    };

    const loadBackupList = async () => {
      try {
        if (window.electronAPI.backup && window.electronAPI.backup.list) {
          backupList.value = await window.electronAPI.backup.list();
        }
      } catch (_) {}
    };

    const doManualBackup = async () => {
      try {
        if (window.electronAPI.backup && window.electronAPI.backup.manual) {
          const result = await window.electronAPI.backup.manual();
          if (result && result.ok) {
            await loadBackupList();
          }
        }
      } catch (_) {}
    };

    const doRestoreBackup = async (backupPath) => {
      if (!confirm(t('backupConfirmRestore'))) return;
      try {
        if (window.electronAPI.backup && window.electronAPI.backup.restore) {
          await window.electronAPI.backup.restore(backupPath);
        }
      } catch (_) {}
    };

    const doDeleteBackup = async (backupPath, name) => {
      if (!confirm(t('backupConfirmDelete'))) return;
      try {
        if (window.electronAPI.backup && window.electronAPI.backup.delete) {
          await window.electronAPI.backup.delete(backupPath);
          await loadBackupList();
        }
      } catch (_) {}
    };

    const formatSize = (bytes) => {
      if (!bytes) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      return (bytes / 1024).toFixed(1) + ' KB';
    };

    const formatDateStr = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return d.toLocaleDateString() + ' ' + hh + ':' + mm;
    };

    watch(showSettings, (val) => { if (val) loadBackupList(); });
    
    const stats = computed(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = (today.getDay() + 6) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);
      const monthStartStr = monthStart.toISOString().slice(0, 10);
      const monthEndStr = monthEnd.toISOString().slice(0, 10);
      let weekCompleted = 0, weekTotal = 0, monthCompleted = 0, monthTotal = 0;
      const allTodos = todos.value;
      for (const todo of allTodos) {
        const d = todo.due_date ? todo.due_date.slice(0, 10) : null;
        if (d && d >= weekStartStr && d <= weekEndStr) {
          weekTotal++;
          if (todo.completed) weekCompleted++;
        }
        if (d && d >= monthStartStr && d <= monthEndStr) {
          monthTotal++;
          if (todo.completed) monthCompleted++;
        }
      }
      const completedTodos = allTodos.filter((t) => t.completed).length;
      const last7Days = [];
      const dayLabels = [t('calMon'), t('calTue'), t('calWed'), t('calThu'), t('calFri'), t('calSat'), t('calSun')];
      let maxDay = 1;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const count = allTodos.filter((t) => t.completed && t.updated_at && t.updated_at.slice(0, 10) === dateStr).length;
        last7Days.push({ label: dayLabels[(d.getDay() + 6) % 7], count });
        if (count > maxDay) maxDay = count;
      }
      return {
        weekCompleted, weekTotal, monthCompleted, monthTotal,
        totalNotes: notes.value.length,
        totalTodos: allTodos.length,
        completedTodos,
        last7Days,
        maxDay
      };
    });

    return {
      currentTab,
      isCollapsed,
      showingEditor,
      editingNote,
      editingTodo,
      notes,
      todos,
      todoFilter,
      priorityFilter,
      tagFilter,
      allTags,
      isFloatingNote,
      floatingNote,
      floatingOnTop,
      toggleFloatingOnTop,
      getColorName,
      formatCmd,
      showColorPicker,
      toggleColorPicker,
      changeNoteColor,
      createTodoInWindow,
      insertImageFloating,
      shrinkImageFloating,
      enlargeImageFloating,
      insertImageFloatingTodo,
      shrinkImageFloatingTodo,
      enlargeImageFloatingTodo,
      isFloatingTodo,
      floatingTodo,
      floatingTodoOnTop,
      floatingTodoColor,
      showTodoColorPicker,
      toggleTodoColorPicker,
      changeTodoColor,
      formatTodoCmd,
      floatingTodoContent,
      loadFloatingTodo,
      saveFloatingTodo,
      onFloatingTodoInput,
      onFloatingTodoChange,
      closeFloatingTodo,
      toggleFloatingTodoOnTop,
      onFloatingNoteBlur,
      floatingEditorContent,
      onFloatingContentInput,
      onFloatingContentPaste,
      onFloatingContentDrop,
      closeFloatingNote,
      floatingDirty, // B1: expose for template @input inline expression
      scheduleFloatingSave, // B2: expose for template @input
      scheduleFloatingTodoSave, // B2: expose for template @input
      showNewNoteEditor,
      showAddNoteMenu,
      allFilter,
      showNoteAddMenu,
      showTodoAddMenu,
      createNoteInWindow,
      popOutItem,
      appContextMenu,
      showNoteContextMenu,
      showTodoContextMenu,
      appCtxAction,
      appCtxChangeColor,
      showNewTodoEditor,
      showAddTodoMenu,
      editNote,
      editTodo,
      editInSidebar,
      hideEditor,
      onNoteSaved,
      onTodoSaved,
      toggleCollapse,
      expandFromEdge,
      closeAllMenus, // I1/I2: global click closes all menus
      hideWindow,
      minimizeWindow,
      quitApp,
      exportData,
      loadNotes,
      loadTodos,
      loadAll,
      theme,
      opacity,
      alwaysOnTop,
      toggleTheme,
      onOpacityChange,
      toggleAlwaysOnTop,
      locale,
      t,
      showLangMenu,
      setLocale,
      showSettings,
      groupingMode,
      colorScheme,
      setColorScheme,
      showTabTimeline,
      showTabTrash,
      showTabCalendar,
      showTabBoard,
      showTabAll,
      showTabNotes,
      showTabTodos,
      saveTabVisibility,
      onGroupingChange,
      currentShortcut,
      recordingShortcut,
      recordedShortcut,
      startRecording,
      onShortcutKeydown,
      saveShortcut,
      searchQuery,
      debouncedSearchQuery,
      onSearchInput,
      clearSearch,
      reminders,
      dismissReminder,
      backupList,
      doManualBackup,
      doRestoreBackup,
      doDeleteBackup,
      formatSize,
      formatDateStr,
      stats,
      showArchived,
      multiSelectMode,
      selectedIds,
      showCommandPalette,
      trashList,
      undoStack,
      undoToast,
      onItemDeleted,
      undoLastDelete,
      loadTrash,
      restoreFromTrash,
      permanentlyDelete,
      commandQuery,
      commandSelectedIdx,
      commandResults,
      onCommandKeydown,
      executeCommand,
      commandInput,
      archiveNote,
      restoreNote,
      archiveTodo,
      restoreTodo,
      duplicateNote,
      toggleSelect,
      selectAll,
      batchDelete,
      batchArchive,
      batchColor,
      exitMultiSelect,
      pomodoroSeconds,
      pomodoroMinutes,
      pomodoroSecondsDisplay,
      pomodoroRunning,
      startPomodoro,
      pausePomodoro,
      resetPomodoro,
      importResultMsg,
      onImportFile,
      NOTE_COLORS
    };
  }
};

// ============================================
// Initialize App
// ============================================
const app = createApp(App);
app.mount('#app');
