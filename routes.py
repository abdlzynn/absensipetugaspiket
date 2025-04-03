import os
import uuid
import requests
import pytz
from datetime import datetime
from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, session
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image

from app import app, db
from models import Absensi, Notification, DEFAULT_TIMEZONE
from utils import generate_pdf

# Make DEFAULT_TIMEZONE available to all templates
@app.context_processor
def inject_timezone():
    return dict(DEFAULT_TIMEZONE=DEFAULT_TIMEZONE)

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_base64_image(base64_str, prefix):
    """Save base64 encoded image to file and return the filename"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        # Decode base64 string to image
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'): 
            img = img.convert('RGB')
            
        # Resize to a smaller size to reduce file size
        # Max dimension 800px
        max_size = 800
        if img.width > max_size or img.height > max_size:
            if img.width > img.height:
                ratio = max_size / img.width
                new_size = (max_size, int(img.height * ratio))
            else:
                ratio = max_size / img.height
                new_size = (int(img.width * ratio), max_size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Generate unique filename
        filename = f"{prefix}_{uuid.uuid4().hex}.jpg"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save image with reduced quality
        img.save(file_path, 'JPEG', quality=70)
        return os.path.join('static/uploads', filename)
    except Exception as e:
        app.logger.error(f"Error saving image: {e}")
        return None

@app.route('/')
def index():
    """Redirect to the absensi page by default"""
    return redirect(url_for('absensi'))

@app.route('/notifications')
def get_notifications():
    """Get recent notifications"""
    # Get 5 latest unread notifications
    notifications = Notification.query.filter_by(is_read=False).order_by(Notification.waktu.desc()).limit(5).all()
    
    # Convert to dict for JSON response
    notification_list = [notification.to_dict() for notification in notifications]
    
    return jsonify(notifications=notification_list)

@app.route('/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    """Mark all notifications as read"""
    try:
        # Update all unread notifications
        Notification.query.filter_by(is_read=False).update({Notification.is_read: True})
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/absensi')
def absensi():
    """User interface for attendance"""
    # Get recent notifications for display
    notifications = Notification.query.order_by(Notification.waktu.desc()).limit(5).all()
    return render_template('user/absensi.html', notifications=notifications)

@app.route('/submit-absensi', methods=['POST'])
def submit_absensi():
    """Handle attendance form submission"""
    try:
        # Get form data
        nama = request.form.get('nama')
        lokasi = request.form.get('lokasi')
        latitude = float(request.form.get('latitude'))
        longitude = float(request.form.get('longitude'))
        status = request.form.get('status')
        foto_depan_b64 = request.form.get('foto_depan')
        foto_belakang_b64 = request.form.get('foto_belakang')
        device_time = request.form.get('device_time')
        
        # Validate form data
        if not all([nama, lokasi, latitude, longitude, status, foto_depan_b64, foto_belakang_b64]):
            return jsonify({'success': False, 'message': 'Semua field harus diisi'}), 400
            
        # Get today's date in YYYY-MM-DD format for checking attendance status
        today = datetime.now(DEFAULT_TIMEZONE).date()
        
        # Check if this person has already taken attendance with the same status today
        existing_attendance = Absensi.query.filter(
            db.func.date(Absensi.waktu) == today,
            Absensi.nama == nama,
            Absensi.status == status
        ).first()
        
        if existing_attendance:
            return jsonify({
                'success': False, 
                'message': f'Anda sudah melakukan absen {status} hari ini'
            }), 400
        
        # Parse device time if provided, otherwise use server time
        try:
            if device_time:
                # Parse ISO format datetime from client with timezone
                # The format should be: YYYY-MM-DDTHH:MM:SS+HH:MM or YYYY-MM-DDTHH:MM:SS-HH:MM
                app.logger.debug(f"Received device time: {device_time}")
                
                # Handle different format possibilities
                if 'Z' in device_time:
                    # If time ends with Z (UTC), replace with +00:00
                    waktu = datetime.fromisoformat(device_time.replace('Z', '+00:00'))
                elif '+' in device_time or '-' in device_time:
                    # If time already has timezone information
                    if device_time.count(':') == 3:  # If format has seconds and timezone with colon
                        waktu = datetime.fromisoformat(device_time)
                    else:
                        # If format doesn't match expected format, try different approach
                        try:
                            from dateutil import parser
                            waktu = parser.parse(device_time)
                        except:
                            raise ValueError(f"Could not parse device time: {device_time}")
                else:
                    # If no timezone info, assume Asia/Jakarta timezone
                    waktu = datetime.fromisoformat(device_time).replace(tzinfo=DEFAULT_TIMEZONE)
                
                app.logger.debug(f"Parsed time: {waktu}")
            else:
                # Fallback to server time with timezone set to DEFAULT_TIMEZONE
                waktu = datetime.now(DEFAULT_TIMEZONE)
        except (ValueError, TypeError) as e:
            app.logger.warning(f"Error parsing device time: {e}, using server time instead")
            waktu = datetime.now(DEFAULT_TIMEZONE)
        
        # Save images
        foto_depan_path = save_base64_image(foto_depan_b64, 'depan')
        foto_belakang_path = save_base64_image(foto_belakang_b64, 'belakang')
        
        if not foto_depan_path or not foto_belakang_path:
            return jsonify({'success': False, 'message': 'Gagal menyimpan foto'}), 500
        
        # Create and save new attendance record
        new_absensi = Absensi(
            nama=nama,
            lokasi=lokasi,
            latitude=latitude,
            longitude=longitude,
            foto_depan=foto_depan_path,
            foto_belakang=foto_belakang_path,
            status=status,
            waktu=waktu
        )
        
        db.session.add(new_absensi)
        
        # Create notification
        status_text = "masuk" if status == "masuk" else "pulang"
        notification_message = f"{nama} telah melakukan absen {status_text}"
        new_notification = Notification(
            message=notification_message,
            waktu=waktu,
            is_read=False
        )
        
        db.session.add(new_notification)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Absensi berhasil tercatat'})
    
    except Exception as e:
        app.logger.error(f"Error submitting attendance: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Terjadi kesalahan: {str(e)}'}), 500

@app.route('/admin', methods=['GET', 'POST'])
def admin_dashboard():
    """Admin dashboard for attendance records, protected with password"""
    # Check if already authenticated in session
    if not session.get('admin_authenticated'):
        # If not authenticated, show login form
        if request.method == 'POST':
            # Handle login form submission
            password = request.form.get('password')
            if password == 'Z4yy4n4501':
                # Set session flag for authentication
                session['admin_authenticated'] = True
            else:
                flash('Password salah!', 'danger')
                return render_template('admin/login.html')
        else:
            # Show login form
            return render_template('admin/login.html')
    
    # If authenticated, continue to dashboard
    # Get filter parameters
    tanggal = request.args.get('tanggal')
    nama = request.args.get('nama', '')
    status = request.args.get('status', '')
    
    # Base query
    query = Absensi.query
    
    # Apply filters
    if tanggal:
        date_obj = datetime.strptime(tanggal, '%Y-%m-%d')
        query = query.filter(
            db.func.date(Absensi.waktu) == date_obj.date()
        )
    
    if nama:
        query = query.filter(Absensi.nama.ilike(f'%{nama}%'))
    
    if status:
        query = query.filter(Absensi.status == status)
    
    # Get the records ordered by time (descending)
    absensi_list = query.order_by(Absensi.waktu.desc()).all()
    
    return render_template('admin/dashboard.html', absensi_list=absensi_list, 
                          filter_tanggal=tanggal, filter_nama=nama, filter_status=status)

@app.route('/admin/detail/<int:absensi_id>')
def detail_absensi(absensi_id):
    """Detail view for a specific attendance record"""
    # Check if admin is authenticated
    if not session.get('admin_authenticated'):
        flash('Anda harus login terlebih dahulu!', 'danger')
        return redirect(url_for('admin_dashboard'))
        
    absensi = Absensi.query.get_or_404(absensi_id)
    return render_template('admin/detail_absensi.html', absensi=absensi)

@app.route('/admin/export-pdf', methods=['POST'])
def export_pdf():
    """Export attendance records as PDF"""
    # Check if admin is authenticated
    if not session.get('admin_authenticated'):
        flash('Anda harus login terlebih dahulu!', 'danger')
        return redirect(url_for('admin_dashboard'))
        
    # Get filter parameters
    tanggal = request.form.get('tanggal', '')
    nama = request.form.get('nama', '')
    status = request.form.get('status', '')
    
    # Base query
    query = Absensi.query
    
    # Apply filters
    if tanggal and tanggal != 'None' and tanggal.strip():
        try:
            date_obj = datetime.strptime(tanggal, '%Y-%m-%d')
            query = query.filter(
                db.func.date(Absensi.waktu) == date_obj.date()
            )
        except ValueError:
            # Handle invalid date format
            flash('Format tanggal tidak valid', 'danger')
            return redirect(url_for('admin_dashboard'))
    
    if nama:
        query = query.filter(Absensi.nama.ilike(f'%{nama}%'))
    
    if status:
        query = query.filter(Absensi.status == status)
    
    # Get the records ordered by time (descending)
    absensi_list = query.order_by(Absensi.waktu.desc()).all()
    
    # Generate PDF
    pdf_file = generate_pdf(absensi_list, tanggal, nama, status)
    
    # Return PDF file
    return send_file(
        pdf_file,
        download_name=f"laporan_absensi_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
        as_attachment=True
    )

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500
