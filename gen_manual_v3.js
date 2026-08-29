// StickyTodo 使用说明书 v3 — 完整版含特色功能
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
        ShadingType, PageBreak } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, width, opts) {
  opts = opts || {};
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size || 22 })] })]
  });
}

function bullet(text) {
  return new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun(text)] });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Microsoft YaHei', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'StickyTodo \u4F7F\u7528\u8BF4\u660E\u4E66', size: 44, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: '\u7248\u672C 2.0.0  |  2026-08-29', size: 22, color: '666666' })]
      }),

      // 1. 简介
      h1('\u4E00\u3001\u7B80\u4ECB'),
      new Paragraph({ children: [new TextRun('StickyTodo \u662F\u4E00\u6B3E\u684C\u9762\u4FBF\u7B7E + \u5F85\u529E\u4E8B\u9879\u7BA1\u7406\u5DE5\u5177\uFF0C\u5177\u6709\u4EE5\u4E0B\u7279\u8272\uFF1A')] }),
      bullet('\u60AC\u6D6E\u7A97\u53E3\uFF1A\u4FBF\u7B7E/\u5F85\u529E\u53EF\u5F39\u51FA\u4E3A\u72EC\u7ACB\u7A97\u53E3\uFF0C\u652F\u6301\u7F6E\u9876 + \u900F\u660E\u5EA6\u8C03\u8282'),
      bullet('3D \u684C\u9762\u684C\u5BA0\uFF1A12 \u79CD 2D/3D \u89D2\u8272\uFF0C\u53EF\u62D6\u62FD\u3001\u4EA4\u4E92\u3001\u5F85\u529E\u63D0\u9192'),
      bullet('\u770B\u677F\u89C6\u56FE\uFF1A\u5F85\u529E\u6309\u72B6\u6001\u5206\u5217\uFF0C\u62D6\u62FD\u5207\u6362\u72B6\u6001'),
      bullet('\u5BFC\u51FA\uFF1A\u652F\u6301 Markdown / PDF / \u56FE\u7247\u5BFC\u51FA'),
      bullet('\u4E09\u8BED\u8A00\uFF1A\u4E2D\u6587 / English / Ti\u1EBFng Vi\u1EC7t'),
      bullet('\u5168\u6587\u641C\u7D22 + \u9AD8\u4EAE\u5339\u914D'),
      bullet('\u7248\u672C\u5386\u53F2 + Wiki \u94FE\u63A5 + 5 \u79CD\u6A21\u677F'),

      // 2. 便笺管理
      h1('\u4E8C\u3001\u4FBF\u7B7E\u7BA1\u7406'),
      h2('2.1 \u65B0\u5EFA\u4E0E\u7F16\u8F91'),
      bullet('\u70B9\u51FB\u4FA7\u8FB9\u680F + \u53F7\u6309\u94AE \u2192 \u9009\u62E9\u201C\u4FBF\u7B7E\u201D\u65B0\u5EFA'),
      bullet('\u7F16\u8F91\u5668\u652F\u6301\uFF1A\u7C97\u4F53(Ctrl+B)\u3001\u659C\u4F53(Ctrl+I)\u3001\u4E0B\u5212\u7EBF(Ctrl+U)\u3001\u5220\u9664\u7EBF(Ctrl+T)\u3001\u5217\u8868(Ctrl+Shift+L)'),
      bullet('\u63D2\u5165\u56FE\u7247\u3001\u8868\u683C\u3001\u4EE3\u7801\u5757\u3001\u5F15\u7528\u5757'),
      bullet('6 \u79CD\u989C\u8272\u5206\u7C7B\uFF1A\u9EC4/\u7EFF/\u84DD/\u7C89/\u7070/\u7D2B'),

      h2('2.2 \u6D6E\u52A8\u7A97\u53E3\uFF08\u6838\u5FC3\u7279\u8272\uFF09'),
      bullet('\u53F3\u952E\u4FBF\u7B7E \u2192 \u201C\u5728\u7A97\u53E3\u4E2D\u6253\u5F00\u201D\uFF0C\u4FBF\u7B7E\u5F39\u51FA\u4E3A\u72EC\u7ACB\u7A97\u53E3'),
      bullet('\u7A97\u53E3\u5DE5\u5177\u680F\uFF1A\u989C\u8272\u9009\u62E9\u3001\u7F6E\u9876\u5207\u6362(\uD83D\uDCCC/\uD83D\uDCCD)\u3001\u5173\u95ED'),
      bullet('\u7F6E\u9876\u540E\u7A97\u53E3\u6D6E\u5728\u6240\u6709\u7A97\u53E3\u4E4B\u4E0A\uFF0C\u65B9\u4FBF\u53C2\u7167'),
      bullet('\u6D6E\u52A8\u7A97\u53E3\u81EA\u52A8\u4FDD\u5B58\uFF0C\u652F\u6301\u5BCC\u6587\u672C\u7F16\u8F91'),

      h2('2.3 \u4FA7\u8FB9\u680F\u7F6E\u9876 + \u900F\u660E\u5EA6'),
      bullet('\u4FA7\u8FB9\u680F\u53F3\u4E0A\u89D2\u6709\u900F\u660E\u5EA6\u6ED1\u5757\uFF0C\u53EF\u8C03\u8282 10%~100%'),
      bullet('\uD83D\uDCCD \u6309\u94AE\u5207\u6362\u4FA7\u8FB9\u680F\u7F6E\u9876\uFF08\u6D6E\u5728\u5176\u4ED6\u7A97\u53E3\u4E0A\uFF09'),
      bullet('\u7F6E\u9876\u540E\u900F\u660E\u5EA6\u4ECD\u53EF\u8C03\uFF0C\u65B9\u4FBF\u540C\u65F6\u770B\u5176\u4ED6\u7A97\u53E3'),

      h2('2.4 \u6A21\u677F'),
      bullet('\u7F16\u8F91\u5668\u5DE5\u5177\u680F \u2192 \uD83D\uDCC4 \u6A21\u677F\u6309\u94AE'),
      bullet('5 \u79CD\u5185\u7F6E\u6A21\u677F\uFF1A\u4F1A\u8BAE\u8BB0\u5F55\u3001\u8BFB\u4E66\u7B14\u8BB0\u3001\u8D2D\u7269\u6E05\u5355\u3001\u5468\u8BA1\u5212\u3001\u76EE\u6807\u8FFD\u8E2A'),

      h2('2.5 \u7248\u672C\u5386\u53F2'),
      bullet('\u7F16\u8F91\u5668\u5DE5\u5177\u680F \u2192 \uD83D\uDCCD \u7248\u672C\u5386\u53F2\u6309\u94AE'),
      bullet('\u67E5\u770B\u5386\u53F2\u7248\u672C\uFF0C\u70B9\u51FB\u6062\u590D\u5230\u6307\u5B9A\u7248\u672C'),

      h2('2.6 Wiki \u94FE\u63A5'),
      bullet('\u5728\u4FBF\u7B7E\u5185\u5BB9\u4E2D\u8F93\u5165 [[\u4FBF\u7B7E\u6807\u9898]] \u521B\u5EFA\u53CC\u5411\u94FE\u63A5'),
      bullet('\u70B9\u51FB\u94FE\u63A5\u8DF3\u8F6C\u5230\u5BF9\u5E94\u4FBF\u7B7E\uFF0C\u652F\u6301\u53CD\u5411\u94FE\u63A5\u67E5\u770B'),

      h2('2.7 \u5BFC\u51FA'),
      bullet('\uD83D\uDCF7 \u5BFC\u51FA\u56FE\u7247\uFF1A\u4FDD\u5B58\u4E3A PNG \u5230\u684C\u9762'),
      bullet('\uD83D\uDCDD \u5BFC\u51FA Markdown\uFF1A\u4FDD\u5B58\u4E3A .md \u5230\u684C\u9762'),
      bullet('\uD83D\uDCC4 \u5BFC\u51FA PDF\uFF1A\u4FDD\u5B58\u4E3A PDF \u5230\u684C\u9762'),

      // 3. 待办管理
      h1('\u4E09\u3001\u5F85\u529E\u7BA1\u7406'),
      h2('3.1 \u65B0\u5EFA\u4E0E\u7F16\u8F91'),
      bullet('\u70B9\u51FB\u4FA7\u8FB9\u680F + \u53F7\u6309\u94AE \u2192 \u9009\u62E9\u201C\u5F85\u529E\u201D\u65B0\u5EFA'),
      bullet('\u8BBE\u7F6E\u622A\u6B62\u65E5\u671F\u3001\u4F18\u5148\u7EA7\uFF08\u9AD8/\u4E2D/\u4F4E\uFF09\u3001\u5206\u7C7B\u3001\u6807\u7B7E'),
      bullet('\u5B50\u4EFB\u52A1\uFF1A\u5728\u5F85\u529E\u4E0B\u65B9\u6DFB\u52A0\u5B50\u4EFB\u52A1\uFF0C\u652F\u6301\u72EC\u7ACB\u52FE\u9009'),
      bullet('\u91CD\u590D\u4EFB\u52A1\uFF1A\u652F\u6301\u6309\u65E5/\u5468/\u6708\u81EA\u52A8\u91CD\u7F6E'),
      bullet('\u53F3\u952E\u5F85\u529E\u53EF\u201C\u5728\u7A97\u53E3\u4E2D\u6253\u5F00\u201D\u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3'),

      h2('3.2 \u770B\u677F\u89C6\u56FE'),
      bullet('\u5207\u6362\u5230\u770B\u677F\u6807\u7B7E\u9875\uFF0C\u9ED8\u8BA4\u663E\u793A\u5F85\u529E\u770B\u677F'),
      bullet('\u5F85\u529E\u770B\u677F\uFF1A\u6309\u201C\u5F85\u529E/\u5DF2\u5B8C\u6210\u201D\u5206\u5217\uFF0C\u62D6\u62FD\u5361\u7247\u5728\u5217\u95F4\u79FB\u52A8 = \u5207\u6362\u5B8C\u6210\u72B6\u6001'),
      bullet('\u70B9\u51FB\u201C\u4FBF\u7B7E\u201D\u6309\u94AE\u5207\u6362\u5230\u4FBF\u7B7E\u770B\u677F\uFF08\u6309\u989C\u8272\u5206\u5217\uFF09'),

      // 4. 搜索
      h1('\u56DB\u3001\u641C\u7D22'),
      bullet('\u6309 / \u952E\u5FEB\u901F\u805A\u7126\u641C\u7D22\u6846'),
      bullet('\u6309 Esc \u952E\u6E05\u7A7A\u641C\u7D22'),
      bullet('\u5B9E\u65F6\u8FC7\u6EE4\uFF0C\u5339\u914D\u6587\u5B57\u9AD8\u4EAE\u663E\u793A'),
      bullet('\u540C\u65F6\u641C\u7D22\u4FBF\u7B7E\u6807\u9898\u3001\u5185\u5BB9\u548C\u5F85\u529E\u6807\u9898'),

      // 5. 3D 桌面桌宠
      h1('\u4E94\u3001 3D \u684C\u9762\u684C\u5BA0'),
      h2('5.1 \u5F00\u542F\u684C\u5BA0'),
      bullet('\u8BBE\u7F6E \u2192 \u684C\u5BA0 \u2192 \u52FE\u9009\u201C\u542F\u7528\u684C\u5BA0\u201D'),
      bullet('\u52FE\u9009\u201C 3D \u684C\u5BA0\u201D\u5207\u6362\u5230 3D \u6A21\u5F0F'),

      h2('5.2 \u89D2\u8272\u9009\u62E9'),
      bullet('2D \u89D2\u8272\uFF1A\u732B\u3001\u72D7\u3001\u5154\u5B50\u3001\u718A\u732B\u3001\u72D0\u72F8\u3001\u4ED3\u9F20\u3001\u4F01\u9E45\u7B49'),
      bullet('3D \u7A0B\u5E8F\u89D2\u8272\uFF1A\u5175\u4EBA\u3001\u673A\u5668\u4EBA\u3001\u9B3C\u3001\u4F01\u9E45\u3001\u706B\u70C8\u9E1F'),
      bullet('3D GLB \u6A21\u578B\uFF1A\u58EB\u5175\u3001Xbot\u3001Michelle\u3001\u706B\u70C8\u9E1F\u3001\u9E66\u9E5A\u3001\u9E58\u9E5F\u3001\u9A6C'),

      h2('5.3 \u684C\u5BA0\u4EA4\u4E92'),
      bullet('\u62D6\u62FD\u684C\u5BA0\u79FB\u52A8\u4F4D\u7F6E\uFF0C\u677E\u624B\u540E\u60EF\u6027\u6ED1\u52A8 + \u5F39\u8DF3'),
      bullet('\u70B9\u51FB\u684C\u5BA0\u63D0\u5347\u5FC3\u60C5\u503C\uFF0C\u53F3\u952E\u53EF\u5582\u98DF'),
      bullet('\u684C\u5BA0\u5FC3\u60C5\u4F4E\u4E8E 15 \u65F6\u4F1A\u7761\u89C9\uFF08\u6253\u7BEC\u56FE\u684C\u5BA0\u53EF\u5524\u9192\uFF09'),
      bullet('\u88C5\u626E\uFF1A\u5E3D\u5B50(5\u7EA7\u89E3\u9501)\u3001\u773C\u955C(6\u7EA7)\u3001\u7687\u51A0(9\u7EA7)'),

      h2('5.4 \u5F85\u529E\u63D0\u9192'),
      bullet('\u5F85\u529E\u5373\u5C06\u5230\u671F\u65F6\u684C\u5BA0\u5F39\u6C14\u6CE1\u63D0\u9192\uFF08\u6BCF 1 \u5C0F\u65F6\u63D0\u9192\u4E00\u6B21\uFF09'),
      bullet('\u5F85\u529E\u903E\u671F\u540E\u684C\u5BA0\u5FC3\u60C5\u4E0B\u964D\uFF0C\u81EA\u52A8\u6062\u590D\u5230\u6B63\u5E38\u503C'),

      // 6. 番茄钟
      h1('\u516D\u3001\u756A\u8304\u949F'),
      bullet('\u4FA7\u8FB9\u680F\u5E95\u90E8\u6709\u756A\u8304\u949F\u63A7\u4EF6\uFF0825 \u5206\u949F\uFF09'),
      bullet('\u70B9\u51FB\u5F00\u59CB / \u6682\u505C / \u91CD\u7F6E'),
      bullet('\u5B8C\u6210\u4E00\u4E2A\u756A\u8304\u949F\u83B7\u5F97 15 XP\uFF0C\u684C\u5BA0\u5FC3\u60C5\u4E0A\u5347'),

      // 7. 快捷键
      new Paragraph({ children: [new PageBreak()] }),
      h1('\u4E03\u3001\u5FEB\u6377\u952E'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3000, 6026],
        rows: [
          new TableRow({ children: [
            cell('\u5FEB\u6377\u952E', 3000, { bold: true, shading: 'D5E8F0' }),
            cell('\u529F\u80FD', 6026, { bold: true, shading: 'D5E8F0' })
          ]}),
          new TableRow({ children: [ cell('Ctrl + P', 3000), cell('\u6253\u5F00\u547D\u4EE4\u9762\u677F\uFF08\u641C\u7D22\u4FBF\u7B7E/\u5F85\u529E/\u64CD\u4F5C\uFF09', 6026) ]}),
          new TableRow({ children: [ cell('/', 3000), cell('\u805A\u7126\u641C\u7D22\u6846', 6026) ]}),
          new TableRow({ children: [ cell('Esc', 3000), cell('\u6E05\u7A7A\u641C\u7D22', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + Z', 3000), cell('\u64A4\u9500\u5220\u9664\uFF08\u4ECE\u56DE\u6536\u7AD9\u6062\u590D\uFF09', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + B', 3000), cell('\u7C97\u4F53', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + I', 3000), cell('\u659C\u4F53', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + U', 3000), cell('\u4E0B\u5212\u7EBF', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + T', 3000), cell('\u5220\u9664\u7EBF', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + Shift + L', 3000), cell('\u5217\u8868', 6026) ]}),
          new TableRow({ children: [ cell('Super + Alt + S', 3000), cell('\u663E\u793A/\u9690\u85CF\u4FA7\u8FB9\u680F', 6026) ]}),
        ]
      }),

      // 8. 设置
      h1('\u516B\u3001\u8BBE\u7F6E'),
      new Paragraph({ children: [new TextRun('\u70B9\u51FB\u4FA7\u8FB9\u680F \u2699 \u6309\u94AE\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\uFF1A')] }),
      bullet('\u8BED\u8A00\uFF1A\u4E2D\u6587 / English / Ti\u1EBFng Vi\u1EC7t'),
      bullet('\u5206\u7EC4\uFF1A\u6309\u65E5\u671F / \u5B57\u6BCD / \u4E0D\u5206\u7EC4'),
      bullet('\u6807\u7B7E\u53EF\u89C1\u6027\uFF1A\u52FE\u9009\u663E\u793A\u54EA\u4E9B\u6807\u7B7E\u9875'),
      bullet('\u914D\u8272\u65B9\u6848\uFF1A\u9ED8\u8BA4 / Windows / \u83AB\u5170\u8FEA'),
      bullet('\u5FEB\u6377\u952E\uFF1A\u81EA\u5B9A\u4E49\u663E\u793A/\u9690\u85CF\u4FA7\u8FB9\u680F\u7684\u5FEB\u6377\u952E'),
      bullet('\u684C\u5BA0\uFF1A\u542F\u7528/\u89D2\u8272/\u88C5\u626E/3D \u5F00\u5173/\u8DDF\u968F\u4E3B\u9898/\u91CD\u7F6E'),
      bullet('\u5907\u4EFD\uFF1A\u624B\u52A8\u5907\u4EFD / \u67E5\u770B\u5907\u4EFD\u5217\u8868 / \u6062\u590D / \u5220\u9664'),
      bullet('\u5BFC\u5165\uFF1A\u4ECE JSON \u6587\u4EF6\u5BFC\u5165\u6570\u636E'),
      bullet('\u7EDF\u8BA1\uFF1A\u672C\u5468/\u672C\u6708/\u5386\u53F2\u5B8C\u6210\u7387 + 7 \u5929\u67F1\u72B6\u56FE'),

      // 9. 数据安全
      h1('\u4E5D\u3001\u6570\u636E\u5B89\u5168'),
      bullet('\u81EA\u52A8\u5907\u4EFD\uFF1A\u6BCF 4 \u5C0F\u65F6\u81EA\u52A8\u5907\u4EFD\u5230 ~/.stickytodo/backups/'),
      bullet('\u624B\u52A8\u5907\u4EFD\uFF1A\u8BBE\u7F6E \u2192 \u5907\u4EFD \u2192 \u7ACB\u5373\u5907\u4EFD'),
      bullet('\u56DE\u6536\u7AD9\uFF1A\u5220\u9664\u7684\u4FBF\u7B7E/\u5F85\u529E\u8FDB\u5165\u56DE\u6536\u7AD99\uFF0C30 \u5929\u540E\u6C38\u4E45\u5220\u9664'),
      bullet('Ctrl + Z \u53EF\u6062\u590D\u521A\u5220\u9664\u7684\u5185\u5BB9'),
      bullet('\u6570\u636E\u5B58\u50A8\u5728\u672C\u5730 SQLite \u6570\u636E\u5E93\uFF0C\u4E0D\u4E0A\u4F20\u4E91\u7AEF'),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, 'StickyTodo_UserManual_v3.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Written: ' + outPath);
});
