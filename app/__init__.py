# app/__init__.py
import os
from flask import Flask, send_from_directory
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    db.init_app(app)
    migrate.init_app(app, db)

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