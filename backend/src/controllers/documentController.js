const pool = require('../db/index');
const { v4: uuidv4 } = require('uuid');

const generateDocumentContent = (templateContent, formData) => {
  let content = templateContent;
  Object.keys(formData).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = formData[key] || '';
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, value);
  });
  return content;
};

const getDocumentList = async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const userId = req.session.userId;
    
    let sql = `
      SELECT d.id, d.title, d.template_id, t.title as template_title, d.created_at, d.updated_at
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE 1=1
    `;
    const params = [];
    
    if (userId) {
      sql += ' AND d.user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND d.session_id = ?';
      params.push(sessionId);
    }
    
    sql += ' ORDER BY d.created_at DESC';
    
    const [rows] = await pool.execute(sql, params);
    
    res.json({
      code: 200,
      message: 'success',
      data: rows
    });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const getDocumentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;
    
    let sql = `
      SELECT d.*, t.title as template_title, t.content as template_content, t.fields as template_fields
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = ?
    `;
    const params = [id];
    
    if (userId) {
      sql += ' AND d.user_id = ?';
      params.push(userId);
    } else {
      sql += ' AND d.session_id = ?';
      params.push(sessionId);
    }
    
    const [rows] = await pool.execute(sql, params);
    
    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文档不存在'
      });
    }
    
    const doc = rows[0];
    doc.form_data = JSON.parse(doc.form_data);
    doc.content = JSON.parse(doc.content);
    doc.template_fields = JSON.parse(doc.template_fields);
    
    res.json({
      code: 200,
      message: 'success',
      data: doc
    });
  } catch (error) {
    console.error('获取文档详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const createDocument = async (req, res) => {
  try {
    const { templateId, formData, title } = req.body;
    const sessionId = req.sessionID;
    const userId = req.session.userId;
    
    if (!templateId || !formData) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }
    
    const [templateRows] = await pool.execute(
      'SELECT * FROM templates WHERE id = ?',
      [templateId]
    );
    
    if (templateRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '模板不存在'
      });
    }
    
    const template = templateRows[0];
    const content = generateDocumentContent(template.content, formData);
    
    const docTitle = title || `${template.title} - ${new Date().toLocaleDateString()}`;
    
    const [result] = await pool.execute(
      'INSERT INTO documents (template_id, title, content, form_data, session_id, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [templateId, docTitle, JSON.stringify({ text: content, html: '' }), JSON.stringify(formData), sessionId, userId || null]
    );
    
    res.json({
      code: 200,
      message: '创建成功',
      data: {
        id: result.insertId,
        title: docTitle,
        content
      }
    });
  } catch (error) {
    console.error('创建文档失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.userId;
    
    let sql = 'DELETE FROM documents WHERE id = ?';
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
        message: '文档不存在或无权限删除'
      });
    }
    
    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  getDocumentList,
  getDocumentDetail,
  createDocument,
  deleteDocument,
  generateDocumentContent
};
