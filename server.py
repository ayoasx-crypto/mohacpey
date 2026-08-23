import http.server
import socketserver
import json
import sqlite3

def get_dashboard_data():
    conn = sqlite3.connect('pos_system.db')
    cursor = conn.cursor()
    
    # 1. إجمالي المبيعات، الأرباح الحقيقية (سعر البيع - سعر الشراء)، وعدد الفواتير الفريدة
    cursor.execute("""
        SELECT 
            COALESCE(SUM(s.quantity * p.sell_price), 0) AS total_sales,
            COALESCE(SUM(s.quantity * (p.sell_price - p.buy_price)), 0) AS total_profit,
            COUNT(DISTINCT s.invoice_id) AS total_orders
        FROM sales s
        JOIN products p ON s.product_id = p.id
    """)
    stats = cursor.fetchone()
    
    # 2. أفضل المنتجات مباعاً
    cursor.execute("""
        SELECT p.name, COALESCE(SUM(s.quantity), 0) as qty
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY p.id
        ORDER BY qty DESC LIMIT 5
    """)
    products_data = cursor.fetchall()
    
    # 3. سجل حركة المبيعات المباشرة (تجميع حسب الفاتورة)
    cursor.execute("""
        SELECT 
            s.invoice_id,
            GROUP_CONCAT(p.name, ' + ') AS products_list,
            SUM(s.quantity) AS total_qty,
            SUM(s.quantity * p.sell_price) AS total_amount
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY s.invoice_id
        ORDER BY s.invoice_id DESC LIMIT 10
    """)
    history_data = cursor.fetchall()
    
    conn.close()
    
    return {
        "sales": round(stats[0], 2),
        "profit": round(stats[1], 2),
        "orders": stats[2],
        "products": [p[0] for p in products_data] if products_data else ["لا يوجد"],
        "quantities": [p[1] for p in products_data] if products_data else [0],
        "history": [{"id": h[0], "product": h[1], "qty": h[2], "total": round(h[3], 2)} for h in history_data]
    }

class SimpleAPI(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/data'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            data = get_dashboard_data()
            self.wfile.write(json.dumps(data).encode())
        else:
            super().do_GET()

PORT = 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), SimpleAPI) as httpd:
    print(f"🌐 خادم المتابعة المباشرة يعمل بنجاح على المنفذ {PORT}...")
    httpd.serve_forever()