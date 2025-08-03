# app/__init__.py
import os
from flask import Flask, send_from_directory
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_session import Session # <-- Import Session
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
sess = Session() # <-- Create a Session instance
login_manager = LoginManager()

def create_app(config_class=Config):
    # Get the absolute path to the app directory
    app_dir = os.path.abspath(os.path.dirname(__file__))
    template_dir = os.path.join(app_dir, 'templates')
    static_dir = os.path.join(app_dir, 'static')
    
    # Create Flask app with explicit template and static folders
    app = Flask(__name__, 
                template_folder=template_dir,
                static_folder=static_dir,
                instance_relative_config=True)
    app.config.from_object(config_class)

    # --- Add this configuration section ---
    # Configure session to use the filesystem (server-side)
    app.config["SESSION_PERMANENT"] = False
    app.config["SESSION_TYPE"] = "filesystem"
    # ---

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    db.init_app(app)
    migrate.init_app(app, db)
    sess.init_app(app) # <-- Initialize the session extension
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'

    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        return User.query.get(int(user_id))

    # Correctly serve files from the root node_modules directory
    @app.route('/static/node_modules/<path:filename>')
    def node_modules(filename):
        return send_from_directory(
            os.path.join(app.root_path, '..', 'node_modules'), filename
        )

    from app.routes import bp as main_bp
    from app.auth import bp as auth_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app import models

    return app