import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import uuid
from config import get_config

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy
db = SQLAlchemy(model_class=Base)

# Create the Flask app
app = Flask(__name__)
app.config.from_object(get_config())
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # needed for url_for to generate with https

# Ensure upload directory exists
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Initialize the app with SQLAlchemy
db.init_app(app)

# Add template context processor to include current datetime in all templates
@app.context_processor
def inject_now():
    return {'now': datetime.now()}

# Import models after db is defined to avoid circular imports
with app.app_context():
    from models import User, Item, Category
    db.create_all()
    
    try:
        # Create default admin if not exists
        admin = User.query.filter_by(email="admin@my.jru.edu").first()
        if not admin:
            admin = User(
                name="System Administrator",
                email="admin@my.jru.edu",
                password_hash=generate_password_hash("admin123"),
                user_type="admin",
                is_active=True
            )
            db.session.add(admin)
            db.session.commit()
        
        # Add default categories if they don't exist
        categories = [
            "Electronics", "Books/Notes", "Clothing", "Accessories", 
            "ID/Cards", "Keys", "Bags", "Others"
        ]
        
        # MySQL doesn't have ON CONFLICT, so we use the ORM approach with explicit checks
        for cat_name in categories:
            try:
                # Check if category exists first 
                existing = Category.query.filter_by(name=cat_name).first()
                if not existing:
                    # Insert the category if it doesn't exist
                    category = Category(name=cat_name)
                    db.session.add(category)
                    db.session.commit()
                    app.logger.info(f"Added category: {cat_name}")
            except Exception as e:
                app.logger.error(f"Error adding category '{cat_name}': {str(e)}")
                db.session.rollback()
                
    except Exception as e:
        app.logger.error(f"Error during initialization: {str(e)}")
        db.session.rollback()

