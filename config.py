import os

class Config:
    """Base configuration class."""
    # Flask settings
    SECRET_KEY = os.environ.get("SESSION_SECRET", "development_key")
    DEBUG = True
    
    # SQLAlchemy settings
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///lostandfound.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # File upload settings
    UPLOAD_FOLDER = "static/uploads"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # App settings
    JRU_DOMAIN = "jru.edu"  # For email validation
    
class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    
# Choose the appropriate config based on environment
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}

def get_config():
    """Return the appropriate configuration object based on environment."""
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config["default"])
