require('dotenv').config();

const express = require('express');
const path = require('path');
const { body, validationResult } = require('express-validator');
const pool = require('./db');
const format = require('./format');
const initializeDatabase = require('./init-db');

const app = express();
const port = Number(process.env.PORT || 3000);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use((req, res, next) => {
  res.charset = 'utf-8';
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.locals.format = format;

const productValidation = [
  body('Name').trim().notEmpty().withMessage('Tên sản phẩm không được để trống.'),
  body('Price')
    .customSanitizer((value) => String(value).replace(/[^\d.]/g, ''))
    .isFloat({ gt: 0 })
    .withMessage('Giá bán phải lớn hơn 0.'),
  body('Description').trim().notEmpty().withMessage('Mô tả không được để trống.'),
  body('Image_URL')
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Image URL phải là một đường dẫn hợp lệ, có http hoặc https.'),
  body('Category_Id').isInt({ min: 1 }).withMessage('Vui lòng chọn danh mục.'),
  body('Status').isIn(['in_stock', 'out_of_stock']).withMessage('Trạng thái không hợp lệ.')
];

function buildProductWhere(query) {
  const where = [];
  const params = [];

  if (query.q) {
    where.push('p.Name LIKE ?');
    params.push(`%${query.q}%`);
  }

  if (query.category) {
    where.push('p.Category_Id = ?');
    params.push(query.category);
  }

  if (query.status) {
    where.push('p.Status = ?');
    params.push(query.status);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

async function getCategories() {
  const [rows] = await pool.query('SELECT * FROM Categories ORDER BY Name ASC');
  return rows;
}

async function getProducts(query = {}) {
  const { clause, params } = buildProductWhere(query);
  const [rows] = await pool.query(
    `SELECT p.*, c.Name AS Category_Name
     FROM Products p
     INNER JOIN Categories c ON c.Id = p.Category_Id
     ${clause}
     ORDER BY p.Created_At DESC, p.Id DESC`,
    params
  );
  return rows;
}

async function getProduct(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.Name AS Category_Name
     FROM Products p
     INNER JOIN Categories c ON c.Id = p.Category_Id
     WHERE p.Id = ?`,
    [id]
  );
  return rows[0];
}

async function getDashboardStats() {
  const [[productStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(Status = 'in_stock') AS inStock,
       SUM(Status = 'out_of_stock') AS outOfStock
     FROM Products`
  );
  const [[categoryStats]] = await pool.query('SELECT COUNT(*) AS totalCategories FROM Categories');

  return {
    total: Number(productStats.total || 0),
    inStock: Number(productStats.inStock || 0),
    outOfStock: Number(productStats.outOfStock || 0),
    totalCategories: Number(categoryStats.totalCategories || 0)
  };
}

function productFromBody(bodyData) {
  return {
    Id: bodyData.Id,
    Name: bodyData.Name || '',
    Price: bodyData.Price || '',
    Description: bodyData.Description || '',
    Image_URL: bodyData.Image_URL || '',
    Category_Id: bodyData.Category_Id || '',
    Status: bodyData.Status || 'in_stock'
  };
}

function flashFromQuery(query) {
  if (!query.message) return null;
  return {
    type: query.type === 'error' ? 'error' : 'success',
    message: query.message
  };
}

app.get('/', async (req, res, next) => {
  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getProducts({ q: req.query.q, category: req.query.category })
    ]);

    res.render('showcase', {
      title: 'BeanHaus Coffee',
      activePage: 'showcase',
      categories,
      products,
      query: req.query,
      activeCategory: req.query.category || '',
      flash: flashFromQuery(req.query)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin', async (req, res, next) => {
  try {
    const [categories, products, stats] = await Promise.all([
      getCategories(),
      getProducts(req.query),
      getDashboardStats()
    ]);

    res.render('admin/index', {
      title: 'Admin Dashboard',
      activePage: 'admin',
      categories,
      products,
      stats,
      query: req.query,
      flash: flashFromQuery(req.query)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin/products/new', async (req, res, next) => {
  try {
    const categories = await getCategories();
    res.render('admin/form', {
      title: 'Thêm sản phẩm',
      activePage: 'admin',
      mode: 'create',
      categories,
      product: productFromBody({}),
      errors: [],
      flash: null
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/products', productValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const categories = await getCategories();
    return res.status(422).render('admin/form', {
      title: 'Thêm sản phẩm',
      activePage: 'admin',
      mode: 'create',
      categories,
      product: productFromBody(req.body),
      errors: errors.array(),
      flash: { type: 'error', message: 'Vui lòng kiểm tra lại thông tin sản phẩm.' }
    });
  }

  try {
    const product = productFromBody(req.body);
    await pool.query(
      `INSERT INTO Products (Name, Price, Description, Image_URL, Category_Id, Status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        product.Name,
        product.Price,
        product.Description,
        product.Image_URL,
        product.Category_Id,
        product.Status
      ]
    );
    res.redirect('/admin?message=Đã thêm sản phẩm mới thành công.');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/products/:id/edit', async (req, res, next) => {
  try {
    const [categories, product] = await Promise.all([
      getCategories(),
      getProduct(req.params.id)
    ]);

    if (!product) {
      return res.status(404).render('error', {
        title: 'Không tìm thấy',
        activePage: 'admin',
        message: 'Không tìm thấy sản phẩm cần sửa.',
        error: null
      });
    }

    res.render('admin/form', {
      title: 'Sửa sản phẩm',
      activePage: 'admin',
      mode: 'edit',
      categories,
      product,
      errors: [],
      flash: null
    });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/products/:id', productValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const categories = await getCategories();
    return res.status(422).render('admin/form', {
      title: 'Sửa sản phẩm',
      activePage: 'admin',
      mode: 'edit',
      categories,
      product: productFromBody({ ...req.body, Id: req.params.id }),
      errors: errors.array(),
      flash: { type: 'error', message: 'Vui lòng kiểm tra lại thông tin sản phẩm.' }
    });
  }

  try {
    const product = productFromBody(req.body);
    const [result] = await pool.query(
      `UPDATE Products
       SET Name = ?, Price = ?, Description = ?, Image_URL = ?, Category_Id = ?, Status = ?
       WHERE Id = ?`,
      [
        product.Name,
        product.Price,
        product.Description,
        product.Image_URL,
        product.Category_Id,
        product.Status,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.redirect('/admin?type=error&message=Không tìm thấy sản phẩm để cập nhật.');
    }

    res.redirect('/admin?message=Đã cập nhật sản phẩm thành công.');
  } catch (error) {
    next(error);
  }
});

app.post('/admin/products/:id/delete', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM Products WHERE Id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.redirect('/admin?type=error&message=Không tìm thấy sản phẩm để xóa.');
    }
    res.redirect('/admin?message=Đã xóa sản phẩm thành công.');
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Không tìm thấy',
    activePage: '',
    message: 'Trang bạn đang tìm không tồn tại.',
    error: null
  });
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).render('error', {
    title: 'Lỗi hệ thống',
    activePage: '',
    message: 'Hệ thống đang gặp lỗi. Vui lòng kiểm tra kết nối CSDL hoặc thử lại sau.',
    error: process.env.NODE_ENV === 'production' ? null : error
  });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Coffee product system is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Cannot start server because database initialization failed:', error.message);
    process.exit(1);
  });
