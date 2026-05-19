const fs = require('fs');
const path = require('path');
const pool = require('./db');

const categories = [
  ['Cà phê pha máy', 'Espresso, latte, cappuccino và các món hiện đại.'],
  ['Cà phê truyền thống', 'Phin, bạc xỉu, sữa đá và hương vị Việt Nam.'],
  ['Cold Brew', 'Ủ lạnh mượt vị, ít chua gắt, hợp uống cả ngày.'],
  ['Trà trái cây', 'Trà thanh mát kết hợp trái cây tươi.']
];

const products = [
  {
    name: 'Espresso Double Shot',
    price: 45000,
    description: 'Hai shot espresso đậm vị, crema dày, hậu vị chocolate đen.',
    image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=900&q=85',
    category: 'Cà phê pha máy',
    status: 'in_stock'
  },
  {
    name: 'Latte Caramel Muối Biển',
    price: 62000,
    description: 'Latte sữa tươi mềm vị, caramel mặn nhẹ và lớp foam mịn.',
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=85',
    category: 'Cà phê pha máy',
    status: 'in_stock'
  },
  {
    name: 'Cappuccino Hạt Rang Mộc',
    price: 58000,
    description: 'Espresso cân bằng cùng foam sữa dày, thơm hương hạt rang.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=900&q=85',
    category: 'Cà phê pha máy',
    status: 'out_of_stock'
  },
  {
    name: 'Cà Phê Sữa Đá Sài Gòn',
    price: 39000,
    description: 'Cà phê phin đậm, sữa đặc béo, đá già đúng kiểu Việt Nam.',
    image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=900&q=85',
    category: 'Cà phê truyền thống',
    status: 'in_stock'
  },
  {
    name: 'Bạc Xỉu Kem Muối',
    price: 49000,
    description: 'Sữa thơm béo, cà phê nhẹ và kem muối mằn mặn dễ uống.',
    image: 'https://images.unsplash.com/photo-1568649929103-28ffbefaca1e?auto=format&fit=crop&w=900&q=85',
    category: 'Cà phê truyền thống',
    status: 'in_stock'
  },
  {
    name: 'Cold Brew Cam Vàng',
    price: 65000,
    description: 'Cold brew ủ 18 giờ, phối cam vàng tạo vị sáng và sạch.',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85',
    category: 'Cold Brew',
    status: 'in_stock'
  },
  {
    name: 'Cold Brew Sữa Hạnh Nhân',
    price: 69000,
    description: 'Cà phê ủ lạnh kết hợp sữa hạnh nhân, hậu vị hạt nhẹ.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=85',
    category: 'Cold Brew',
    status: 'in_stock'
  },
  {
    name: 'Trà Đào Cam Sả',
    price: 55000,
    description: 'Trà đen thơm, đào miếng, cam tươi và sả thanh nhẹ.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85',
    category: 'Trà trái cây',
    status: 'in_stock'
  },
  {
    name: 'Trà Dâu Hibiscus',
    price: 59000,
    description: 'Hibiscus chua dịu, dâu tây tươi và hương hoa nhẹ nhàng.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=85',
    category: 'Trà trái cây',
    status: 'out_of_stock'
  }
];

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  const statements = schema.split(';').map((s) => s.trim()).filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  for (const category of categories) {
    await pool.query(
      'INSERT IGNORE INTO Categories (Name, Description) VALUES (?, ?)',
      category
    );
  }

  const [categoryRows] = await pool.query('SELECT Id, Name FROM Categories');
  const categoryMap = new Map(categoryRows.map((row) => [row.Name, row.Id]));

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);
    await pool.query(
      `INSERT INTO Products (Name, Price, Description, Image_URL, Category_Id, Status)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM Products WHERE Name = ? LIMIT 1)`,
      [
        product.name,
        product.price,
        product.description,
        product.image,
        categoryId,
        product.status,
        product.name
      ]
    );

    await pool.query(
      'UPDATE Products SET Image_URL = ? WHERE Name = ?',
      [product.image, product.name]
    );
  }

  console.log('Database initialized successfully.');
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error('Database initialization failed:', error.message);
    await pool.end();
    process.exit(1);
  }).finally(async () => {
    await pool.end();
  });
}

module.exports = run;
