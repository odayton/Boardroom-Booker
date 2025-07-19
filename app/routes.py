# app/routes.py
from flask import Blueprint, render_template, jsonify, request
from .models import Booking
from app import db
from datetime import datetime

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html', title='Boardroom Booker')

@bp.route('/api/bookings')
def get_bookings():
    bookings = Booking.query.all()
    events = [
        {
            'title': booking.title,
            'start': booking.start_time.isoformat(),
            'end': booking.end_time.isoformat(),
            'id': booking.id
        } for booking in bookings
    ]
    return jsonify(events)

@bp.route('/api/bookings/new', methods=['POST'])
def new_booking():
    try:
        data = request.get_json()
        
        # Convert string dates from the form into datetime objects
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])

        new_booking = Booking(
            title=data['title'],
            start_time=start_time,
            end_time=end_time
        )
        db.session.add(new_booking)
        db.session.commit()
        
        return jsonify({'success': True, 'id': new_booking.id}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400