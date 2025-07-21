# app/models.py

from app import db
from datetime import datetime

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=False)
    organizer_name = db.Column(db.String(120))
    organizer_email = db.Column(db.String(120))
    

    def __repr__(self):
        return f'<Booking {self.title}>'