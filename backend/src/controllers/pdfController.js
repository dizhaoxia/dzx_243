const PdfPrinter = require('pdfmake');
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

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

const parseMarkdownToPdfContent = (markdownText) => {
  const lines = markdownText.trim().split('\n');
  const content = [];
  let inList = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      content.push({ text: ' ', margin: [0, 5] });
      continue;
    }
    
    if (trimmed.startsWith('# ')) {
      content.push({
        text: trimmed.substring(2),
        style: 'title',
        margin: [0, 10, 0, 10]
      });
    } else if (trimmed.startsWith('## ')) {
      content.push({
        text: trimmed.substring(3),
        style: 'header2',
        margin: [0, 10, 0, 5]
      });
    } else if (trimmed.startsWith('### ')) {
      content.push({
        text: trimmed.substring(4),
        style: 'header3',
        margin: [0, 5, 0, 3]
      });
    } else if (/^\d+\./.test(trimmed)) {
      content.push({
        text: trimmed,
        margin: [20, 2]
      });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      content.push({
        text: '• ' + trimmed.substring(2),
        margin: [15, 2]
      });
    } else {
      content.push({
        text: trimmed,
        margin: [0, 2]
      });
    }
  }
  
  return content;
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
    
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [50, 60, 50, 60],
      header: {
        text: title,
        alignment: 'center',
        margin: [0, 20, 0, 10],
        fontSize: 10,
        color: '#666'
      },
      footer: (currentPage, pageCount) => ({
        text: `第 ${currentPage} 页 / 共 ${pageCount} 页`,
        alignment: 'center',
        margin: [0, 20, 0, 0],
        fontSize: 8,
        color: '#999'
      }),
      content: pdfContent,
      styles: {
        title: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
          margin: [0, 10, 0, 20]
        },
        header2: {
          fontSize: 14,
          bold: true,
          margin: [0, 15, 0, 8]
        },
        header3: {
          fontSize: 12,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        body: {
          fontSize: 10,
          lineHeight: 1.5
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.8
      }
    };
    
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
    
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [50, 60, 50, 60],
      header: {
        text: title,
        alignment: 'center',
        margin: [0, 20, 0, 10],
        fontSize: 10,
        color: '#666'
      },
      footer: (currentPage, pageCount) => ({
        text: `第 ${currentPage} 页 / 共 ${pageCount} 页`,
        alignment: 'center',
        margin: [0, 20, 0, 0],
        fontSize: 8,
        color: '#999'
      }),
      content: pdfContent,
      styles: {
        title: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
          margin: [0, 10, 0, 20]
        },
        header2: {
          fontSize: 14,
          bold: true,
          margin: [0, 15, 0, 8]
        },
        header3: {
          fontSize: 12,
          bold: true,
          margin: [0, 10, 0, 5]
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.8
      }
    };
    
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

module.exports = {
  generatePdf,
  downloadPdf
};
