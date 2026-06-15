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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('数据库表创建完成！');
    
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
