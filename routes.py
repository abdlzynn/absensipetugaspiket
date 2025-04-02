import os
import uuid
import requests
from datetime import datetime
from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, session
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image

from app import app, db
from models import Absensi
from utils import generate_pdf

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
        
        # Generate unique filename
        filename = f"{prefix}_{uuid.uuid4().hex}.jpg"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save image
        img.save(file_path, 'JPEG', quality=85)
        return os.path.join('static/uploads', filename)
    except Exception as e:
        app.logger.error(f"Error saving image: {e}")
        return None

@app.route('/')
def index():
    """Redirect to the absensi page by default"""
    return redirect(url_for('absensi'))

@app.route('/absensi')
def absensi():
    """User interface for attendance"""
    return render_template('user/absensi.html')

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
        
        # Validate form data
        if not all([nama, lokasi, latitude, longitude, status, foto_depan_b64, foto_belakang_b64]):
            return jsonify({'success': False, 'message': 'Semua field harus diisi'}), 400
        
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
            waktu=datetime.now()
        )
        
        db.session.add(new_absensi)
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
            if password == 'simkuring':
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
