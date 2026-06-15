const pool = require('../db/index');

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

const safeJsonStringify = (value) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value || []);
};

const getClauseList = async (req, res) => {
  try {
    const { category, keyword, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT * FROM clauses WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ? OR keywords LIKE ? OR category LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    const [countRows] = await pool.query(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countRows[0].total;

    sql += ' ORDER BY weight DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), (Number(page) - 1) * Number(pageSize));

    const [rows] = await pool.query(sql, params);

    const data = rows.map(row => ({
      ...row,
      tags: safeJsonParse(row.tags),
      applicable_templates: safeJsonParse(row.applicable_templates)
    }));

    res.json({
      code: 200,
      message: 'success',
      data: {
        list: data,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取条款列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const getClauseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM clauses WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '条款不存在'
      });
    }

    const row = rows[0];
    const data = {
      ...row,
      tags: safeJsonParse(row.tags),
      applicable_templates: safeJsonParse(row.applicable_templates)
    };

    res.json({
      code: 200,
      message: 'success',
      data
    });
  } catch (error) {
    console.error('获取条款详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const createClause = async (req, res) => {
  try {
    const { title, content, category, tags, applicable_templates, keywords, weight, is_default } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填参数：title、content'
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO clauses (title, content, category, tags, applicable_templates, keywords, weight, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        content,
        category || '',
        safeJsonStringify(tags),
        safeJsonStringify(applicable_templates),
        keywords || '',
        Number(weight) || 0,
        is_default ? 1 : 0
      ]
    );

    res.json({
      code: 200,
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('创建条款失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const updateClause = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, applicable_templates, keywords, weight, is_default } = req.body;

    const [exists] = await pool.execute('SELECT id FROM clauses WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '条款不存在'
      });
    }

    await pool.execute(
      'UPDATE clauses SET title=?, content=?, category=?, tags=?, applicable_templates=?, keywords=?, weight=?, is_default=?, updated_at=NOW() WHERE id=?',
      [
        title || exists[0].title,
        content || exists[0].content,
        category !== undefined ? category : exists[0].category,
        tags !== undefined ? safeJsonStringify(tags) : exists[0].tags,
        applicable_templates !== undefined ? safeJsonStringify(applicable_templates) : exists[0].applicable_templates,
        keywords !== undefined ? keywords : exists[0].keywords,
        weight !== undefined ? Number(weight) : exists[0].weight,
        is_default !== undefined ? (is_default ? 1 : 0) : exists[0].is_default,
        id
      ]
    );

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新条款失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const deleteClause = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM clauses WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '条款不存在'
      });
    }

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除条款失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT category, COUNT(*) as count FROM clauses WHERE category IS NOT NULL AND category != "" GROUP BY category ORDER BY count DESC'
    );
    res.json({
      code: 200,
      message: 'success',
      data: rows
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

const recommendClauses = async (req, res) => {
  try {
    const { templateType, templateTitle, formData, limit = 8 } = req.query;

    if (!templateType && !templateTitle) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：templateType 或 templateTitle'
      });
    }

    const [allRows] = await pool.execute('SELECT * FROM clauses');

    const formDataObj = typeof formData === 'string' ? safeJsonParse(formData) : (formData || {});

    const candidates = allRows.map(row => {
      const applicable = safeJsonParse(row.applicable_templates) || [];
      const tags = safeJsonParse(row.tags) || [];
      const keywords = (row.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
      const category = row.category || '';

      let score = Number(row.weight) || 0;

      const typeMatch = applicable.some(t =>
        String(t).toLowerCase() === String(templateType).toLowerCase() ||
        String(t).toLowerCase() === String(templateTitle).toLowerCase()
      );
      if (typeMatch) score += 20;

      if (applicable.length === 1 && applicable[0] === 'contract' && templateType === 'contract') {
        score += 15;
      }

      const categoryLower = category.toLowerCase();
      const titleLower = (templateTitle || '').toLowerCase();
      const typeLower = (templateType || '').toLowerCase();
      if (titleLower.includes(categoryLower) || typeLower.includes(categoryLower)) {
        score += 10;
      }

      const allFormText = Object.values(formDataObj)
        .map(v => String(v || ''))
        .join(' ')
        .toLowerCase();

      keywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        if (allFormText.includes(kwLower)) {
          score += 5;
        }
        if (titleLower.includes(kwLower) || typeLower.includes(kwLower)) {
          score += 3;
        }
      });

      tags.forEach(tag => {
        const tagLower = String(tag).toLowerCase();
        if (allFormText.includes(tagLower)) score += 2;
      });

      if (row.is_default) score += 5;

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        category,
        tags,
        applicable_templates: applicable,
        weight: row.weight,
        is_default: row.is_default,
        score
      };
    });

    candidates.sort((a, b) => b.score - a.score);

    const unique = [];
    const seen = new Set();
    for (const c of candidates) {
      if (!seen.has(c.title)) {
        seen.add(c.title);
        unique.push(c);
      }
    }

    const result = unique.slice(0, Number(limit));

    res.json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    console.error('推荐条款失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

module.exports = {
  getClauseList,
  getClauseDetail,
  createClause,
  updateClause,
  deleteClause,
  getCategories,
  recommendClauses
};
