import sqlite3
import secrets
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_NAME = "pos_system.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # 1. جدول المحلات/المستخدمين
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. إضافة العمود store_id لجدول المبيعات إذا لم يكن موجوداً
    cursor.execute("PRAGMA table_info(sales)")
    columns = [column[1] for column in cursor.fetchall()]
    if 'store_id' not in columns:
        cursor.execute("ALTER TABLE sales ADD COLUMN store_id INTEGER DEFAULT 1")

    # 3. إنشاء حساب تجريبي افتراضي (Demo Store) إذا لم تكن هناك محلات
    cursor.execute("SELECT count(*) FROM stores")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO stores (store_name, username, password, api_key)
            VALUES (?, ?, ?, ?)
        ''', ("المحل التجريبي", "demo", "demo123", "DEMO-KEY-123456"))
        
    conn.commit()
    conn.close()

init_db()

# مسار تسجيل محل جديد (يحفظ في قاعدة البيانات ويولد api_key خاص)
@app.route('/api/register', methods=['POST'])
def register_store():
    data = request.get_json() or {}
    store_name = data.get('store_name')
    username = data.get('username')
    password = data.get('password')

    if not store_name or not username or not password:
        return jsonify({'error': 'جميع البيانات مطلوبة'}), 400

    api_key = f"KEY-{secrets.token_hex(8).upper()}"

    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO stores (store_name, username, password, api_key)
            VALUES (?, ?, ?, ?)
        ''', (store_name, username, password, api_key))
        conn.commit()
        conn.close()
        return jsonify({
            'message': 'تم إنشاء الحساب بنجاح',
            'store_name': store_name,
            'username': username,
            'api_key': api_key
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'اسم المستخدم مستخدم بالفعل'}), 400

# مسار استقبال مبيعات الكاشير باستخدام الـ API Key الخاص بالمحل
@app.route('/api/sync-sale', methods=['POST'])
def sync_sale():
    data = request.get_json() or {}
    api_key = request.headers.get('X-API-KEY') or data.get('api_key')

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # البحث عن المحل عبر الـ API Key
    cursor.execute("SELECT id FROM stores WHERE api_key = ?", (api_key,))
    store = cursor.fetchone()

    if not store:
        conn.close()
        return jsonify({'error': 'مفتاح الـ API غير صحيح'}), 401

    store_id = store[0]
    invoice_id = data.get('invoice_id')
    total_amount = data.get('total_amount')
    profit = data.get('profit')
    items_count = data.get('items_count', 1)

    cursor.execute('''
        INSERT INTO sales (store_id, invoice_id, total_amount, profit, items_count)
        VALUES (?, ?, ?, ?, ?)
    ''', (store_id, invoice_id, total_amount, profit, items_count))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'تم مزامنة الفاتورة'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
