import sqlite3

conn = sqlite3.connect('pos_system.db')
cursor = conn.cursor()

# إضافة مبيعات قديمة لتظهر في الأسبوع والشهر
cursor.execute("INSERT INTO sales (product_id, quantity, total_price, timestamp) VALUES (1, 10, 35.0, DATETIME('now', '-10 days'))")
cursor.execute("INSERT INTO sales (product_id, quantity, total_price, timestamp) VALUES (2, 8, 20.0, DATETIME('now', '-3 days'))")

conn.commit()
conn.close()
print("✅ تم إضافة مبيعات سابقة بنجاح!")