import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app as app

def allowed_file(filename):
    """Check if the file extension is allowed"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file):
    """Save an uploaded image and return the filename"""
    if file and allowed_file(file.filename):
        # Create a unique filename
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
        file.save(file_path)
        return unique_filename
    return None

def format_date(date):
    """Format a date to a readable string"""
    if isinstance(date, str):
        try:
            date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return date
    
    return date.strftime("%B %d, %Y") if date else ""

def get_status_badge_class(status):
    """Get the Bootstrap badge class for a status"""
    status_classes = {
        "lost": "badge bg-danger",
        "found": "badge bg-success",
        "claimed": "badge bg-info"
    }
    return status_classes.get(status.lower(), "badge bg-secondary")
