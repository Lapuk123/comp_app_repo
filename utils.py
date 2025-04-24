import os
from werkzeug.utils import secure_filename
import uuid
from app import app

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
    if not date:
        return ""
    return date.strftime("%B %d, %Y")

def get_status_badge_class(status):
    """Get the Bootstrap badge class for a status"""
    if status == "lost":
        return "bg-danger"
    elif status == "found":
        return "bg-success"
    elif status == "claimed":
        return "bg-info"
    return "bg-secondary"