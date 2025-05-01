import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    """Base configuration class."""
    # Flask settings
    SECRET_KEY = os.environ.get("SESSION_SECRET", "development_key")
    DEBUG = True
    
    # Database settings
    # Using MySQL as the default database (update the URI as needed)
    # Example: mysql+pymysql://username:password@localhost/dbname
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "mysql+pymysql://user:password@localhost/dbname")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database pool options
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,  # Recycle connections 
        "pool_pre_ping": True,  # Verify connections before use
    }
    
    # Upload settings
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "static/uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # Application specific settings
    JRU_DOMAIN = "my.jru.edu"  # For email validation


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


def get_config():
    """Return the appropriate configuration object based on environment."""
    env = os.environ.get("FLASK_ENV", "development")
    if env == "production":
        return ProductionConfig()
    return DevelopmentConfig()