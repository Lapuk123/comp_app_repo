import os

class Config:
    """Base configuration class."""
    # Flask settings
    SECRET_KEY = os.environ.get("SESSION_SECRET", "development_key")
    DEBUG = True
    
    # Database settings
    # Using MySQL with PyMySQL dialect for connection string
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "mysql+pymysql://username:password@localhost/jru_lostandfound?charset=utf8mb4")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MySQL specific pool options
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,  # Recycle connections before MySQL's default 8 hour timeout
        "pool_pre_ping": True,  # Verify connections before use
        "pool_size": 10,  # Default pool size
        "max_overflow": 20  # Allow up to 20 connections over pool_size
    }
    
    # Upload settings
    UPLOAD_FOLDER = "static/uploads"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # Application specific settings
    JRU_DOMAIN = "jru.edu"  # For email validation


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