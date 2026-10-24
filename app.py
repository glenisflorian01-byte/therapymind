from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

# ============ CONEXIÓN A MYSQL ============
import os # Pon esto arriba del todo si no está

def get_db():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "therapymind_db"),
        port=int(os.environ.get("DB_PORT", 3306))
    )
# ============ PÁGINAS ============
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# ============ API: USUARIOS ============
@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM users")
    rows = cur.fetchall()
    for r in rows:
        r['activo'] = bool(r['activo'])
    cur.close(); db.close()
    return jsonify(rows)

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    sql = """INSERT INTO users (nombre, email, password, rol, telefono, especialidad, psicologoId, activo)
             VALUES (%s, %s, %s, %s, %s, %s, %s, 1)"""
    try:
        cur.execute(sql, (
            data['nombre'], data['email'], data['password'], data['rol'],
            data.get('telefono'), data.get('especialidad'), data.get('psicologoId')
        ))
        db.commit()
        return jsonify({"ok": True, "id": cur.lastrowid})
    except mysql.connector.IntegrityError:
        return jsonify({"ok": False, "error": "Ese correo ya existe"}), 400
    finally:
        cur.close(); db.close()

@app.route('/api/users/<int:id>', methods=['PUT'])
def update_user(id):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    sql = """UPDATE users SET nombre=%s, email=%s, password=%s, rol=%s,
             telefono=%s, especialidad=%s, psicologoId=%s, activo=%s WHERE id=%s"""
    cur.execute(sql, (
        data['nombre'], data['email'], data['password'], data['rol'],
        data.get('telefono'), data.get('especialidad'),
        data.get('psicologoId'), data.get('activo', 1), id
    ))
    db.commit()
    cur.close(); db.close()
    return jsonify({"ok": True})

@app.route('/api/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM users WHERE id=%s", (id,))
    db.commit()
    cur.close(); db.close()
    return jsonify({"ok": True})

# ============ API: CITAS ============
@app.route('/api/citas', methods=['GET'])
def get_citas():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM citas")
    rows = cur.fetchall()
    for r in rows:
        r['fecha'] = str(r['fecha'])
        r['hora'] = str(r['hora'])
    cur.close(); db.close()
    return jsonify(rows)

@app.route('/api/citas', methods=['POST'])
def add_cita():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    sql = """INSERT INTO citas (pacienteId, psicologoId, fecha, hora, motivo, estado)
             VALUES (%s, %s, %s, %s, %s, %s)"""
    cur.execute(sql, (
        data['pacienteId'], data['psicologoId'], data['fecha'],
        data['hora'], data['motivo'], data.get('estado', 'pendiente')
    ))
    db.commit()
    cid = cur.lastrowid
    cur.close(); db.close()
    return jsonify({"ok": True, "id": cid})

@app.route('/api/citas/<int:id>', methods=['PUT'])
def update_cita(id):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    sql = """UPDATE citas SET pacienteId=%s, psicologoId=%s, fecha=%s, hora=%s,
             motivo=%s, estado=%s WHERE id=%s"""
    cur.execute(sql, (
        data['pacienteId'], data['psicologoId'], data['fecha'], data['hora'],
        data['motivo'], data['estado'], id
    ))
    db.commit()
    cur.close(); db.close()
    return jsonify({"ok": True})

@app.route('/api/citas/<int:id>', methods=['DELETE'])
def delete_cita(id):
    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM citas WHERE id=%s", (id,))
    db.commit()
    cur.close(); db.close()
    return jsonify({"ok": True})

# ============ API: SEGUIMIENTOS ============
@app.route('/api/seguimientos', methods=['GET'])
def get_seguimientos():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM seguimientos")
    rows = cur.fetchall()
    for r in rows:
        r['fecha'] = str(r['fecha'])
    cur.close(); db.close()
    return jsonify(rows)

@app.route('/api/seguimientos', methods=['POST'])
def add_seguimiento():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    sql = """INSERT INTO seguimientos (pacienteId, psicologoId, fecha, observacion, estado)
             VALUES (%s, %s, %s, %s, %s)"""
    cur.execute(sql, (
        data['pacienteId'], data['psicologoId'], data['fecha'],
        data['observacion'], data['estado']
    ))
    db.commit()
    cur.close(); db.close()
    return jsonify({"ok": True})

# ============ ARRANCAR ============
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)