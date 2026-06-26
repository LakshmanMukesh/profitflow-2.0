import os
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Database Configuration
db_url = os.environ.get('DATABASE_URL')
if db_url:
    # SQLAlchemy requires 'postgresql://' instead of 'postgres://'
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database')
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(db_dir, 'database.db')}"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = secrets.token_hex(24)

db = SQLAlchemy(app)

# --- DATABASE MODELS ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SessionToken(db.Model):
    __tablename__ = 'session_tokens'
    token = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(20), nullable=False) # 'income' or 'expense'
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Budget(db.Model):
    __tablename__ = 'budgets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    month = db.Column(db.String(7), nullable=False) # YYYY-MM
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Goal(db.Model):
    __tablename__ = 'goals'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0.0)
    target_date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class InventoryItem(db.Model):
    __tablename__ = 'inventory'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    purchase_cost = db.Column(db.Float, nullable=False)
    selling_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables
with app.app_context():
    db.create_all()

# --- AUTHENTICATION HELPER ---

def get_user_from_request():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token_str = auth_header.split(' ')[1]
    token_record = SessionToken.query.filter_by(token=token_str).first()
    if not token_record or token_record.expires_at < datetime.utcnow():
        if token_record:
            db.session.delete(token_record)
            db.session.commit()
        return None
    return User.query.get(token_record.user_id)

# --- STATIC FILE ROUTES ---

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# --- API ENDPOINTS ---

# 1. AUTHENTICATION

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email is already registered'}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(name=name, email=email, password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Account created successfully!'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Generate token
    token_str = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(days=7)
    
    # Store token
    session_token = SessionToken(token=token_str, user_id=user.id, expires_at=expires)
    db.session.add(session_token)
    db.session.commit()

    return jsonify({
        'token': token_str,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token_str = auth_header.split(' ')[1]
        token_record = SessionToken.query.filter_by(token=token_str).first()
        if token_record:
            db.session.delete(token_record)
            db.session.commit()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email
    }), 200

