const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const templateRoutes = require('./routes/templates');
const documentRoutes = require('./routes/documents');
const pdfRoutes = require('./routes/pdf');
const clauseRoutes = require('./routes/clauses');
const versionRoutes = require('./routes/versions');

const app = express();
const PORT = 3099;

app.use(cors({
  origin: 'http://localhost:5433',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(session({
  secret: 'legal-doc-generator-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/templates', templateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/clauses', clauseRoutes);
app.use('/api/versions', versionRoutes);

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`法律文书生成平台后端服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api/health`);
});

module.exports = app;
