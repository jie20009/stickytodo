const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
        ShadingType, PageBreak, TabStopType, TabStopPosition } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.header ? { fill: "2E75B6", type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : undefined,
      children: [new TextRun({
        text,
        bold: opts.header || opts.bold,
        size: opts.header ? 22 : 20,
        font: "Microsoft YaHei",
        color: opts.header ? "FFFFFF" : "333333",
      })]
    })]
  });
}

function row(cells) {
  return new TableRow({ children: cells });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Microsoft YaHei", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Microsoft YaHei", color: "1F2937" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Microsoft YaHei", color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Microsoft YaHei", color: "374151" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 }
      }
    },
    children: [
      // === 封面标题 ===
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 200 },
        children: [new TextRun({ text: "StickyTodo", size: 56, bold: true, font: "Microsoft YaHei", color: "2E75B6" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "\u684C\u9762\u4FBF\u7B7E & \u5F85\u529E\u4FA7\u8FB9\u680F\u5E94\u7528", size: 32, font: "Microsoft YaHei", color: "6B7280" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: "\u4F7F\u7528\u64CD\u4F5C\u8BF4\u660E\u4E66", size: 28, font: "Microsoft YaHei", color: "6B7280" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "v2.0  |  Author: Jie_Sun\u5B59\u80DC\u6770", size: 22, font: "Microsoft YaHei", color: "9CA3AF" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Electron 33.4.11 + Vue 3.5.41 + sql.js (WASM SQLite)", size: 20, font: "Microsoft YaHei", color: "9CA3AF" })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 目录 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("\u76EE\u5F55")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u5E94\u7528\u7B80\u4ECB")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u5FEB\u901F\u5F00\u59CB")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u4E3B\u4FA7\u8FB9\u680F\u64CD\u4F5C")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u4FBF\u7B7E\u529F\u80FD")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u5F85\u529E\u529F\u80FD")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u72EC\u7ACB\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u8BBE\u7F6E")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u5FEB\u6377\u952E\u901F\u67E5")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u6570\u636E\u5B89\u5168")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("\u5E38\u89C1\u95EE\u9898")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 1. 应用简介 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. \u5E94\u7528\u7B80\u4ECB")] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("StickyTodo \u662F\u4E00\u6B3E\u8F7B\u91CF\u7EA7\u684C\u9762\u5E94\u7528\uFF0C\u5C06\u4FBF\u7B7E\u548C\u5F85\u529E\u7ED3\u5408\u5728\u4E00\u4E2A\u53F3\u4FA7\u8FB9\u680F\u4E2D\uFF0C\u59CB\u7EC8\u4FDD\u6301\u5728\u5C4F\u5E55\u8FB9\u7F18\uFF0C\u4E0D\u5360\u7528\u5927\u91CF\u684C\u9762\u7A7A\u95F4\u3002")] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun("\u4E3B\u8981\u7279\u70B9\uFF1A")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4FA7\u8FB9\u680F\u6A21\u5F0F \u2014 360px \u5BBD\u8FB9\u680F\uFF0C\u53EF\u6298\u53E0\u5230 16px\uFF0C\u60AC\u505C\u5C55\u5F00")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u72EC\u7ACB\u7A97\u53E3 \u2014 \u4EFB\u610F\u4FBF\u7B7E/\u5F85\u529E\u53EF\u5F39\u51FA\u4E3A\u72EC\u7ACB\u684C\u9762\u7A97\u53E3\uFF0C\u4E92\u4E0D\u5F71\u54CD")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5BCC\u6587\u672C\u7F16\u8F91 \u2014 \u7C97\u4F53/\u659C\u4F53/\u4E0B\u5212\u7EBF/\u5217\u8868/\u56FE\u7247/\u8868\u683C/\u4EE3\u7801\u5757")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Markdown \u652F\u6301 \u2014 \u8F93\u5165 # / - / > / ``` \u7B49\u52A0\u7A7A\u683C\u81EA\u52A8\u8F6C\u6362")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u53CC\u94FE [[\u4FBF\u7B7E\u6807\u9898]] \u2014 \u4FBF\u7B7E\u95F4\u4E92\u76F8\u5F15\u7528 + \u53CD\u5411\u94FE\u63A5\u8BA1\u6570")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4E09\u8BED\u8A00 \u2014 \u4E2D\u6587 / English / Ti\u1EBFng Vi\u1EC7t")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4E09\u5957\u914D\u8272 \u2014 \u7ECF\u5178\u6D45\u8272 / Windows \u4FBF\u7B7E / \u83AB\u5170\u8FEA")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6570\u636E\u672C\u5730\u5B58\u50A8 \u2014 \u65E0\u4E91\u7AEF\u3001\u65E0\u6CE8\u518C\u3001\u65E0\u9065\u6D4B")] }),

      // === 2. 快速开始 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. \u5FEB\u901F\u5F00\u59CB")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 \u542F\u52A8")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u53CC\u51FB StickyTodo.exe \u542F\u52A8\u5E94\u7528")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4FA7\u8FB9\u680F\u81EA\u52A8\u51FA\u73B0\u5728\u5C4F\u5E55\u53F3\u8FB9\u7F18")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u7CFB\u7EDF\u6258\u76D8\u51FA\u73B0\u5E94\u7528\u56FE\u6807\uFF0C\u53EF\u968F\u65F6\u663E\u793A/\u9690\u85CF")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 \u754C\u9762\u5E03\u5C40")] }),
      new Paragraph({ spacing: { after: 120 }, children: [
        new TextRun("\u5934\u90E8\u5DE5\u5177\u680F\uFF08\u4ECE\u5DE6\u5230\u53F3\uFF09\uFF1A"),
      ]}),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [2000, 7506],
        rows: [
          row([cell("\u6309\u94AE", 2000, { header: true }), cell("\u529F\u80FD", 7506, { header: true })]),
          row([cell("\u2600 / \u{1F319}", 2000), cell("\u5207\u6362\u4EAE\u8272/\u6697\u8272\u4E3B\u9898", 7506)]),
          row([cell("\u{1F310}", 2000), cell("\u5207\u6362\u8BED\u8A00\uFF08\u4E2D/\u82F1/\u8D8A\uFF09", 7506)]),
          row([cell("\u2699", 2000), cell("\u6253\u5F00\u8BBE\u7F6E\u9762\u677F", 7506)]),
          row([cell("\u6ED1\u5757", 2000), cell("\u8C03\u8282\u7A97\u53E3\u900F\u660E\u5EA6\uFF080.1\u20131.0\uFF09", 7506)]),
          row([cell("\u{1F4CC} / \u{1F4CD}", 2000), cell("\u7A97\u53E3\u7F6E\u9876\u5F00\u5173", 7506)]),
          row([cell("\u2B07", 2000), cell("\u5BFC\u51FA\u6570\u636E\uFF08JSON\uFF09", 7506)]),
          row([cell("\u25AC", 2000), cell("\u6700\u5C0F\u5316\u4FA7\u8FB9\u680F", 7506)]),
          row([cell("\u2715", 2000), cell("\u9690\u85CF\u4FA7\u8FB9\u680F\uFF08\u4E0D\u9000\u51FA\uFF0C\u72EC\u7ACB\u7A97\u53E3\u4FDD\u6301\uFF09", 7506)]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 3. 主侧边栏操作 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. \u4E3B\u4FA7\u8FB9\u680F\u64CD\u4F5C")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 \u6807\u7B7E\u9875")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [2000, 7506],
        rows: [
          row([cell("\u6807\u7B7E\u9875", 2000, { header: true }), cell("\u8BF4\u660E", 7506, { header: true })]),
          row([cell("\u5168\u90E8", 2000, { bold: true }), cell("\u9ED8\u8BA4\u6807\u7B7E\uFF0C\u5408\u5E76\u663E\u793A\u4FBF\u7B7E + \u5F85\u529E\uFF0C\u6309\u66F4\u65B0\u65F6\u95F4\u6392\u5E8F", 7506)]),
          row([cell("\u4FBF\u7B7E", 2000, { bold: true }), cell("\u4FBF\u7B7E\u5217\u8868\uFF0C\u652F\u6301\u62D6\u62FD\u6392\u5E8F\u3001\u641C\u7D22\u3001\u5206\u7EC4", 7506)]),
          row([cell("\u5F85\u529E", 2000, { bold: true }), cell("\u5F85\u529E\u5217\u8868\uFF0C\u652F\u6301\u4F18\u5148\u7EA7\u3001\u622A\u6B62\u65E5\u671F\u3001\u7B5B\u9009", 7506)]),
          row([cell("\u{1F4C8} \u65F6\u95F4\u7EBF", 2000), cell("\u6309\u65F6\u95F4\u987A\u5E8F\u5C55\u793A\u4FBF\u7B7E/\u5F85\u529E\u7684\u521B\u5EFA\u548C\u5B8C\u6210\u52A8\u6001\uFF08\u8BBE\u7F6E\u4E2D\u5F00\u542F\uFF09", 7506)]),
          row([cell("\u{1F5D1} \u56DE\u6536\u7AD9", 2000), cell("\u5DF2\u5220\u9664\u9879\uFF0C30\u5929\u81EA\u52A8\u6E05\u7406\uFF0C\u53EF\u6062\u590D\uFF08\u8BBE\u7F6E\u4E2D\u5F00\u542F\uFF09", 7506)]),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 \u6298\u53E0\u4E0E\u5C55\u5F00")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u70B9\u51FB\u5934\u90E8 \u2190/\u2192 \u6309\u94AE\u6298\u53E0/\u5C55\u5F00\u4FA7\u8FB9\u680F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6298\u53E0\u540E\u5BBD\u5EA6 16px\uFF0C\u9F20\u6807\u60AC\u505C\u81EA\u52A8\u5C55\u5F00")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u9F20\u6807\u79FB\u5F00\u540E\u4FDD\u6301\u5C55\u5F00\uFF0C\u9700\u624B\u52A8\u70B9\u51FB\u6298\u53E0")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 + \u53F7\u4E0B\u62C9\u83DC\u5355")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F6AA} \u4FBF\u7B7E\u72EC\u7ACB\u7A97\u53E3 \u2014 \u65B0\u5EFA\u5E76\u5F39\u51FA\u4FBF\u7B7E\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F6AA} \u5F85\u529E\u72EC\u7ACB\u7A97\u53E3 \u2014 \u65B0\u5EFA\u5E76\u5F39\u51FA\u5F85\u529E\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F4DD} \u4FBF\u7B7E\u4FA7\u8FB9\u680F \u2014 \u5728\u4FA7\u8FB9\u680F\u5185\u65B0\u5EFA\u4FBF\u7B7E")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u2713 \u5F85\u529E\u4FA7\u8FB9\u680F \u2014 \u5728\u4FA7\u8FB9\u680F\u5185\u65B0\u5EFA\u5F85\u529E")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 4. 便签功能 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. \u4FBF\u7B7E\u529F\u80FD")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 \u57FA\u672C\u64CD\u4F5C")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u65B0\u5EFA\uFF1A\u70B9 + \u53F7 \u2192 \u9009\u62E9\u5728\u4FA7\u8FB9\u680F/\u72EC\u7ACB\u7A97\u53E3\u65B0\u5EFA")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u7F16\u8F91\uFF1A\u70B9\u51FB\u4FBF\u7B7E\u5361\u7247\u6253\u5F00\u7F16\u8F91\u5668")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5220\u9664\uFF1A\u8F6F\u5220\u9664\u5230\u56DE\u6536\u7AD9\uFF0CCtrl+Z \u53EF\u64A4\u9500")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u590D\u5236\uFF1A\u{232C9} \u6309\u94AE\u590D\u5236\u4FBF\u7B7E\uFF08\u542B\u5185\u5BB9\u548C\u989C\u8272\uFF09")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5F52\u6863\uFF1A\u{1F4E6} \u6309\u94AE\u5F52\u6863\u4FBF\u7B7E\uFF0C\u53EF\u6062\u590D")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 7 \u8272\u6807\u7B7E + 3 \u5957\u914D\u8272")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [2376, 7130],
        rows: [
          row([cell("\u914D\u8272\u65B9\u6848", 2376, { header: true }), cell("\u989C\u8272\uFF08\u9EC4/\u7EFF/\u84DD/\u7C89/\u7070/\u7D2B/\u70AD\u9ED1\uFF09", 7130, { header: true })]),
          row([cell("\u7ECF\u5178\u6D45\u8272", 2376, { bold: true }), cell("\u67D4\u548C\u7684 Tailwind \u8272\u8C03\uFF0C\u9ED8\u8BA4\u65B9\u6848", 7130)]),
          row([cell("Windows \u4FBF\u7B7E", 2376, { bold: true }), cell("\u9AD8\u9971\u548C\u5EA6\uFF0C\u63A5\u8FD1 Windows \u539F\u751F\u4FBF\u7B7E\u989C\u8272", 7130)]),
          row([cell("\u83AB\u5170\u8FEA", 2376, { bold: true }), cell("\u4F4E\u9971\u548C\u5EA6\u67D4\u548C\u8272\u8C03\uFF0C\u62A4\u773C\u8212\u9002", 7130)]),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 \u5BCC\u6587\u672C\u7F16\u8F91")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5DE5\u5177\u680F\uFF1AB \u7C97\u4F53 / I \u659C\u4F53 / U \u4E0B\u5212\u7EBF / S \u5220\u9664\u7EBF / \u2022 \u5217\u8868 / 1. \u6709\u5E8F\u5217\u8868")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u63D2\u5165\u56FE\u7247\uFF1A\u62D6\u62FD / \u7C98\u8D34 / \u5DE5\u5177\u680F\u6309\u94AE\uFF0C\u53EF\u8C03\u6574\u5927\u5C0F\uFF08+/\u2212/\u53CC\u51FB\u91CD\u7F6E\uFF09")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Markdown\uFF1A\u884C\u9996\u8F93\u5165 # / ## / ### / - / * / 1. / > / | / ``` / --- \u52A0\u7A7A\u683C\u81EA\u52A8\u8F6C\u6362")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u659C\u6760\u547D\u4EE4\uFF1A\u7F16\u8F91\u5668\u5185\u8F93\u5165 / \u5F39\u51FA\u83DC\u5355\uFF08\u6807\u9898/\u5217\u8868/\u5F85\u529E/\u4EE3\u7801/\u5F15\u7528/\u8868\u683C/\u94FE\u63A5/\u56FE\u7247/\u65E5\u671F\uFF09")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 \u6807\u7B7E\u4E0E\u53CC\u94FE")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6807\u7B7E\uFF1A\u8F93\u5165 # \u52A0\u7A7A\u683C\u81EA\u52A8\u8BC6\u522B\uFF0C\u652F\u6301\u4E2D\u6587\u548C Unicode")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u53CC\u94FE\uFF1A\u8F93\u5165 [[\u4FBF\u7B7E\u6807\u9898]] \u521B\u5EFA\u8DE8\u4FBF\u7B7E\u94FE\u63A5\uFF0C\u81EA\u52A8\u8BA1\u7B97\u53CD\u5411\u94FE\u63A5")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u52A0\u5BC6\uFF1A\u5BC6\u7801\u4FDD\u62A4\u4FBF\u7B7E\u5185\u5BB9\uFF0C\u5185\u5BB9\u52A0\u5BC6\u5B58\u50A8")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u7248\u672C\u5386\u53F2\uFF1A\u81EA\u52A8\u4FDD\u5B58\u5185\u5BB9\u5FEB\u7167\uFF08\u6700\u591A 20 \u4E2A\uFF09\uFF0C\u53EF\u6062\u590D")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5206\u4EAB\u4E3A\u56FE\u7247\uFF1A\u5BFC\u51FA\u4FBF\u7B7E\u4E3A PNG \u5230\u684C\u9762")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 5. 待办功能 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. \u5F85\u529E\u529F\u80FD")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 \u57FA\u672C\u64CD\u4F5C")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u65B0\u5EFA\uFF1A\u70B9 + \u53F7 \u2192 \u9009\u62E9\u65B0\u5EFA\u5F85\u529E")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5B8C\u6210\uFF1A\u70B9\u51FB\u590D\u9009\u6846\u5207\u6362\u5B8C\u6210\u72B6\u6001")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5220\u9664\uFF1A\u8F6F\u5220\u9664\u5230\u56DE\u6536\u7AD9\uFF0CCtrl+Z \u53EF\u64A4\u9500")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 \u5C5E\u6027\u8BBE\u7F6E")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [1800, 7706],
        rows: [
          row([cell("\u5C5E\u6027", 1800, { header: true }), cell("\u8BF4\u660E", 7706, { header: true })]),
          row([cell("\u4F18\u5148\u7EA7", 1800, { bold: true }), cell("\u{1F534} \u9AD8 / \u{1F7E1} \u4E2D / \u{1F7E2} \u4F4E\uFF0C\u989C\u8272\u6807\u8BC6", 7706)]),
          row([cell("\u622A\u6B62\u65E5\u671F", 1800, { bold: true }), cell("\u652F\u6301\u65E5\u671F + \u65F6\u95F4\uFF0824\u5C0F\u65F6\u5236\uFF09\uFF0C\u5230\u671F\u524D5\u5206\u949F\u7CFB\u7EDF\u901A\u77E5", 7706)]),
          row([cell("\u5206\u7C7B", 1800, { bold: true }), cell("\u81EA\u5B9A\u4E49\u5206\u7C7B\u540D\u79F0\uFF08\u5DE5\u4F5C/\u751F\u6D3B/\u5B66\u4E60\u2026\uFF09", 7706)]),
          row([cell("\u5173\u8054\u4FBF\u7B7E", 1800, { bold: true }), cell("\u5C06\u5F85\u529E\u4E0E\u67D0\u4E2A\u4FBF\u7B7E\u5173\u8054", 7706)]),
          row([cell("\u6807\u7B7E", 1800, { bold: true }), cell("\u4E0E\u4FBF\u7B7E\u5171\u7528\u6807\u7B7E\u7CFB\u7EDF", 7706)]),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 \u5B50\u4EFB\u52A1\u4E0E\u91CD\u590D")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5B50\u4EFB\u52A1\uFF1A\u5F85\u529E\u4E0B\u53EF\u6DFB\u52A0\u5B50\u4EFB\u52A1\uFF0C\u7F29\u8FDB\u663E\u793A\uFF0C\u663E\u793A\u5B8C\u6210\u8FDB\u5EA6")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u91CD\u590D\u4EFB\u52A1\uFF1A\u8BBE\u7F6E\u6BCF\u65E5/\u6BCF\u5468/\u6BCF\u6708\u91CD\u590D\uFF0C\u5B8C\u6210\u540E\u81EA\u52A8\u91CD\u7F6E\u5E76\u63A8\u8FDB\u622A\u6B62\u65E5\u671F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u667A\u80FD\u65E5\u671F\uFF1A\u8F93\u5165 \u201C\u660E\u5929\u201D \u201C\u4E0B\u5468\u4E94\u201D \u7B49\u81EA\u52A8\u8BC6\u522B\u65E5\u671F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5185\u5D4C\u5F85\u529E\uFF1A\u4FBF\u7B7E\u5185\u53EF\u63D2\u5165\u5F85\u529E\u9879\uFF0C\u6253\u5F00\u4FBF\u7B7E\u5373\u770B\u5230")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 6. 独立窗口 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. \u72EC\u7ACB\u7A97\u53E3")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 \u5F39\u51FA\u72EC\u7ACB\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4FBF\u7B7E/\u5F85\u529E\u5361\u7247\u70B9 \u{1F4CC} \u6309\u94AE\u5F39\u51FA\u72EC\u7ACB\u684C\u9762\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u62D6\u62FD\u4FBF\u7B7E/\u5F85\u529E\u5361\u7247\u62D6\u51FA\u4FA7\u8FB9\u680F\u8FB9\u7F18\u81EA\u52A8\u5F39\u51FA")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u53F3\u952E\u83DC\u5355 \u2192 \u201C\u{1F6AA} \u5728\u7A97\u53E3\u4E2D\u6253\u5F00\u201D")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 \u72EC\u7ACB\u7A97\u53E3\u7279\u6027")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [2376, 7130],
        rows: [
          row([cell("\u7279\u6027", 2376, { header: true }), cell("\u8BF4\u660E", 7130, { header: true })]),
          row([cell("\u5F69\u8272\u6807\u9898\u680F", 2376, { bold: true }), cell("\u4FBF\u7B7E\u989C\u8272\u4F5C\u4E3A\u6807\u9898\u680F\u80CC\u666F\uFF0C\u53EF\u5B9E\u65F6\u5207\u6362", 7130)]),
          row([cell("\u6DF1\u8272\u7F16\u8F91\u533A", 2376, { bold: true }), cell("#2D2D2D \u6DF1\u8272\u80CC\u666F\uFF0C\u4E0D\u53D7\u4E3B\u9898\u5F71\u54CD", 7130)]),
          row([cell("\u5DE5\u5177\u680F\u81EA\u52A8\u9690\u85CF", 2376, { bold: true }), cell("\u5931\u7126\u65F6\u6807\u9898\u680F\u7F29\u4E3A\u5F69\u8272\u7A84\u6761\uFF0C\u805A\u7126\u65F6\u5C55\u5F00", 7130)]),
          row([cell("\u5B8C\u5168\u72EC\u7ACB", 2376, { bold: true }), cell("\u4E3B\u7A97\u53E3\u5173\u95ED\u4E0D\u5F71\u54CD\u72EC\u7ACB\u7A97\u53E3\uFF0C\u5404\u7A97\u53E3\u4E92\u4E0D\u5F71\u54CD", 7130)]),
          row([cell("\u4F4D\u7F6E\u8BB0\u5FC6", 2376, { bold: true }), cell("\u5173\u95ED\u540E\u91CD\u5F00\u6062\u590D\u539F\u4F4D\u7F6E\u548C\u5927\u5C0F", 7130)]),
        ]
      }),
      // Fix the broken row above (cell count mismatch)
      new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun("")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 \u7A97\u53E3\u5DE5\u5177\u680F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("+ \u53F7\uFF1A\u4E0B\u62C9\u83DC\u5355\u65B0\u5EFA\u4FBF\u7B7E/\u5F85\u529E\u7A97\u53E3")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F3A8} \u8C03\u8272\u76D8\uFF1A\u70B9\u51FB\u5F39\u51FA7\u8272\u9009\u62E9\u5668\uFF0C\u5B9E\u65F6\u53D8\u8272")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F4CC}/\u{1F4CD} \u7F6E\u9876\u5F00\u5173")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u{1F4F7} \u63D2\u5165\u56FE\u7247 + \u2212/+ \u8C03\u6574\u56FE\u7247\u5927\u5C0F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u00D7 \u5173\u95ED\u7A97\u53E3\uFF08\u7A7A\u5185\u5BB9\u81EA\u52A8\u5220\u9664\uFF09")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 7. 设置 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. \u8BBE\u7F6E")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 \u5916\u89C2")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4E3B\u9898\uFF1A\u4EAE\u8272/\u6697\u8272\u5207\u6362")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u914D\u8272\u65B9\u6848\uFF1A\u7ECF\u5178\u6D45\u8272 / Windows \u4FBF\u7B7E / \u83AB\u5170\u8FEA")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u8BED\u8A00\uFF1A\u4E2D\u6587 / English / Ti\u1EBFng Vi\u1EC7t")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u900F\u660E\u5EA6\uFF1A0.1\u20131.0 \u6ED1\u5757\u8C03\u8282")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 \u6807\u7B7E\u9875\u53EF\u89C1\u6027")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u52FE\u9009\u8981\u663E\u793A\u7684\u6807\u7B7E\u9875\uFF08\u5168\u90E8/\u4FBF\u7B7E/\u5F85\u529E/\u65F6\u95F4\u7EBF/\u56DE\u6536\u7AD9\uFF09")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u81F3\u5C11\u4FDD\u7559\u4E00\u4E2A\u6838\u5FC3\u6807\u7B7E\u9875\u663E\u793A")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 \u5FEB\u6377\u952E")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u70B9\u51FB\u5F55\u5236\u6309\u952E\uFF0C\u6309\u4E0B\u7EC4\u5408\u952E\u5373\u53EF\u8BBE\u7F6E")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u9ED8\u8BA4\uFF1AWin+Alt+S \u5207\u6362\u4FA7\u8FB9\u680F")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.4 \u5206\u7EC4")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6309\u65E5\u671F\u5206\u7EC4\uFF08\u4ECA\u5929/\u672C\u5468/\u66F4\u65E9\uFF09")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6309\u5B57\u6BCD A-Z \u5206\u7EC4")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4E0D\u5206\u7EC4")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.5 \u756A\u8304\u949F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4FA7\u8FB9\u680F\u5E95\u90E8\u756A\u8304\u949F\uFF0C25 \u5206\u949F\u5012\u8BA1\u65F6")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5F00\u59CB/\u6682\u505C/\u91CD\u7F6E\u63A7\u5236")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.6 \u7EDF\u8BA1")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u672C\u5468/\u672C\u6708\u5B8C\u6210\u7387\u8FDB\u5EA6\u6761")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u8FD1 7 \u5929\u5B8C\u6210\u6570\u91CF\u67F1\u72B6\u56FE")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 8. 快捷键速查 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. \u5FEB\u6377\u952E\u901F\u67E5")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [3000, 6506],
        rows: [
          row([cell("\u5FEB\u6377\u952E", 3000, { header: true, center: true }), cell("\u529F\u80FD", 6506, { header: true, center: true })]),
          row([cell("Win + Alt + S", 3000, { center: true, bold: true }), cell("\u5207\u6362\u4FA7\u8FB9\u680F\u663E\u793A/\u9690\u85CF\uFF08\u53EF\u914D\u7F6E\uFF09", 6506)]),
          row([cell("Ctrl + P", 3000, { center: true, bold: true }), cell("\u547D\u4EE4\u9762\u677F", 6506)]),
          row([cell("Ctrl + Z", 3000, { center: true, bold: true }), cell("\u64A4\u9500\u4E0A\u4E00\u4E2A\u5220\u9664", 6506)]),
          row([cell("Ctrl + B / I / U / T", 3000, { center: true, bold: true }), cell("\u7C97\u4F53 / \u659C\u4F53 / \u4E0B\u5212\u7EBF / \u5220\u9664\u7EBF", 6506)]),
          row([cell("Ctrl + Shift + L", 3000, { center: true, bold: true }), cell("\u5207\u6362\u5217\u8868", 6506)]),
          row([cell("/ + \u5173\u952E\u8BCD", 3000, { center: true, bold: true }), cell("\u659C\u6760\u547D\u4EE4\uFF08\u7F16\u8F91\u5668\u5185\uFF09", 6506)]),
          row([cell("[[ \u6807\u9898 ]]", 3000, { center: true, bold: true }), cell("\u53CC\u94FE\u521B\u5EFA\u8DE8\u4FBF\u7B7E\u94FE\u63A5", 6506)]),
          row([cell("# + \u7A7A\u683C", 3000, { center: true, bold: true }), cell("Markdown \u6807\u9898\u8F6C\u6362", 6506)]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 9. 数据安全 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. \u6570\u636E\u5B89\u5168")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.1 \u6570\u636E\u5B58\u50A8")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6240\u6709\u6570\u636E\u672C\u5730\u5B58\u50A8\u5728 ~/.stickytodo/ \u76EE\u5F55")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("data.db \u2014 SQLite \u6570\u636E\u5E93\uFF08\u4FBF\u7B7E\u3001\u5F85\u529E\u3001\u8BBE\u7F6E\u3001\u7248\u672C\uFF09")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("backups/ \u2014 \u81EA\u52A8\u5907\u4EFD\uFF08\u6BCF 4 \u5C0F\u65F6\uFF0C\u6700\u591A 10 \u4EFD\uFF09")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.2 \u5907\u4EFD\u4E0E\u6062\u590D")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u81EA\u52A8\u5907\u4EFD\uFF1A\u6BCF 4 \u5C0F\u65F6\u81EA\u52A8\u5907\u4EFD\u5230 backups/ \u76EE\u5F55")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u624B\u52A8\u5907\u4EFD\uFF1A\u8BBE\u7F6E \u2192 \u6570\u636E\u5907\u4EFD \u2192 \u7ACB\u5373\u5907\u4EFD")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u6062\u590D\uFF1A\u70B9\u51FB\u5907\u4EFD\u5217\u8868\u4E2D\u7684\u201C\u6062\u590D\u201D\uFF0C\u5E94\u7528\u81EA\u52A8\u91CD\u542F")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u4FDD\u7559\u6700\u591A 10 \u4EFD\u5907\u4EFD\uFF0C\u8D85\u51FA\u81EA\u52A8\u5220\u9664\u6700\u65E7\u7684")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.3 \u5BFC\u5165\u5BFC\u51FA")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5BFC\u51FA\uFF1A\u5934\u90E8 \u2B07 \u6309\u94AE\uFF0C\u5BFC\u51FA\u4E3A JSON \u5230\u684C\u9762")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5BFC\u5165\uFF1A\u8BBE\u7F6E \u2192 \u6570\u636E\u5BFC\u5165\uFF0C\u9009\u62E9 JSON \u6587\u4EF6")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.4 \u56DE\u6536\u7AD9")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u5220\u9664\u7684\u4FBF\u7B7E/\u5F85\u529E\u8FDB\u5165\u56DE\u6536\u7AD9\uFF0C30 \u5929\u540E\u81EA\u52A8\u6E05\u7406")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Ctrl+Z \u53EF\u64A4\u9500\u521A\u5220\u9664\u7684\u9879")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("\u56DE\u6536\u7AD9\u53EF\u624B\u52A8\u6062\u590D\u6216\u6C38\u4E45\u5220\u9664")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // === 10. 常见问题 ===
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. \u5E38\u89C1\u95EE\u9898")] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [3500, 6006],
        rows: [
          row([cell("\u95EE\u9898", 3500, { header: true }), cell("\u89E3\u51B3\u65B9\u6848", 6006, { header: true })]),
          row([cell("\u4FA7\u8FB9\u680F\u4E0D\u89C1\u4E86", 3500, { bold: true }), cell("\u70B9\u7CFB\u7EDF\u6258\u76D8\u56FE\u6807\u6216\u6309 Win+Alt+S", 6006)]),
          row([cell("\u72EC\u7ACB\u7A97\u53E3\u5173\u4E86\u4E3B\u7A97\u53E3\u4E5F\u5173\u4E86", 3500, { bold: true }), cell("\u72EC\u7ACB\u7A97\u53E3\u5B8C\u5168\u72EC\u7ACB\uFF0C\u5173\u95ED\u4E3B\u7A97\u53E3\u4E0D\u5F71\u54CD\u5B83\u4EEC", 6006)]),
          row([cell("\u5982\u4F55\u5F0F\u9000\u51FA\u5E94\u7528", 3500, { bold: true }), cell("\u7CFB\u7EDF\u6258\u76D8 \u2192 \u53F3\u952E \u2192 Quit StickyTodo", 6006)]),
          row([cell("\u72EC\u7ACB\u7A97\u53E3\u6807\u9898\u680F\u592A\u7A84", 3500, { bold: true }), cell("\u70B9\u51FB\u7A97\u53E3\u6216\u9F20\u6807\u79FB\u5165\u5373\u5C55\u5F00\u5B8C\u6574\u6807\u9898\u680F", 6006)]),
          row([cell("\u989C\u8272\u9009\u62E9\u5668\u70B9\u4E0D\u51FA", 3500, { bold: true }), cell("\u70B9\u51FB \u{1F3A8} \u6309\u94AE\u5373\u53EF\u5F39\u51FA7\u8272\u9009\u62E9\u5668", 6006)]),
          row([cell("\u6570\u636E\u5728\u54EA\u91CC", 3500, { bold: true }), cell("~/.stickytodo/data.db\uFF0C\u53EF\u901A\u8FC7\u5BFC\u51FA\u5907\u4EFD", 6006)]),
          row([cell("\u5B89\u5168\u5220\u9664\u540E\u5982\u4F55\u6062\u590D", 3500, { bold: true }), cell("\u56DE\u6536\u7AD9\u6807\u7B7E\u9875 \u2192 \u70B9 \u21A9 \u6062\u590D\uFF0C\u6216\u6309 Ctrl+Z", 6006)]),
        ]
      }),

      // === 结尾 ===
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u2014\u2014 StickyTodo v2.0 \u00A9JIE_SUN\u5B59\u80DC\u6770 \u2014\u2014", size: 20, color: "9CA3AF", font: "Microsoft YaHei" })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = process.argv[2] || "StickyTodo_UserManual.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath);
});
