const pool = require('../db/index');

const getTemplateList = async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT id, title, type, description, created_at FROM templates';
    const params = [];
    
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(sql, params);
    res.json({
      code: 200,
      message: 'success',
      data: rows
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const getTemplateDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT id, title, type, description, content, fields, created_at, updated_at FROM templates WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '模板不存在'
      });
    }
    
    const template = rows[0];
    template.fields = JSON.parse(template.fields);
    
    res.json({
      code: 200,
      message: 'success',
      data: template
    });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { title, type, description, content, fields } = req.body;
    
    if (!title || !type || !content || !fields) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO templates (title, type, description, content, fields) VALUES (?, ?, ?, ?, ?)',
      [title, type, description || '', content, JSON.stringify(fields)]
    );
    
    res.json({
      code: 200,
      message: '创建成功',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  getTemplateList,
  getTemplateDetail,
  createTemplate
};
