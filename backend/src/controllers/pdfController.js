const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');
const pool = require('../db/index');
const { generateDocumentContent } = require('./documentController');

const safeJsonParse = (value) => {
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

const chineseFontPaths = [
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/Library/Fonts/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/noto-cjk/NotoSansCJKsc-Regular.otf'
];

let resolvedFontPath = null;
for (const p of chineseFontPaths) {
  if (fs.existsSync(p)) {
    resolvedFontPath = p;
    break;
  }
}

if (!resolvedFontPath) {
  console.warn('[PDF] 警告: 未找到中文字体，PDF中的中文可能显示为方块');
}

const fonts = resolvedFontPath
  ? {
      Chinese: {
        normal: resolvedFontPath,
        bold: resolvedFontPath,
        italics: resolvedFontPath,
        bolditalics: resolvedFontPath
      }
    }
  : {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

const FONT_NAME = resolvedFontPath ? 'Chinese' : 'Roboto';

const printer = new PdfPrinter(fonts);

const parseMarkdownToPdfContent = (text) => {
  const lines = text.split('\n');
  const content = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('# ')) {
      content.push({
        text: trimmed.substring(2),
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 20, 0, 16],
        font: FONT_NAME
      });
    } else if (trimmed.startsWith('## ')) {
      content.push({
        text: trimmed.substring(3),
        fontSize: 14,
        bold: true,
        margin: [0, 16, 0, 10],
        font: FONT_NAME
      });
    } else if (trimmed.startsWith('### ')) {
      content.push({
        text: trimmed.substring(4),
        fontSize: 12,
        bold: true,
        margin: [0, 12, 0, 8],
        font: FONT_NAME
      });
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s(.*)$/);
      if (match) {
        content.push({
          columns: [
            {
              text: match[1],
              width: 'auto',
              fontSize: 11,
              font: FONT_NAME
            },
            {
              text: match[2],
              width: '*',
              fontSize: 11,
              font: FONT_NAME
            }
          ],
          margin: [20, 2, 0, 2],
          columnGap: 6
        });
      } else {
        content.push({
          text: trimmed,
          fontSize: 11,
          margin: [20, 2, 0, 2],
          font: FONT_NAME
        });
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      content.push({
        text: [
          { text: '\u2022 ', fontSize: 11, font: FONT_NAME },
          { text: trimmed.substring(2), fontSize: 11, font: FONT_NAME }
        ],
        margin: [20, 2, 0, 2]
      });
    } else if (trimmed === '__________________' || trimmed === '___') {
      content.push({
        text: '__________________',
        fontSize: 11,
        margin: [0, 4, 0, 4],
        font: FONT_NAME
      });
    } else {
      content.push({
        text: trimmed,
        fontSize: 11,
        margin: [0, 2, 0, 2],
        font: FONT_NAME
      });
    }
  }

  return content;
};

const buildDocDefinition = (title, pdfContent, options = {}) => {
  const { signatures = [], signDate = null, customHeaders = null } = options;

  const signContent = [];
  if (signatures && signatures.length > 0) {
    signContent.push({
      text: '签署页',
      fontSize: 16,
      bold: true,
      alignment: 'center',
      margin: [0, 30, 0, 20],
      font: FONT_NAME,
      pageBreak: 'before'
    });

    if (signDate) {
      signContent.push({
        text: `签署日期：${signDate}`,
        fontSize: 11,
        alignment: 'right',
        margin: [0, 0, 0, 20],
        font: FONT_NAME
      });
    }

    const signRows = [];
    for (let i = 0; i < signatures.length; i += 2) {
      const row = [];
      for (let j = 0; j < 2; j++) {
        const sig = signatures[i + j];
        if (sig) {
          const sigItems = [];
          sigItems.push({
            text: sig.role || '签署人',
            fontSize: 12,
            bold: true,
            margin: [0, 0, 0, 8],
            font: FONT_NAME
          });
          if (sig.name) {
            sigItems.push({
              text: `姓名：${sig.name}`,
              fontSize: 11,
              margin: [0, 0, 0, 6],
              font: FONT_NAME
            });
          }
          if (sig.signatureImage) {
            const imgData = sig.signatureImage.startsWith('data:')
              ? sig.signatureImage
              : `data:image/png;base64,${sig.signatureImage}`;
            sigItems.push({
              image: imgData,
              width: 140,
              height: 70,
              margin: [0, 4, 0, 6]
            });
          } else {
            sigItems.push({
              canvas: [
                {
                  type: 'line',
                  x1: 0, y1: 20,
                  x2: 140, y2: 20,
                  lineWidth: 1
                }
              ],
              margin: [0, 4, 0, 6]
            });
          }
          if (sig.date) {
            sigItems.push({
              text: `日期：${sig.date}`,
              fontSize: 10,
              color: '#666666',
              font: FONT_NAME
            });
          }
          row.push({
            stack: sigItems,
            width: '50%',
            margin: [0, 0, 20, 30]
          });
        } else {
          row.push({ text: '', width: '50%' });
        }
      }
      signRows.push({ columns: row, columnGap: 20 });
    }

    signContent.push(...signRows);
  }

  return {
    pageSize: 'A4',
    pageMargins: [60, 70, 60, 60],
    header: customHeaders || ((currentPage) => {
      if (currentPage === 1) return {};
      return {
        text: title,
        alignment: 'center',
        margin: [0, 30, 0, 0],
        fontSize: 9,
        color: '#999999',
        font: FONT_NAME
      };
    }),
    footer: (currentPage, pageCount) => ({
      text: `— ${currentPage} / ${pageCount} —`,
      alignment: 'center',
      margin: [0, 20, 0, 0],
      fontSize: 9,
      color: '#999999',
      font: FONT_NAME
    }),
    content: [
      {
        text: title,
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 30],
        font: FONT_NAME
      },
      ...pdfContent,
      ...signContent
    ],
    defaultStyle: {
      font: FONT_NAME,
      fontSize: 11,
      lineHeight: 1.8
    },
    styles: {
      title: {
        fontSize: 22,
        bold: true,
        alignment: 'center',
        font: FONT_NAME
      },
      header2: {
        fontSize: 14,
        bold: true,
        font: FONT_NAME
      },
      header3: {
        fontSize: 12,
        bold: true,
        font: FONT_NAME
      }
    }
  };
};

