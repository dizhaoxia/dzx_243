const pool = require('../db/index');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const safeJsonParse = (value) => {
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
};

const ensureUploadsDir = () => {
  const dir = path.join(__dirname, '..', '..', 'uploads', 'pdfs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getVersionList = async (req, res) => {
  try {
    const { documentId } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    let sql = `
      SELECT v.*, d.title as document_title, d.template_id
      FROM document_versions v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE v.document_id = ?
    `;
    const params = [documentId];

    if (userId) {
      sql += ' AND v.user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND v.session_id = ?';
      params.push(sessionId);
    }

    sql += ' ORDER BY v.version_number DESC, v.created_at DESC';

    const [rows] = await pool.execute(sql, params);

    const data = rows.map(row => ({
      ...row,
      content: safeJsonParse(row.content),
      form_data: safeJsonParse(row.form_data),
      signatures: safeJsonParse(row.signatures)
    }));

    res.json({
      code: 200,
      message: 'success',
      data
    });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const getVersionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    let sql = `
      SELECT v.*, d.title as document_title, d.template_id
      FROM document_versions v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE v.id = ?
    `;
    const params = [id];

    if (userId) {
      sql += ' AND v.user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND v.session_id = ?';
      params.push(sessionId);
    }

    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '版本不存在'
      });
    }

    const row = rows[0];
    const data = {
      ...row,
      content: safeJsonParse(row.content),
      form_data: safeJsonParse(row.form_data),
      signatures: safeJsonParse(row.signatures)
    };

    res.json({
      code: 200,
      message: 'success',
      data
    });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const createVersion = async (req, res) => {
  try {
    const {
      documentId,
      title,
      content,
      formData,
      signatures,
      signDate,
      pdfBase64,
      remark
    } = req.body;
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    if (!documentId) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：documentId'
      });
    }

    const [docRows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (docRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文档不存在'
      });
    }

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM document_versions WHERE document_id = ?',
      [documentId]
    );
    const versionNumber = countRows[0].count + 1;

    let filePath = null;
    if (pdfBase64) {
      try {
        const uploadDir = ensureUploadsDir();
        const filename = `doc_${documentId}_v${versionNumber}_${Date.now()}.pdf`;
        filePath = path.join(uploadDir, filename);
        const buffer = Buffer.from(pdfBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
        filePath = `/uploads/pdfs/${filename}`;
      } catch (e) {
        console.warn('保存PDF文件失败:', e.message);
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO document_versions 
       (document_id, version_number, title, content, form_data, signatures, sign_date, pdf_base64, file_path, remark, session_id, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        versionNumber,
        title || docRows[0].title,
        content ? JSON.stringify(content) : docRows[0].content,
        formData ? JSON.stringify(formData) : docRows[0].form_data,
        signatures ? JSON.stringify(signatures) : JSON.stringify([]),
        signDate || new Date().toISOString().split('T')[0],
        pdfBase64 || null,
        filePath,
        remark || '',
        sessionId,
        userId || null
      ]
    );

    res.json({
      code: 200,
      message: '版本创建成功',
      data: {
        id: result.insertId,
        versionNumber,
        filePath
      }
    });
  } catch (error) {
    console.error('创建版本失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const deleteVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    let sql = 'DELETE FROM document_versions WHERE id = ?';
    const params = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND session_id = ?';
      params.push(sessionId);
    }

    const [result] = await pool.execute(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '版本不存在或无权限删除'
      });
    }

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除版本失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const downloadVersionPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    let sql = 'SELECT * FROM document_versions WHERE id = ?';
    const params = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND session_id = ?';
      params.push(sessionId);
    }

    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '版本不存在'
      });
    }

    const version = rows[0];
    const filename = `${version.title || 'document'}_v${version.version_number}.pdf`;

    if (version.file_path) {
      const absPath = path.join(__dirname, '..', '..', version.file_path);
      if (fs.existsSync(absPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        return fs.createReadStream(absPath).pipe(res);
      }
    }

    if (version.pdf_base64) {
      const buffer = Buffer.from(version.pdf_base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    }

    res.status(404).json({
      code: 404,
      message: 'PDF文件不存在'
    });
  } catch (error) {
    console.error('下载版本PDF失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  getVersionList,
  getVersionDetail,
  createVersion,
  deleteVersion,
  downloadVersionPdf
};