# Helper functions
def login_required(f):
    """Decorator to check if user is logged in"""
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page", "warning")
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def admin_required(f):
    """Decorator to check if user is an admin"""
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page", "warning")
            return redirect(url_for("login", next=request.url))
        
        user = User.query.get(session["user_id"])
        if not user or user.user_type != "admin":
            flash("You do not have permission to access this page", "danger")
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def allowed_file(filename):
    """Check if the file extension is allowed"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file):
    """Save an uploaded image and return the filename"""
    if file and file.filename and allowed_file(file.filename):
        # Create a unique filename
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Ensure upload directory exists
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
        file.save(file_path)
        app.logger.info(f"Checking if file exists: {os.path.exists(file_path)}")
        app.logger.info(f"Saved image to {file_path}")
        return unique_filename
    return None

# Routes
@app.route("/")
def index():
    # Get recent items (limit to 5)
    recent_found_items = Item.query.filter_by(status="found").order_by(Item.created_at.desc()).limit(5).all()
    recent_lost_items = Item.query.filter_by(status="lost").order_by(Item.created_at.desc()).limit(5).all()
    
    # Get counts for dashboard
    lost_count = Item.query.filter_by(status="lost").count()
    found_count = Item.query.filter_by(status="found").count()
    claimed_count = Item.query.filter_by(status="claimed").count()
    
    return render_template(
        "index.html", 
        recent_found_items=recent_found_items, 
        recent_lost_items=recent_lost_items,
        lost_count=lost_count,
        found_count=found_count,
        claimed_count=claimed_count
    )

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        
        # Validate form data
        if not email or not password:
            flash("Please fill in all fields", "danger")
            return redirect(url_for("login"))
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            flash("Invalid email or password", "danger")
            return redirect(url_for("login"))
        
        # Check if user is active
        if not user.is_active:
            flash("Your account is not active. Please contact an administrator.", "danger")
            return redirect(url_for("login"))
        
        # Log in the user
        session["user_id"] = user.id
        session["user_name"] = user.name
        session["user_type"] = user.user_type
        
        flash(f"Welcome back, {user.name}!", "success")
        
        # Redirect to next page or dashboard
        next_page = request.args.get("next")
        if next_page:
            return redirect(next_page)
        elif user.user_type == "admin":
            return redirect(url_for("admin_dashboard"))
        else:
            return redirect(url_for("index"))
    
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        
        # Validate form data
        if not name or not email or not password or not confirm_password:
            flash("Please fill in all fields", "danger")
            return redirect(url_for("register"))
        
        # Validate email domain for JRU
        if not email.endswith("@my.jru.edu"):
            flash("Please use your JRU email address (@my.jru.edu)", "danger")
            return redirect(url_for("register"))
        
        # Check if passwords match
        if password != confirm_password:
            flash("Passwords do not match", "danger")
            return redirect(url_for("register"))
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            flash("Email already registered", "danger")
            return redirect(url_for("register"))
        
        # Create new user
        new_user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            user_type="user",
            is_active=True
        )
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash("Registration successful! You can now log in.", "success")
            return redirect(url_for("login"))
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error registering user: {str(e)}")
            flash("An error occurred during registration. Please try again.", "danger")
            return redirect(url_for("register"))
    
    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out", "info")
    return redirect(url_for("index"))

@app.route("/report", methods=["GET", "POST"])
@login_required
def report_item():
    categories = Category.query.all()
    
    if request.method == "POST":
        item_name = request.form.get("item_name")
        description = request.form.get("description")
        category_id = request.form.get("category")
        status = request.form.get("status")
        location = request.form.get("location")
        date_string = request.form.get("date")
        contact_info = request.form.get("contact_info")
        
        # Validate form data
        if not item_name or not description or not category_id or not status or not location or not date_string:
            flash("Please fill in all required fields", "danger")
            return redirect(url_for("report_item"))
        
        # Parse date
        try:
            date = datetime.strptime(date_string, "%Y-%m-%d").date()
        except ValueError:
            flash("Invalid date format", "danger")
            return redirect(url_for("report_item"))
        
        # Handle image upload
        image_filename = None
        if "item_image" in request.files:
            image_file = request.files["item_image"]
            image_filename = save_image(image_file)
        
        # Create new item
        new_item = Item(
            name=item_name,
            description=description,
            category_id=category_id,
            status=status,
            location=location,
            date=date,
            contact_info=contact_info,
            image=image_filename,
            user_id=session["user_id"]
        )
        
        try:
            db.session.add(new_item)
            db.session.commit()
            flash(f"Item successfully reported as {status}!", "success")
            return redirect(url_for("index"))
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error reporting item: {str(e)}")
            flash("An error occurred while reporting the item. Please try again.", "danger")
            return redirect(url_for("report_item"))
    
    return render_template("report_item.html", categories=categories)

@app.route("/search")
def search():
    categories = Category.query.all()
    return render_template("search.html", categories=categories)

@app.route("/api/search")
def api_search():
    # Get search parameters
    query = request.args.get("query", "")
    category_id = request.args.get("category")
    status = request.args.get("status")
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    
    # Base query
    items_query = Item.query
    
    # Apply filters
    if query:
        items_query = items_query.filter(
            (Item.name.ilike(f"%{query}%")) | 
            (Item.description.ilike(f"%{query}%")) |
            (Item.location.ilike(f"%{query}%"))
        )
    
    if category_id:
        items_query = items_query.filter_by(category_id=category_id)
    
    if status:
        items_query = items_query.filter_by(status=status)
    
    if from_date:
        try:
            from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()
            items_query = items_query.filter(Item.date >= from_date_obj)
        except ValueError:
            pass
    
    if to_date:
        try:
            to_date_obj = datetime.strptime(to_date, "%Y-%m-%d").date()
            items_query = items_query.filter(Item.date <= to_date_obj)
        except ValueError:
            pass
    
    # Order by date, newest first
    items = items_query.order_by(Item.created_at.desc()).all()
    
    # Prepare results
    results = []
    for item in items:
        category = Category.query.get(item.category_id)
        results.append({
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "category": category.name if category else "Unknown",
            "status": item.status,
            "location": item.location,
            "date": item.date.strftime("%Y-%m-%d"),
            "image": item.image,
            "created_at": item.created_at.strftime("%Y-%m-%d %H:%M")
        })
    
    return jsonify({"success": True, "results": results})

@app.route("/item/<int:item_id>")
def item_details(item_id):
    item = Item.query.get_or_404(item_id)
    category = Category.query.get(item.category_id) if item.category_id else None
    user = User.query.get(item.user_id) if item.user_id else None
    # Robust error handling for missing related objects
    if not category:
        flash("Category information is missing for this item.", "warning")
    if not user:
        flash("User information is missing for this item.", "warning")
    # Ensure item.date is a datetime object (if not, try to parse)
    if hasattr(item, 'date') and not isinstance(item.date, datetime):
        try:
            item.date = datetime.strptime(str(item.date), "%Y-%m-%d")
        except Exception:
            item.date = datetime.now()
    return render_template("item_details.html", item=item, category=category, user=user)

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    app.logger.info(f"Requested image: {filename}")
    app.logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    app.logger.info(f"Full path: {os.path.join(app.config['UPLOAD_FOLDER'], filename)}")
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/item/<int:item_id>/claim")
@login_required
def mark_as_claimed(item_id):
    item = Item.query.get_or_404(item_id)
    
    # Check if user is authorized (admin or reporter of the item)
    if session.get("user_id") != item.user_id and session.get("user_type") != "admin":
        flash("You are not authorized to mark this item as claimed", "danger")
        return redirect(url_for("item_details", item_id=item_id))
    
    # Check if already claimed
    if item.status == "claimed":
        flash("This item has already been claimed", "info")
        return redirect(url_for("item_details", item_id=item_id))
    
    # If it's a found item, delete it completely
    if item.status == "found":
        # Remove image if exists
        if item.image:
            try:
                image_path = os.path.join(app.config["UPLOAD_FOLDER"], item.image)
                if os.path.exists(image_path):
                    os.remove(image_path)
                    app.logger.info(f"Deleted image: {image_path}")
            except Exception as e:
                app.logger.error(f"Error removing image: {str(e)}")
        
        try:
            db.session.delete(item)
            db.session.commit()
            flash("Item has been marked as claimed and removed from the system", "success")
            return redirect(url_for("index"))
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error deleting claimed item: {str(e)}")
            flash("An error occurred. Please try again.", "danger")
            return redirect(url_for("item_details", item_id=item_id))
    else:
        # For lost items, just update the status to claimed
        item.status = "claimed"
        
        try:
            db.session.commit()
            flash("Item has been marked as claimed", "success")
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error marking item as claimed: {str(e)}")
            flash("An error occurred. Please try again.", "danger")
        
        return redirect(url_for("item_details", item_id=item_id))

# Admin routes
@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    # Get counts
    total_users = User.query.count()
    total_items = Item.query.count()
    lost_items = Item.query.filter_by(status="lost").count()
    found_items = Item.query.filter_by(status="found").count()
    claimed_items = Item.query.filter_by(status="claimed").count()
    
    # Get recent items
    recent_items = Item.query.order_by(Item.created_at.desc()).limit(10).all()
    
    return render_template(
        "admin/dashboard.html",
        total_users=total_users,
        total_items=total_items,
        lost_items=lost_items,
        found_items=found_items,
        claimed_items=claimed_items,
        recent_items=recent_items
    )

@app.route("/admin/items")
@admin_required
def admin_items():
    items = Item.query.order_by(Item.created_at.desc()).all()
    categories = Category.query.all()
    return render_template("admin/manage_items.html", items=items, categories=categories)

@app.route("/admin/users")
@admin_required
def admin_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return render_template("admin/manage_users.html", users=users)

@app.route("/api/item/update/<int:item_id>", methods=["POST"])
@admin_required
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    
    # Update fields
    if "name" in request.form:
        item.name = request.form.get("name")
    if "description" in request.form:
        item.description = request.form.get("description")
    if "category_id" in request.form:
        item.category_id = request.form.get("category_id")
    if "status" in request.form:
        item.status = request.form.get("status")
    if "location" in request.form:
        item.location = request.form.get("location")
    if "date" in request.form:
        date_string = request.form.get("date")
        try:
            item.date = datetime.strptime(date_string, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid date format"})
    
    # Handle image update if provided
    if "item_image" in request.files:
        image_file = request.files["item_image"]
        if image_file and image_file.filename:
            image_filename = save_image(image_file)
            if image_filename:
                # Remove old image if exists
                if item.image:
                    try:
                        old_image_path = os.path.join(app.config["UPLOAD_FOLDER"], item.image)
                        if os.path.exists(old_image_path):
                            os.remove(old_image_path)
                    except Exception as e:
                        app.logger.error(f"Error removing old image: {str(e)}")
                
                item.image = image_filename
    
    try:
        db.session.commit()
        return jsonify({"success": True, "message": "Item updated successfully"})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating item: {str(e)}")
        return jsonify({"success": False, "message": "Failed to update item"})

@app.route("/api/item/delete/<int:item_id>", methods=["POST"])
@admin_required
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    
    # Remove image if exists
    if item.image:
        try:
            image_path = os.path.join(app.config["UPLOAD_FOLDER"], item.image)
            if os.path.exists(image_path):
                os.remove(image_path)
        except Exception as e:
            app.logger.error(f"Error removing image: {str(e)}")
    
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"success": True, "message": "Item deleted successfully"})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting item: {str(e)}")
        return jsonify({"success": False, "message": "Failed to delete item"})

@app.route("/api/user/update/<int:user_id>", methods=["POST"])
@admin_required
def update_user(user_id):
    # Prevent updating the current user to avoid locking out
    if user_id == session.get("user_id") and request.form.get("is_active") == "false":
        return jsonify({"success": False, "message": "Cannot deactivate your own account"})
    
    user = User.query.get_or_404(user_id)
    
    # Update fields
    if "name" in request.form:
        user.name = request.form.get("name")
    if "email" in request.form:
        user.email = request.form.get("email")
    if "user_type" in request.form:
        user.user_type = request.form.get("user_type")
    if "is_active" in request.form:
        user.is_active = request.form.get("is_active") == "true"
    if "password" in request.form and request.form.get("password"):
        user.password_hash = generate_password_hash(request.form.get("password"))
    
    try:
        db.session.commit()
        return jsonify({"success": True, "message": "User updated successfully"})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({"success": False, "message": "Failed to update user"})

@app.route("/api/user/delete/<int:user_id>", methods=["POST"])
@admin_required
def delete_user(user_id):
    # Prevent deleting the current user
    if user_id == session.get("user_id"):
        return jsonify({"success": False, "message": "Cannot delete your own account"})
    
    user = User.query.get_or_404(user_id)
    
    try:
        # Delete all items associated with this user
        items = Item.query.filter_by(user_id=user_id).all()
        for item in items:
            # Remove image if exists
            if item.image:
                try:
                    image_path = os.path.join(app.config["UPLOAD_FOLDER"], item.image)
                    if os.path.exists(image_path):
                        os.remove(image_path)
                except Exception as e:
                    app.logger.error(f"Error removing image: {str(e)}")
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True, "message": "User deleted successfully"})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting user: {str(e)}")
        return jsonify({"success": False, "message": "Failed to delete user"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)