# app/__init__.py
import os
from flask import Flask, send_from_directory
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_session import Session # <-- Import Session

db = SQLAlchemy()
migrate = Migrate()
sess = Session() # <-- Create a Session instance

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
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

    # Correctly serve files from the root node_modules directory
    @app.route('/static/node_modules/<path:filename>')
    def node_modules(filename):
        return send_from_directory(
            os.path.join(app.root_path, '..', 'node_modules'), filename
        )

    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)

    from app import models

    return app