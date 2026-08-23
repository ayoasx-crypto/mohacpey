import sqlite3

# إنشاء أو الاتصال بقاعدة بيانات المنظومة التجريبية
conn = sqlite3.connect('pos_system.db')
cursor = conn.cursor()

# إنشاء جدول المنتجات
cursor.execute('''
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    cost_price REAL,
    sell_price REAL
)
''')

# إنشاء جدول المبيعات (الفواتير)
cursor.execute('''
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER,
    total_price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
)
''')

# إضافة منتجات تجريبية للمحل
cursor.execute("DELETE FROM products")
products = [
    ('عصير طبيعي', 2.0, 3.5),
    ('شيبس عائلي', 1.5, 2.5),
    ('شوكولاتة', 3.0, 5.0),
    ('مياه معدنية', 0.5, 1.0)
]
cursor.executemany("INSERT INTO products (name, cost_price, sell_price) VALUES (?, ?, ?)", products)

conn.commit()
conn.close()
print("✅ تم إنشاء قاعدة بيانات المنظومة بنجاح وتغذيتها بالمنتجات!")