const generatePdf = async (req, res) => {
  try {
    const { documentId, templateId, formData } = req.body;

    let content;
    let title;

    if (documentId) {
      const [docRows] = await pool.execute(
        'SELECT d.*, t.title as template_title FROM documents d LEFT JOIN templates t ON d.template_id = t.id WHERE d.id = ?',
        [documentId]
      );

      if (docRows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '文档不存在'
        });
      }

      const doc = docRows[0];
      const contentObj = safeJsonParse(doc.content);
      content = contentObj.text;
      title = doc.title;
    } else if (templateId && formData) {
      const [tplRows] = await pool.execute(
        'SELECT * FROM templates WHERE id = ?',
        [templateId]
      );

      if (tplRows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '模板不存在'
        });
      }

      const template = tplRows[0];
      content = generateDocumentContent(template.content, formData);
      title = template.title;
    } else {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    const pdfContent = parseMarkdownToPdfContent(content);
    const docDefinition = buildDocDefinition(title, pdfContent);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = Buffer.concat(chunks);
      const base64 = result.toString('base64');

      res.json({
        code: 200,
        message: 'success',
        data: {
          base64: base64,
          filename: `${title}.pdf`
        }
      });
    });

    pdfDoc.end();

  } catch (error) {
    console.error('生成PDF失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const downloadPdf = async (req, res) => {
  try {
    const { documentId } = req.params;

    const [docRows] = await pool.execute(
      'SELECT d.*, t.title as template_title FROM documents d LEFT JOIN templates t ON d.template_id = t.id WHERE d.id = ?',
      [documentId]
    );

    if (docRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文档不存在'
      });
    }

    const doc = docRows[0];
    const contentObj = safeJsonParse(doc.content);
    const content = contentObj.text;
    const title = doc.title;

    const pdfContent = parseMarkdownToPdfContent(content);
    const docDefinition = buildDocDefinition(title, pdfContent);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.pdf"`);

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('下载PDF失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const generateSignedPdf = async (req, res) => {
  try {
    const {
      documentId,
      templateId,
      formData,
      content,
      title,
      signatures = [],
      signDate
    } = req.body;

    let finalContent;
    let finalTitle = title;

    if (content) {
      finalContent = content;
    } else if (documentId) {
      const [docRows] = await pool.execute(
        'SELECT d.*, t.title as template_title FROM documents d LEFT JOIN templates t ON d.template_id = t.id WHERE d.id = ?',
        [documentId]
      );

      if (docRows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '文档不存在'
        });
      }

      const doc = docRows[0];
      const contentObj = safeJsonParse(doc.content);
      finalContent = contentObj.text;
      finalTitle = finalTitle || doc.title;
    } else if (templateId && formData) {
      const [tplRows] = await pool.execute(
        'SELECT * FROM templates WHERE id = ?',
        [templateId]
      );

      if (tplRows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '模板不存在'
        });
      }

      const template = tplRows[0];
      finalContent = generateDocumentContent(template.content, formData);
      finalTitle = finalTitle || template.title;
    } else {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：content 或 documentId 或 (templateId + formData)'
      });
    }

    const pdfContent = parseMarkdownToPdfContent(finalContent);
    const options = { signatures, signDate };
    const docDefinition = buildDocDefinition(finalTitle, pdfContent, options);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = Buffer.concat(chunks);
      const base64 = result.toString('base64');

      res.json({
        code: 200,
        message: 'success',
        data: {
          base64: base64,
          filename: `${finalTitle}_签署版.pdf`,
          signed: true,
          signCount: signatures.length
        }
      });
    });

    pdfDoc.end();

  } catch (error) {
    console.error('生成签署版PDF失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const downloadSignedPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT v.*, d.title as document_title FROM document_versions v LEFT JOIN documents d ON v.document_id = d.id WHERE v.id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '签署版本不存在'
      });
    }

    const version = rows[0];
    const contentObj = safeJsonParse(version.content);
    const signatures = safeJsonParse(version.signatures) || [];
    const finalContent = contentObj.text || contentObj || '';
    const finalTitle = version.title || version.document_title;

    const pdfContent = parseMarkdownToPdfContent(finalContent);
    const options = { signatures, signDate: version.sign_date };
    const docDefinition = buildDocDefinition(finalTitle, pdfContent, options);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const filename = `${finalTitle}_v${version.version_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('下载签署版PDF失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  generatePdf,
  downloadPdf,
  generateSignedPdf,
  downloadSignedPdf
};