# 2. TRANSACTIONS (CRUD)

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    # Filters
    t_type = request.args.get('type')
    category = request.args.get('category')
    search = request.args.get('search')

    query = Transaction.query.filter_by(user_id=user.id)
    if t_type:
        query = query.filter_by(type=t_type)
    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%") | Transaction.category.ilike(f"%{search}%"))

    transactions = query.order_by(Transaction.date.desc(), Transaction.id.desc()).all()
    
    return jsonify([{
        'id': t.id,
        'type': t.type,
        'category': t.category,
        'amount': t.amount,
        'date': t.date,
        'description': t.description
    } for t in transactions]), 200

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    t_type = data.get('type')
    category = data.get('category')
    amount = data.get('amount')
    date = data.get('date')
    description = data.get('description', '')

    if not t_type or not category or amount is None or not date:
        return jsonify({'error': 'Type, category, amount, and date are required'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Amount must be a number'}), 400

    transaction = Transaction(
        user_id=user.id,
        type=t_type,
        category=category,
        amount=amount,
        date=date,
        description=description
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify({'message': 'Transaction added successfully!', 'id': transaction.id}), 201

@app.route('/api/transactions/<int:t_id>', methods=['PUT'])
def edit_transaction(t_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    transaction = Transaction.query.filter_by(id=t_id, user_id=user.id).first()
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404

    data = request.json or {}
    if 'type' in data: transaction.type = data['type']
    if 'category' in data: transaction.category = data['category']
    if 'amount' in data:
        try:
            transaction.amount = float(data['amount'])
        except ValueError:
            return jsonify({'error': 'Amount must be a number'}), 400
    if 'date' in data: transaction.date = data['date']
    if 'description' in data: transaction.description = data['description']

    db.session.commit()
    return jsonify({'message': 'Transaction updated successfully!'}), 200

@app.route('/api/transactions/<int:t_id>', methods=['DELETE'])
def delete_transaction(t_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    transaction = Transaction.query.filter_by(id=t_id, user_id=user.id).first()
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404

    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'message': 'Transaction deleted successfully!'}), 200

# 3. BUDGETS (CRUD)

@app.route('/api/budgets', methods=['GET'])
def get_budgets():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    month = request.args.get('month', datetime.utcnow().strftime('%Y-%m'))
    budgets = Budget.query.filter_by(user_id=user.id, month=month).all()

    # Calculate actual expenses for each category in that month
    start_date = f"{month}-01"
    end_date = f"{month}-31" # Simplistic SQL string comparison is fine for YYYY-MM-DD
    
    # Query expense transaction sums by category
    expense_data = db.session.query(
        Transaction.category, db.func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).group_by(Transaction.category).all()

    spending_map = {category: float(total) for category, total in expense_data}

    result = []
    for b in budgets:
        spent = spending_map.get(b.category, 0.0)
        result.append({
            'id': b.id,
            'category': b.category,
            'amount': b.amount,
            'spent': spent,
            'month': b.month
        })

    return jsonify(result), 200

@app.route('/api/budgets', methods=['POST'])
def add_budget():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    category = data.get('category')
    amount = data.get('amount')
    month = data.get('month', datetime.utcnow().strftime('%Y-%m'))

    if not category or amount is None:
        return jsonify({'error': 'Category and amount are required'}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Amount must be a number'}), 400

    # Check if budget already exists for this category and month
    existing_budget = Budget.query.filter_by(user_id=user.id, category=category, month=month).first()
    if existing_budget:
        existing_budget.amount = amount
        db.session.commit()
        return jsonify({'message': 'Budget updated successfully!', 'id': existing_budget.id}), 200

    budget = Budget(
        user_id=user.id,
        category=category,
        amount=amount,
        month=month
    )
    db.session.add(budget)
    db.session.commit()

    return jsonify({'message': 'Budget set successfully!', 'id': budget.id}), 201

@app.route('/api/budgets/<int:b_id>', methods=['PUT'])
def edit_budget(b_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    budget = Budget.query.filter_by(id=b_id, user_id=user.id).first()
    if not budget:
        return jsonify({'error': 'Budget not found'}), 404

    data = request.json or {}
    if 'category' in data: budget.category = data['category']
    if 'amount' in data:
        try:
            budget.amount = float(data['amount'])
        except ValueError:
            return jsonify({'error': 'Amount must be a number'}), 400
    if 'month' in data: budget.month = data['month']

    db.session.commit()
    return jsonify({'message': 'Budget updated successfully!'}), 200

@app.route('/api/budgets/<int:b_id>', methods=['DELETE'])
def delete_budget(b_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    budget = Budget.query.filter_by(id=b_id, user_id=user.id).first()
    if not budget:
        return jsonify({'error': 'Budget not found'}), 404

    db.session.delete(budget)
    db.session.commit()
    return jsonify({'message': 'Budget deleted successfully!'}), 200

# 4. SAVINGS GOALS (CRUD)

@app.route('/api/goals', methods=['GET'])
def get_goals():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    goals = Goal.query.filter_by(user_id=user.id).order_by(Goal.target_date.asc()).all()
    return jsonify([{
        'id': g.id,
        'name': g.name,
        'target_amount': g.target_amount,
        'current_amount': g.current_amount,
        'target_date': g.target_date
    } for g in goals]), 200

@app.route('/api/goals', methods=['POST'])
def add_goal():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    name = data.get('name')
    target_amount = data.get('target_amount')
    current_amount = data.get('current_amount', 0.0)
    target_date = data.get('target_date')

    if not name or target_amount is None or not target_date:
        return jsonify({'error': 'Name, target amount, and target date are required'}), 400

    try:
        target_amount = float(target_amount)
        current_amount = float(current_amount)
    except ValueError:
        return jsonify({'error': 'Amounts must be numbers'}), 400

    goal = Goal(
        user_id=user.id,
        name=name,
        target_amount=target_amount,
        current_amount=current_amount,
        target_date=target_date
    )
    db.session.add(goal)
    db.session.commit()

    return jsonify({'message': 'Goal added successfully!', 'id': goal.id}), 201

@app.route('/api/goals/<int:g_id>', methods=['PUT'])
def edit_goal(g_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    goal = Goal.query.filter_by(id=g_id, user_id=user.id).first()
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404

    data = request.json or {}
    if 'name' in data: goal.name = data['name']
    if 'target_amount' in data:
        try:
            goal.target_amount = float(data['target_amount'])
        except ValueError:
            return jsonify({'error': 'Target amount must be a number'}), 400
    if 'current_amount' in data:
        try:
            goal.current_amount = float(data['current_amount'])
        except ValueError:
            return jsonify({'error': 'Current amount must be a number'}), 400
    if 'target_date' in data: goal.target_date = data['target_date']

    db.session.commit()
    return jsonify({'message': 'Goal updated successfully!'}), 200

@app.route('/api/goals/<int:g_id>', methods=['DELETE'])
def delete_goal(g_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    goal = Goal.query.filter_by(id=g_id, user_id=user.id).first()
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404

    db.session.delete(goal)
    db.session.commit()
    return jsonify({'message': 'Goal deleted successfully!'}), 200

# 5. INVENTORY (CRUD)

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    items = InventoryItem.query.filter_by(user_id=user.id).order_by(InventoryItem.name.asc()).all()
    return jsonify([{
        'id': i.id,
        'name': i.name,
        'quantity': i.quantity,
        'purchase_cost': i.purchase_cost,
        'selling_price': i.selling_price
    } for i in items]), 200

@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    name = data.get('name')
    quantity = data.get('quantity')
    purchase_cost = data.get('purchase_cost')
    selling_price = data.get('selling_price')

    if not name or quantity is None or purchase_cost is None or selling_price is None:
        return jsonify({'error': 'All fields are required'}), 400

    try:
        quantity = int(quantity)
        purchase_cost = float(purchase_cost)
        selling_price = float(selling_price)
    except ValueError:
        return jsonify({'error': 'Quantity must be integer, costs must be numbers'}), 400

    item = InventoryItem(
        user_id=user.id,
        name=name,
        quantity=quantity,
        purchase_cost=purchase_cost,
        selling_price=selling_price
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({'message': 'Item added successfully!', 'id': item.id}), 201

@app.route('/api/inventory/<int:item_id>', methods=['PUT'])
def edit_inventory_item(item_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    item = InventoryItem.query.filter_by(id=item_id, user_id=user.id).first()
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    data = request.json or {}
    if 'name' in data: item.name = data['name']
    if 'quantity' in data:
        try:
            item.quantity = int(data['quantity'])
        except ValueError:
            return jsonify({'error': 'Quantity must be an integer'}), 400
    if 'purchase_cost' in data:
        try:
            item.purchase_cost = float(data['purchase_cost'])
        except ValueError:
            return jsonify({'error': 'Purchase cost must be a number'}), 400
    if 'selling_price' in data:
        try:
            item.selling_price = float(data['selling_price'])
        except ValueError:
            return jsonify({'error': 'Selling price must be a number'}), 400

    db.session.commit()
    return jsonify({'message': 'Item updated successfully!'}), 200

@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    item = InventoryItem.query.filter_by(id=item_id, user_id=user.id).first()
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted successfully!'}), 200

# 6. DASHBOARD & ANALYTICS

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_summary():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    now = datetime.utcnow()
    current_month = now.strftime('%Y-%m')

    # Transactions count and calculations
    all_transactions = Transaction.query.filter_by(user_id=user.id).all()
    total_income = sum(t.amount for t in all_transactions if t.type == 'income')
    total_expense = sum(t.amount for t in all_transactions if t.type == 'expense')
    balance = total_income - total_expense

    # Recent transactions (max 5)
    recent = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.date.desc(), Transaction.id.desc()).limit(5).all()
    recent_list = [{
        'id': t.id,
        'type': t.type,
        'category': t.category,
        'amount': t.amount,
        'date': t.date,
        'description': t.description
    } for t in recent]

    # Current month budget tracking
    budgets = Budget.query.filter_by(user_id=user.id, month=current_month).all()
    # sum transactions in current month by category
    start_date = f"{current_month}-01"
    end_date = f"{current_month}-31"
    expense_sums = db.session.query(
        Transaction.category, db.func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).group_by(Transaction.category).all()
    
    spending_map = {category: float(total) for category, total in expense_sums}

    budget_status = []
    for b in budgets:
        spent = spending_map.get(b.category, 0.0)
        budget_status.append({
            'category': b.category,
            'limit': b.amount,
            'spent': spent
        })

    # Goals
    goals = Goal.query.filter_by(user_id=user.id).limit(3).all()
    goals_list = [{
        'name': g.name,
        'target': g.target_amount,
        'current': g.current_amount
    } for g in goals]

    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': balance,
        'transaction_count': len(all_transactions),
        'recent_transactions': recent_list,
        'budgets': budget_status,
        'goals': goals_list,
        'user_name': user.name
    }), 200

# 7. PROFIT FLOW & ANALYTICS

@app.route('/api/profits', methods=['GET'])
def get_profit_analytics():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    all_transactions = Transaction.query.filter_by(user_id=user.id).all()
    
    # Calculate revenue (Income from business/freelance/etc.) and cost of sales
    revenue = sum(t.amount for t in all_transactions if t.type == 'income')
    operating_expenses = sum(t.amount for t in all_transactions if t.type == 'expense')
    
    # Inventory stats
    inventory_items = InventoryItem.query.filter_by(user_id=user.id).all()
    total_inventory_value = sum(i.quantity * i.purchase_cost for i in inventory_items)
    potential_revenue = sum(i.quantity * i.selling_price for i in inventory_items)
    potential_profit = potential_revenue - total_inventory_value

    # Group expenses by category
    expense_categories = {}
    for t in all_transactions:
        if t.type == 'expense':
            expense_categories[t.category] = expense_categories.get(t.category, 0.0) + t.amount

    # Simple monthly profit breakdown (last 6 months)
    # We will build a dummy chart data structure based on the user's transactions
    monthly_data = {}
    for t in all_transactions:
        month = t.date[:7] # YYYY-MM
        if month not in monthly_data:
            monthly_data[month] = {'income': 0.0, 'expense': 0.0}
        
        if t.type == 'income':
            monthly_data[month]['income'] += t.amount
        else:
            monthly_data[month]['expense'] += t.amount

    sorted_months = sorted(list(monthly_data.keys()))[-6:]
    chart_labels = []
    chart_income = []
    chart_expense = []
    chart_profit = []

    for m in sorted_months:
        chart_labels.append(m)
        inc = monthly_data[m]['income']
        exp = monthly_data[m]['expense']
        chart_income.append(inc)
        chart_expense.append(exp)
        chart_profit.append(inc - exp)

    return jsonify({
        'revenue': revenue,
        'operating_expenses': operating_expenses,
        'net_profit': revenue - operating_expenses,
        'total_inventory_value': total_inventory_value,
        'potential_profit': potential_profit,
        'expense_breakdown': expense_categories,
        'trend': {
            'labels': chart_labels,
            'income': chart_income,
            'expense': chart_expense,
            'profit': chart_profit
        }
    }), 200

# 8. UPDATE PROFILE/SETTINGS

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if name:
        user.name = name
    if email and email != user.email:
        # Check if already taken
        exists = User.query.filter_by(email=email).first()
        if exists:
            return jsonify({'error': 'Email is already taken'}), 400
        user.email = email

    if new_password:
        if not current_password or not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Incorrect current password'}), 400
        user.password_hash = generate_password_hash(new_password)

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully!', 'user': {'name': user.name, 'email': user.email}}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
