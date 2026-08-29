// StickyTodo 使用说明书 — docx generator
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
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
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
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('\u4E00\u3001\u7B80\u4ECB')] }),
      new Paragraph({ children: [new TextRun('StickyTodo \u662F\u4E00\u6B3E\u684C\u9762\u4FBF\u7B7E + \u5F85\u529E\u4E8B\u9879\u7BA1\u7406\u5DE5\u5177\uFF0C\u652F\u6301\u4E09\u8BED\u8A00\uFF08\u4E2D\u6587/\u82F1\u6587/\u8D8A\u5357\u8BED\uFF09\uFF0C\u5185\u7F6E 3D \u684C\u9762\u684C\u5BA0\u3001\u5F85\u529E\u770B\u677F\u3001Markdown/PDF \u5BFC\u51FA\u3001\u5168\u6587\u641C\u7D22\u7B49\u529F\u80FD\u3002')] }),

      // 2. 核心功能
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('\u4E8C\u3001\u6838\u5FC3\u529F\u80FD')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.1 \u4FBF\u7B7E\u7BA1\u7406')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u65B0\u5EFA\u4FBF\u7B7E\uFF1A\u70B9\u51FB\u4FA7\u8FB9\u680F + \u53F7\u6309\u94AE\uFF0C\u9009\u62E9\u201C\u4FBF\u7B7E\u201D')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u7F16\u8F91\u4FBF\u7B7E\uFF1A\u70B9\u51FB\u4FBF\u7B7E\u8FDB\u5165\u7F16\u8F91\u5668\uFF0C\u652F\u6301\u5BCC\u6587\u672C\u683C\u5F0F\uFF08\u7C97\u4F53/\u659C\u4F53/\u5217\u8868/\u8868\u683C/\u4EE3\u7801\u5757\uFF09')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u989C\u8272\u5206\u7C7B\uFF1A6 \u79CD\u989C\u8272\u5206\u7C7B\u4FBF\u7B7E')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5BFC\u51FA\uFF1A\u70B9\u51FB\u7F16\u8F91\u5668\u5E95\u90E8 \uD83D\uDCCF \u5BFC\u51FA\u56FE\u7247\u3001\uD83D\uDCDD \u5BFC\u51FA Markdown\u3001\uD83D\uDCC4 \u5BFC\u51FA PDF\uFF08\u4FDD\u5B58\u5230\u684C\u9762\uFF09')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.2 \u5F85\u529E\u7BA1\u7406')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u65B0\u5EFA\u5F85\u529E\uFF1A\u70B9\u51FB\u4FA7\u8FB9\u680F + \u53F7\u6309\u94AE\uFF0C\u9009\u62E9\u201C\u5F85\u529E\u201D')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u8BBE\u7F6E\u622A\u6B62\u65E5\u671F\u3001\u4F18\u5148\u7EA7\u3001\u5206\u7C7B\u3001\u6807\u7B7E')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5B50\u4EFB\u52A1\uFF1A\u5728\u5F85\u529E\u4E0B\u65B9\u6DFB\u52A0\u5B50\u4EFB\u52A1')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u91CD\u590D\u4EFB\u52A1\uFF1A\u652F\u6301\u6309\u65E5/\u5468/\u6708\u91CD\u590D')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.3 \u770B\u677F\u89C6\u56FE')] }),
      new Paragraph({ children: [new TextRun('\u5207\u6362\u5230\u770B\u677F\u6807\u7B7E\u9875\uFF0C\u9ED8\u8BA4\u663E\u793A\u5F85\u529E\u770B\u677F\uFF1A')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5F85\u529E\u770B\u677F\uFF1A\u6309\u201C\u5F85\u529E/\u5DF2\u5B8C\u6210\u201D\u5206\u5217\uFF0C\u62D6\u62FD\u5361\u7247\u5728\u5217\u95F4\u79FB\u52A8 = \u5207\u6362\u5B8C\u6210\u72B6\u6001')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u4FBF\u7B7E\u770B\u677F\uFF1A\u70B9\u51FB\u201C\u4FBF\u7B7E\u201D\u6309\u94AE\u5207\u6362\uFF0C\u6309\u989C\u8272\u5206\u5217')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.4 \u641C\u7D22')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u6309 / \u952E\u5FEB\u901F\u805A\u7126\u641C\u7D22\u6846')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u6309 Esc \u952E\u6E05\u7A7A\u641C\u7D22')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u641C\u7D22\u7ED3\u679C\u9AD8\u4EAE\u663E\u793A\u5339\u914D\u6587\u5B57')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.5 3D \u684C\u9762\u684C\u5BA0')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5728\u8BBE\u7F6E \u2192 \u684C\u5BA0 \u2192 \u52FE\u9009\u201C\u542F\u7528\u684C\u5BA0\u201D')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u9009\u62E9\u89D2\u8272\uFF1A12 \u79CD 2D/3D \u89D2\u8272\uFF08\u732B/\u72D7/\u5175\u4EBA/\u673A\u5668\u4EBA/\u9A6C/\u706B\u70C8\u9E1F\u7B49\uFF09')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u62D6\u62FD\u684C\u5BA0\u79FB\u52A8\u4F4D\u7F6E\uFF0C\u677E\u624B\u540E\u4F1A\u6709\u60EF\u6027\u6ED1\u52A8')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u70B9\u51FB\u684C\u5BA0\u4E92\u52A8\uFF0C\u63D0\u5347\u5FC3\u60C5\u503C')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5F85\u529E\u63D0\u9192\uFF1A\u5F85\u529E\u5373\u5C06\u5230\u671F\u65F6\u684C\u5BA0\u4F1A\u5F39\u6C14\u6CE1\u63D0\u9192\uFF0C\u6BCF 1 \u5C0F\u65F6\u63D0\u9192\u4E00\u6B21')] }),

      // 3. 快捷键
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('\u4E09\u3001\u5FEB\u6377\u952E')] }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3000, 6026],
        rows: [
          new TableRow({ children: [
            cell('\u5FEB\u6377\u952E', 3000, { bold: true, shading: 'D5E8F0' }),
            cell('\u529F\u80FD', 6026, { bold: true, shading: 'D5E8F0' })
          ]}),
          new TableRow({ children: [ cell('Ctrl + P', 3000), cell('\u6253\u5F00\u547D\u4EE4\u9762\u677F', 6026) ]}),
          new TableRow({ children: [ cell('/', 3000), cell('\u805A\u7126\u641C\u7D22\u6846', 6026) ]}),
          new TableRow({ children: [ cell('Esc', 3000), cell('\u6E05\u7A7A\u641C\u7D20', 6026) ]}),
          new TableRow({ children: [ cell('Ctrl + Z', 3000), cell('\u64A4\u9500\u5220\u9664\uFF08\u4ECE\u56DE\u6536\u7AD9\u6062\u590D\uFF09', 6026) ]}),
          new TableRow({ children: [ cell('Super + Alt + S', 3000), cell('\u663E\u793A/\u9690\u85CF\u4FA7\u8FB9\u680F', 6026) ]}),
        ]
      }),

      // 4. 设置
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('\u56DB\u3001\u8BBE\u7F6E')] }),
      new Paragraph({ children: [new TextRun('\u70B9\u51FB\u4FA7\u8FB9\u680F \u2699 \u6309\u94AE\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\uFF0C\u53EF\u8C03\u6574\uFF1A')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u8BED\u8A00\u3001\u5206\u7EC4\u3001\u6807\u7B7E\u53EF\u89C1\u6027\u3001\u914D\u8272\u65B9\u6848')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5FEB\u6377\u952E\u5F55\u5236')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u684C\u5BA0\u8BBE\u7F6E\uFF08\u89D2\u8272/\u88C5\u626E/3D \u5F00\u5173\uFF09')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u5907\u4EFD\u4E0E\u5BFC\u5165')] }),

      // 5. 数据安全
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('\u4E94\u3001\u6570\u636E\u5B89\u5168')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u81EA\u52A8\u5907\u4EFD\uFF1A\u6BCF 4 \u5C0F\u65F6\u81EA\u52A8\u5907\u4EFD\u5230 ~/.stickytodo/backups/')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u624B\u52A8\u5907\u4EFD\uFF1A\u8BBE\u7F6E \u2192 \u5907\u4EFD \u2192 \u7ACB\u5373\u5907\u4EFD')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('\u56DE\u6536\u7AD9\uFF1A\u5220\u9664\u7684\u4FBF\u7B7E/\u5F85\u529E\u8FDB\u5165\u56DE\u6536\u7AD9\uFF0C30 \u5929\u540E\u6C38\u4E45\u5220\u9664')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun('Ctrl + Z \u53EF\u6062\u590D\u521A\u5220\u9664\u7684\u5185\u5BB9')] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, 'StickyTodo_UserManual_v2.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Written: ' + outPath);
});
