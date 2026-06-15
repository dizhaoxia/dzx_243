const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const initDatabase = async () => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('开始初始化数据库...');
    
    await connection.query('CREATE DATABASE IF NOT EXISTS legal_doc_generator DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.query('USE legal_doc_generator');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        type ENUM('contract', 'pleading', 'other') NOT NULL DEFAULT 'contract',
        description TEXT,
        content TEXT NOT NULL,
        fields JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content JSON NOT NULL,
        form_data JSON NOT NULL,
        session_id VARCHAR(100),
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        INDEX idx_session (session_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clauses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        tags JSON,
        applicable_templates JSON,
        keywords TEXT,
        weight INT DEFAULT 0,
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        version_number INT NOT NULL DEFAULT 1,
        title VARCHAR(200),
        content JSON,
        form_data JSON,
        signatures JSON,
        sign_date DATE,
        pdf_base64 LONGTEXT,
        file_path VARCHAR(500),
        remark VARCHAR(500),
        session_id VARCHAR(100),
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        INDEX idx_document (document_id),
        INDEX idx_session (session_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('数据库表创建完成！');

    console.log('检查并更新字段结构...');
    try {
      const [clauseCols] = await connection.execute('SHOW COLUMNS FROM clauses');
      const colNames = clauseCols.map(c => c.Field);
      const addColIfMissing = async (colDef) => {
        const name = colDef.split(' ')[0];
        if (!colNames.includes(name)) {
          await connection.query(`ALTER TABLE clauses ADD COLUMN ${colDef}`);
          console.log(`  - 已添加 clauses.${name} 字段`);
        }
      };
      await addColIfMissing('tags JSON');
      await addColIfMissing('applicable_templates JSON');
      await addColIfMissing('keywords TEXT');
      await addColIfMissing('weight INT DEFAULT 0');
      await addColIfMissing('is_default TINYINT(1) DEFAULT 0');
      if (!colNames.includes('category')) {
        await connection.query('ALTER TABLE clauses ADD COLUMN category VARCHAR(100)');
      }
      try {
        await connection.execute('SHOW INDEX FROM clauses WHERE Key_name = "idx_category"');
        const [idxRows] = await connection.execute('SHOW INDEX FROM clauses WHERE Key_name = "idx_category"');
        if (idxRows.length === 0) {
          await connection.query('ALTER TABLE clauses ADD INDEX idx_category (category)');
        }
      } catch (e) {}
      console.log('字段结构检查完成');
    } catch (e) {
      console.warn('字段迁移检查异常（可能是首次创建）:', e.message);
    }
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM templates');
    if (rows[0].count === 0) {
      console.log('开始插入初始模板数据...');
      
      const templates = [
        {
          title: '劳动合同',
          type: 'contract',
          description: '适用于企业与员工签订的劳动合同范本',
          content: `
# 劳动合同

甲方（用人单位）：{{employerName}}
法定代表人：{{employerLegal}}
地址：{{employerAddress}}

乙方（劳动者）：{{employeeName}}
身份证号码：{{employeeIdCard}}
住址：{{employeeAddress}}

根据《中华人民共和国劳动合同法》及有关法律法规的规定，甲乙双方本着平等自愿、协商一致的原则，签订本合同。

## 第一条 合同期限
本合同为{{contractType}}合同，期限自{{startDate}}起至{{endDate}}止。
试用期为{{probationPeriod}}个月，自{{startDate}}起至{{probationEnd}}止。

## 第二条 工作内容和工作地点
1. 乙方同意根据甲方工作需要，担任{{position}}岗位工作。
2. 工作地点：{{workLocation}}。

## 第三条 工作时间和休息休假
1. 甲方实行{{workTime}}工作制。
2. 乙方享有国家规定的法定节假日、年假等休息休假权利。

## 第四条 劳动报酬
1. 乙方月工资为人民币{{salary}}元。
2. 工资发放日为每月{{payDay}}日。

## 第五条 社会保险和福利待遇
甲方按国家和地方有关规定为乙方缴纳各项社会保险费用。

## 第六条 劳动保护和劳动条件
甲方为乙方提供符合国家规定的劳动安全卫生条件和必要的劳动保护用品。

## 第七条 劳动合同的解除和终止
1. 双方协商一致，可以解除劳动合同。
2. 乙方提前三十日以书面形式通知甲方，可以解除劳动合同。

## 第八条 争议处理
因履行本合同发生的争议，双方应协商解决；协商不成的，可以向劳动争议仲裁委员会申请仲裁。

## 第九条 其他
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（盖章）：{{employerName}}
法定代表人签字：__________________
日期：{{signDate}}

乙方（签字）：{{employeeName}}
日期：{{signDate}}
          `,
          fields: JSON.stringify([
            { name: 'employerName', label: '用人单位名称', type: 'text', required: true },
            { name: 'employerLegal', label: '法定代表人', type: 'text', required: true },
            { name: 'employerAddress', label: '用人单位地址', type: 'textarea', required: true },
            { name: 'employeeName', label: '劳动者姓名', type: 'text', required: true },
            { name: 'employeeIdCard', label: '身份证号码', type: 'text', required: true },
            { name: 'employeeAddress', label: '劳动者住址', type: 'textarea', required: true },
            { name: 'contractType', label: '合同类型', type: 'select', options: ['固定期限', '无固定期限', '以完成一定工作任务为期限'], required: true },
            { name: 'startDate', label: '合同开始日期', type: 'date', required: true },
            { name: 'endDate', label: '合同结束日期', type: 'date', required: false },
            { name: 'probationPeriod', label: '试用期月数', type: 'number', required: true },
            { name: 'probationEnd', label: '试用期结束日期', type: 'date', required: false },
            { name: 'position', label: '岗位名称', type: 'text', required: true },
            { name: 'workLocation', label: '工作地点', type: 'text', required: true },
            { name: 'workTime', label: '工作制度', type: 'select', options: ['标准工时制', '不定时工作制', '综合计算工时制'], required: true },
            { name: 'salary', label: '月工资（元）', type: 'number', required: true },
            { name: 'payDay', label: '工资发放日', type: 'text', required: true },
            { name: 'signDate', label: '签订日期', type: 'date', required: true }
          ])
        },
        {
          title: '买卖合同',
          type: 'contract',
          description: '适用于货物买卖交易的合同范本',
          content: `
# 买卖合同

甲方（卖方）：{{sellerName}}
法定代表人：{{sellerLegal}}
地址：{{sellerAddress}}
联系方式：{{sellerPhone}}

乙方（买方）：{{buyerName}}
法定代表人：{{buyerLegal}}
地址：{{buyerAddress}}
联系方式：{{buyerPhone}}

根据《中华人民共和国民法典》及有关法律规定，甲乙双方本着平等互利、协商一致的原则，签订本合同。

## 第一条 标的物
1. 商品名称：{{productName}}
2. 规格型号：{{productSpec}}
3. 数量：{{quantity}}
4. 单价：{{unitPrice}}元
5. 总金额：人民币{{totalAmount}}元

## 第二条 质量标准
标的物质量标准为：{{qualityStandard}}。

## 第三条 交货方式和地点
1. 交货方式：{{deliveryMethod}}
2. 交货地点：{{deliveryLocation}}
3. 交货日期：{{deliveryDate}}

## 第四条 付款方式
1. 付款方式：{{paymentMethod}}
2. 付款时间：{{paymentTime}}

## 第五条 验收标准和方法
1. 验收标准：{{inspectionStandard}}
2. 验收方法：{{inspectionMethod}}

## 第六条 违约责任
1. 甲方逾期交货的，每日按合同总金额的{{penaltyRate}}%向乙方支付违约金。
2. 乙方逾期付款的，每日按逾期金额的{{penaltyRate}}%向甲方支付违约金。

## 第七条 争议解决
因本合同发生争议，双方应协商解决；协商不成的，按下列第{{disputeMethod}}种方式解决：
1. 向{{arbitration}}仲裁委员会申请仲裁
2. 向有管辖权的人民法院起诉

## 第八条 其他
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（盖章）：{{sellerName}}
法定代表人签字：__________________
日期：{{signDate}}

乙方（盖章）：{{buyerName}}
法定代表人签字：__________________
日期：{{signDate}}
          `,
          fields: JSON.stringify([
            { name: 'sellerName', label: '卖方名称', type: 'text', required: true },
            { name: 'sellerLegal', label: '卖方法定代表人', type: 'text', required: true },
            { name: 'sellerAddress', label: '卖方地址', type: 'textarea', required: true },
            { name: 'sellerPhone', label: '卖方联系方式', type: 'text', required: true },
            { name: 'buyerName', label: '买方名称', type: 'text', required: true },
            { name: 'buyerLegal', label: '买方法定代表人', type: 'text', required: true },
            { name: 'buyerAddress', label: '买方地址', type: 'textarea', required: true },
            { name: 'buyerPhone', label: '买方联系方式', type: 'text', required: true },
            { name: 'productName', label: '商品名称', type: 'text', required: true },
            { name: 'productSpec', label: '规格型号', type: 'text', required: true },
            { name: 'quantity', label: '数量', type: 'number', required: true },
            { name: 'unitPrice', label: '单价（元）', type: 'number', required: true },
            { name: 'totalAmount', label: '总金额（元）', type: 'number', required: true },
            { name: 'qualityStandard', label: '质量标准', type: 'textarea', required: true },
            { name: 'deliveryMethod', label: '交货方式', type: 'select', options: ['送货上门', '自提', '第三方物流'], required: true },
            { name: 'deliveryLocation', label: '交货地点', type: 'text', required: true },
            { name: 'deliveryDate', label: '交货日期', type: 'date', required: true },
            { name: 'paymentMethod', label: '付款方式', type: 'select', options: ['一次性付款', '分期付款', '货到付款'], required: true },
            { name: 'paymentTime', label: '付款时间', type: 'text', required: true },
            { name: 'inspectionStandard', label: '验收标准', type: 'textarea', required: true },
            { name: 'inspectionMethod', label: '验收方法', type: 'text', required: true },
            { name: 'penaltyRate', label: '违约金比例（%）', type: 'number', required: true },
            { name: 'disputeMethod', label: '争议解决方式', type: 'select', options: ['仲裁', '诉讼'], required: true },
            { name: 'arbitration', label: '仲裁委员会', type: 'text', required: false },
            { name: 'signDate', label: '签订日期', type: 'date', required: true }
          ])
        },
        {
          title: '民事起诉状',
          type: 'pleading',
          description: '适用于民事诉讼的起诉状范本',
          content: `
# 民事起诉状

原告：{{plaintiffName}}
性别：{{plaintiffGender}}
民族：{{plaintiffEthnicity}}
出生日期：{{plaintiffBirth}}
身份证号码：{{plaintiffIdCard}}
住址：{{plaintiffAddress}}
联系方式：{{plaintiffPhone}}

被告：{{defendantName}}
性别：{{defendantGender}}
民族：{{defendantEthnicity}}
出生日期：{{defendantBirth}}
身份证号码：{{defendantIdCard}}
住址：{{defendantAddress}}
联系方式：{{defendantPhone}}

## 诉讼请求

1. 请求判令被告{{claim1}}
2. 请求判令被告{{claim2}}
3. 请求判令本案诉讼费用由被告承担。

## 事实与理由

{{factsAndReasons}}

综上所述，为维护原告的合法权益，根据相关法律规定，特向贵院提起诉讼，请求依法判如所请。

此致
{{courtName}}人民法院

具状人：{{plaintiffName}}
日期：{{date}}
          `,
          fields: JSON.stringify([
            { name: 'plaintiffName', label: '原告姓名', type: 'text', required: true },
            { name: 'plaintiffGender', label: '原告性别', type: 'select', options: ['男', '女'], required: true },
            { name: 'plaintiffEthnicity', label: '原告民族', type: 'text', required: true },
            { name: 'plaintiffBirth', label: '原告出生日期', type: 'date', required: true },
            { name: 'plaintiffIdCard', label: '原告身份证号', type: 'text', required: true },
            { name: 'plaintiffAddress', label: '原告住址', type: 'textarea', required: true },
            { name: 'plaintiffPhone', label: '原告联系方式', type: 'text', required: true },
            { name: 'defendantName', label: '被告姓名', type: 'text', required: true },
            { name: 'defendantGender', label: '被告性别', type: 'select', options: ['男', '女'], required: true },
            { name: 'defendantEthnicity', label: '被告民族', type: 'text', required: true },
            { name: 'defendantBirth', label: '被告出生日期', type: 'date', required: false },
            { name: 'defendantIdCard', label: '被告身份证号', type: 'text', required: false },
            { name: 'defendantAddress', label: '被告住址', type: 'textarea', required: true },
            { name: 'defendantPhone', label: '被告联系方式', type: 'text', required: false },
            { name: 'claim1', label: '诉讼请求一', type: 'textarea', required: true },
            { name: 'claim2', label: '诉讼请求二', type: 'textarea', required: false },
            { name: 'factsAndReasons', label: '事实与理由', type: 'textarea', required: true },
            { name: 'courtName', label: '受理法院', type: 'text', required: true },
            { name: 'date', label: '起诉日期', type: 'date', required: true }
          ])
        },
        {
          title: '房屋租赁合同',
          type: 'contract',
          description: '适用于房屋出租的租赁合同范本',
          content: `
# 房屋租赁合同

甲方（出租方）：{{lessorName}}
身份证号码：{{lessorIdCard}}
联系方式：{{lessorPhone}}

乙方（承租方）：{{lesseeName}}
身份证号码：{{lesseeIdCard}}
联系方式：{{lesseePhone}}

根据《中华人民共和国民法典》及有关规定，甲乙双方在平等自愿的基础上，就房屋租赁事宜达成如下协议：

## 第一条 房屋基本情况
甲方将坐落于{{houseAddress}}的房屋出租给乙方使用。
房屋建筑面积：{{houseArea}}平方米
房屋户型：{{houseLayout}}

## 第二条 租赁用途
该房屋用途为{{rentalPurpose}}。

## 第三条 租赁期限
租赁期限自{{startDate}}起至{{endDate}}止。

## 第四条 租金及支付方式
1. 月租金为人民币{{rentAmount}}元。
2. 租金按{{paymentCycle}}支付，乙方应在每期开始前{{paymentDays}}日内支付下期租金。
3. 押金：人民币{{depositAmount}}元，合同期满无违约的，甲方无息退还。

## 第五条 相关费用
租赁期间，水费、电费、燃气费、物业管理费等由{{feeBearer}}承担。

## 第六条 房屋维护与修缮
1. 甲方应保证房屋及设施的正常使用。
2. 乙方应合理使用并爱护房屋及其附属设施。

## 第七条 合同的解除
1. 经双方协商一致，可以解除合同。
2. 乙方有下列情形之一的，甲方有权解除合同：
   （1）擅自转租、转借房屋的；
   （2）拖欠租金累计超过{{arrearsDays}}天的。

## 第八条 违约责任
1. 甲方违约解除合同的，应向乙方支付违约金{{penaltyAmount}}元。
2. 乙方违约解除合同的，应向甲方支付违约金{{penaltyAmount}}元。

## 第九条 争议解决
因本合同发生争议，双方应协商解决；协商不成的，可向房屋所在地人民法院起诉。

## 第十条 其他约定
{{otherTerms}}

本合同一式两份，甲乙双方各执一份，自双方签字之日起生效。

甲方（签字）：{{lessorName}}
日期：{{signDate}}

乙方（签字）：{{lesseeName}}
日期：{{signDate}}
          `,
          fields: JSON.stringify([
            { name: 'lessorName', label: '出租方姓名', type: 'text', required: true },
            { name: 'lessorIdCard', label: '出租方身份证号', type: 'text', required: true },
            { name: 'lessorPhone', label: '出租方联系方式', type: 'text', required: true },
            { name: 'lesseeName', label: '承租方姓名', type: 'text', required: true },
            { name: 'lesseeIdCard', label: '承租方身份证号', type: 'text', required: true },
            { name: 'lesseePhone', label: '承租方联系方式', type: 'text', required: true },
            { name: 'houseAddress', label: '房屋地址', type: 'textarea', required: true },
            { name: 'houseArea', label: '房屋面积（㎡）', type: 'number', required: true },
            { name: 'houseLayout', label: '房屋户型', type: 'text', required: true },
            { name: 'rentalPurpose', label: '租赁用途', type: 'select', options: ['居住', '商业', '办公'], required: true },
            { name: 'startDate', label: '租赁开始日期', type: 'date', required: true },
            { name: 'endDate', label: '租赁结束日期', type: 'date', required: true },
            { name: 'rentAmount', label: '月租金（元）', type: 'number', required: true },
            { name: 'paymentCycle', label: '支付周期', type: 'select', options: ['月付', '季付', '半年付', '年付'], required: true },
            { name: 'paymentDays', label: '提前付款天数', type: 'number', required: true },
            { name: 'depositAmount', label: '押金（元）', type: 'number', required: true },
            { name: 'feeBearer', label: '水电费等承担方', type: 'select', options: ['承租方', '出租方'], required: true },
            { name: 'arrearsDays', label: '拖欠租金解约天数', type: 'number', required: true },
            { name: 'penaltyAmount', label: '违约金（元）', type: 'number', required: true },
            { name: 'otherTerms', label: '其他约定', type: 'textarea', required: false },
            { name: 'signDate', label: '签订日期', type: 'date', required: true }
          ])
        }
      ];
      
      for (const tpl of templates) {
        await connection.execute(
          'INSERT INTO templates (title, type, description, content, fields) VALUES (?, ?, ?, ?, ?)',
          [tpl.title, tpl.type, tpl.description, tpl.content, tpl.fields]
        );
      }
      
      console.log('初始模板数据插入完成！');
    }

    const [clauseRows] = await connection.execute('SELECT COUNT(*) as count FROM clauses');
    if (clauseRows[0].count === 0) {
      console.log('开始插入初始条款数据...');

      const clauses = [
        {
          title: '违约责任通用条款',
          category: '违约责任',
          tags: JSON.stringify(['违约', '违约金', '赔偿']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '违约,违约金,赔偿,损失,逾期',
          weight: 10,
          is_default: 1,
          content: `## 违约责任
1. 任何一方违反本合同约定的，应当承担违约责任，赔偿对方因此遭受的全部损失。
2. 损失赔偿范围包括但不限于直接损失、间接损失、可得利益损失以及维权费用（含律师费、诉讼费等）。
3. 守约方有权选择要求违约方继续履行、采取补救措施或者解除合同并要求赔偿损失。`
        },
        {
          title: '违约责任-逾期履行',
          category: '违约责任',
          tags: JSON.stringify(['逾期', '违约金', '迟延']),
          applicable_templates: JSON.stringify(['contract', '买卖合同', '房屋租赁合同']),
          keywords: '逾期,迟延,违约金,每日,按日',
          weight: 15,
          is_default: 0,
          content: `## 逾期履行责任
1. 甲方逾期交付标的物的，每逾期一日，应按合同总金额的万分之五向乙方支付违约金；逾期超过30日的，乙方有权解除合同。
2. 乙方逾期支付款项的，每逾期一日，应按逾期金额的万分之五向甲方支付违约金；逾期超过30日的，甲方有权解除合同。
3. 违约金不足以弥补守约方损失的，违约方还应赔偿差额部分。`
        },
        {
          title: '争议解决-诉讼管辖',
          category: '争议解决',
          tags: JSON.stringify(['争议', '诉讼', '管辖', '法院']),
          applicable_templates: JSON.stringify(['contract', 'pleading']),
          keywords: '争议,诉讼,管辖,法院,起诉',
          weight: 12,
          is_default: 1,
          content: `## 争议解决
1. 因本合同引起的或与本合同有关的任何争议，双方应首先通过友好协商解决。
2. 协商不成的，任何一方均有权向合同签订地有管辖权的人民法院提起诉讼。
3. 在争议解决期间，除争议事项外，双方应继续履行本合同其他条款。`
        },
        {
          title: '争议解决-仲裁条款',
          category: '争议解决',
          tags: JSON.stringify(['争议', '仲裁', '仲裁委员会']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '争议,仲裁,仲裁委员会,裁决',
          weight: 12,
          is_default: 0,
          content: `## 争议解决
1. 因本合同引起的或与本合同有关的任何争议，双方应首先通过友好协商解决。
2. 协商不成的，任何一方均有权将争议提交____仲裁委员会，按照该会现行有效的仲裁规则进行仲裁。
3. 仲裁裁决是终局的，对双方均有约束力。仲裁费用由败诉方承担。
4. 在争议解决期间，除争议事项外，双方应继续履行本合同其他条款。`
        },
        {
          title: '保密条款',
          category: '保密',
          tags: JSON.stringify(['保密', '商业秘密', '信息']),
          applicable_templates: JSON.stringify(['contract', '劳动合同']),
          keywords: '保密,商业秘密,信息,披露,机密',
          weight: 8,
          is_default: 0,
          content: `## 保密条款
1. 双方对因履行本合同而知悉的对方商业秘密、技术秘密及其他保密信息负有保密义务。
2. 未经信息披露方书面同意，接收方不得向任何第三方披露、转让、许可使用或不当利用上述保密信息。
3. 保密义务在本合同终止后仍然有效，直至相关信息已为公众所知悉。
4. 违反保密义务的一方应赔偿对方因此遭受的全部损失。`
        },
        {
          title: '知识产权条款',
          category: '知识产权',
          tags: JSON.stringify(['知识产权', '著作权', '专利', '商标']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '知识产权,著作权,专利,商标,归属',
          weight: 7,
          is_default: 0,
          content: `## 知识产权
1. 双方各自拥有的知识产权（包括但不限于著作权、专利权、商标权等）归各自所有。
2. 一方在履行本合同过程中创造的新的知识产权，其归属由双方另行书面约定。
3. 任何一方不得侵犯对方的知识产权，否则应承担相应的法律责任。`
        },
        {
          title: '不可抗力条款',
          category: '不可抗力',
          tags: JSON.stringify(['不可抗力', '免责', '自然灾害']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '不可抗力,免责,自然灾害,地震,战争,疫情',
          weight: 9,
          is_default: 1,
          content: `## 不可抗力
1. 因不可抗力致使本合同不能履行或部分不能履行的，受影响的一方不承担违约责任，但应在不可抗力发生后15日内书面通知对方，并提供相关证明。
2. 不可抗力是指不能预见、不能避免且不能克服的客观情况，包括但不限于自然灾害、战争、政府行为、疫情等。
3. 不可抗力事件持续超过90日的，任何一方有权书面通知对方解除本合同，双方互不承担责任。`
        },
        {
          title: '合同变更与解除',
          category: '合同变更',
          tags: JSON.stringify(['变更', '解除', '终止', '修改']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '变更,解除,终止,修改,书面',
          weight: 8,
          is_default: 1,
          content: `## 合同的变更与解除
1. 本合同经双方协商一致，可以变更或解除，变更或解除协议应采用书面形式。
2. 有下列情形之一的，一方有权书面通知对方解除本合同：
   （1）一方严重违约，经催告后在合理期限内仍未改正的；
   （2）一方迟延履行主要义务，致使不能实现合同目的的；
   （3）法律规定的其他情形。
3. 合同解除不影响守约方向违约方主张违约责任的权利。`
        },
        {
          title: '送达条款',
          category: '送达',
          tags: JSON.stringify(['送达', '通知', '地址']),
          applicable_templates: JSON.stringify(['contract']),
          keywords: '送达,通知,地址,邮寄,邮件',
          weight: 5,
          is_default: 0,
          content: `## 通知与送达
1. 双方确认本合同首页载明的地址为有效送达地址，用于接收与本合同有关的各类通知、文件及法律文书。
2. 任何一方变更送达地址的，应提前7日书面通知对方，否则原地址仍为有效送达地址。
3. 通过邮寄方式送达的，邮件寄出后第3日视为送达；通过电子邮件送达的，邮件发出后24小时视为送达。`
        },
        {
          title: '高额违约金调整条款',
          category: '违约责任',
          tags: JSON.stringify(['违约金', '高额', '调整', '标的额']),
          applicable_templates: JSON.stringify(['contract', '买卖合同']),
          keywords: '违约金,高额,调整,标的,总金额',
          weight: 6,
          is_default: 0,
          content: `## 违约金特别约定
1. 双方约定，本合同项下任何单项违约金的累计总额不超过合同总金额的20%。
2. 如约定的违约金过分高于或低于实际损失的，双方均可请求人民法院或仲裁机构予以适当调整。
3. 本合同标的额超过人民币100万元的，双方应另行签订风险告知书作为本合同附件。`
        },
        {
          title: '劳动合同-竞业限制',
          category: '竞业限制',
          tags: JSON.stringify(['竞业限制', '离职', '保密']),
          applicable_templates: JSON.stringify(['劳动合同']),
          keywords: '竞业,限制,离职,竞争,同业',
          weight: 7,
          is_default: 0,
          content: `## 竞业限制
1. 乙方在合同期间及离职后24个月内，不得自营或为他人经营与甲方同类的业务，不得受聘于与甲方有竞争关系的单位。
2. 甲方应在乙方离职后的竞业限制期限内按月支付竞业限制补偿金，标准为乙方离职前12个月平均工资的30%。
3. 乙方违反竞业限制约定的，应向甲方支付相当于乙方12个月工资总额的违约金，并继续履行竞业限制义务。`
        },
        {
          title: '劳动合同-服务期',
          category: '服务期',
          tags: JSON.stringify(['服务期', '培训', '违约金']),
          applicable_templates: JSON.stringify(['劳动合同']),
          keywords: '服务期,培训,专业,技术',
          weight: 6,
          is_default: 0,
          content: `## 服务期约定
1. 甲方为乙方提供专项培训费用，对其进行专业技术培训的，双方约定服务期为____年。
2. 乙方违反服务期约定提前解除劳动合同的，应向甲方支付违约金，违约金按服务期尚未履行部分所应分摊的培训费用计算。
3. 培训费用包括甲方为乙方支付的有凭证的培训费用、培训期间的差旅费用以及因培训产生的其他直接费用。`
        },
        {
          title: '房屋租赁-装修条款',
          category: '房屋租赁',
          tags: JSON.stringify(['装修', '改造', '租赁']),
          applicable_templates: JSON.stringify(['房屋租赁合同']),
          keywords: '装修,改造,装饰,拆除,恢复',
          weight: 7,
          is_default: 0,
          content: `## 装修与改造
1. 乙方经甲方书面同意后，可对租赁房屋进行装修或改造，装修改造方案应事先报甲方审核。
2. 装修改造费用由乙方承担，合同期满或提前解除时，固定装修归甲方所有，可移动设施由乙方自行拆除并恢复原状。
3. 乙方装修改造不得改变房屋主体结构，不得影响房屋安全使用，否则乙方应承担全部责任。`
        },
        {
          title: '房屋租赁-转租条款',
          category: '房屋租赁',
          tags: JSON.stringify(['转租', '分租', '第三方']),
          applicable_templates: JSON.stringify(['房屋租赁合同']),
          keywords: '转租,分租,转借,第三方',
          weight: 6,
          is_default: 0,
          content: `## 转租约定
1. 未经甲方书面同意，乙方不得将租赁房屋全部或部分转租、转借或以其他方式交由第三方使用。
2. 经甲方同意转租的，乙方应就次承租人的行为向甲方承担连带责任。
3. 擅自转租的，甲方有权解除合同并要求乙方支付相当于2个月租金的违约金。`
        },
        {
          title: '买卖合同-质量保证期',
          category: '买卖合同',
          tags: JSON.stringify(['质量', '保证期', '保修', '三包']),
          applicable_templates: JSON.stringify(['买卖合同']),
          keywords: '质量,保证期,保修,三包,维修',
          weight: 7,
          is_default: 0,
          content: `## 质量保证
1. 甲方保证交付的标的物符合本合同约定的质量标准，并提供自验收合格之日起____个月的质量保证期。
2. 在质量保证期内，因标的物本身质量问题发生故障或损坏的，甲方应负责免费维修、更换或退货，并承担因此产生的运输费用。
3. 乙方应妥善使用和保管标的物，因乙方人为损坏或不当使用造成的问题不在质量保证范围内。`
        },
        {
          title: '买卖合同-所有权保留',
          category: '买卖合同',
          tags: JSON.stringify(['所有权', '保留', '所有权转移', '款项']),
          applicable_templates: JSON.stringify(['买卖合同']),
          keywords: '所有权,保留,转移,付清,款项',
          weight: 6,
          is_default: 0,
          content: `## 所有权保留
1. 在乙方未付清全部合同价款前，标的物的所有权仍归甲方所有，乙方仅享有使用权。
2. 乙方不得在所有权转移前对标的物进行转让、抵押、质押或其他处分。
3. 乙方逾期支付任意一期价款超过15日的，甲方有权收回标的物，已收价款扣除标的物使用费（按每日合同总金额的万分之五计算）及违约金后退还乙方，不足部分甲方有权继续追偿。`
        },
        {
          title: '诉讼-证据清单提示',
          category: '诉讼指引',
          tags: JSON.stringify(['证据', '举证', '材料']),
          applicable_templates: JSON.stringify(['pleading', '民事起诉状']),
          keywords: '证据,举证,材料,清单,证明',
          weight: 8,
          is_default: 0,
          content: `## 证据清单（附件）
起诉时建议同时准备以下证据材料（复印件一式两份）：
1. 原被告身份证明材料（身份证/营业执照复印件）
2. 证明原被告之间存在法律关系的证据（合同、借条、欠条等）
3. 证明原告主张事实的证据（转账记录、聊天记录、录音录像、照片等）
4. 证明损失金额的相关票据、凭证
5. 其他与本案有关的证据材料

注：所有证据应在举证期限内提交，逾期提交可能不被采纳。`
        },
        {
          title: '诉讼-财产保全提示',
          category: '诉讼指引',
          tags: JSON.stringify(['保全', '财产', '查封', '冻结']),
          applicable_templates: JSON.stringify(['pleading', '民事起诉状']),
          keywords: '保全,财产,查封,冻结,担保',
          weight: 7,
          is_default: 0,
          content: `## 财产保全提示
为防止被告转移财产导致判决难以执行，原告可在起诉前或起诉时向法院申请财产保全：
1. 需提供明确的被保全财产信息（银行账户、房产、车辆、股权等）
2. 需提供相当于保全金额的担保（保险公司保函、现金担保或房产担保等）
3. 情况紧急的，可申请诉前保全，法院将在48小时内作出裁定
4. 保全申请费最高不超过5000元

建议：如掌握被告财产线索，应尽早申请保全，以确保胜诉后能够顺利执行。`
        }
      ];

      for (const clause of clauses) {
        await connection.execute(
          'INSERT INTO clauses (title, content, category, tags, applicable_templates, keywords, weight, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [clause.title, clause.content, clause.category, clause.tags, clause.applicable_templates, clause.keywords, clause.weight, clause.is_default]
        );
      }

      console.log('初始条款数据插入完成！');
    }
    
    console.log('数据库初始化完成！');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  initDatabase().then(() => {
    console.log('初始化完成！');
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = initDatabase;
