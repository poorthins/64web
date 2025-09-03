from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv('ALLOW_ORIGIN', 'http://localhost:5173'))

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"ok": True})

@app.route('/api/carbon/calculate', methods=['POST'])
def calculate_carbon():
    data = request.get_json()
    # TODO: 實作碳排計算邏輯
    return jsonify({"result": "計算結果將在此顯示"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)