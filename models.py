from datetime import datetime
import pytz
from app import db

# Set the default timezone to Asia/Jakarta (WIB/Indonesia)
DEFAULT_TIMEZONE = pytz.timezone('Asia/Jakarta')

class Absensi(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nama = db.Column(db.String(100), nullable=False)
    lokasi = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    foto_depan = db.Column(db.String(255), nullable=False)  # File path for front photo
    foto_belakang = db.Column(db.String(255), nullable=False)  # File path for back photo
    status = db.Column(db.String(20), nullable=False)  # 'masuk' or 'pulang'
    waktu = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(DEFAULT_TIMEZONE), nullable=False)
    
    def __repr__(self):
        return f"<Absensi {self.nama} at {self.waktu}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.nama,
            'lokasi': self.lokasi,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'foto_depan': self.foto_depan,
            'foto_belakang': self.foto_belakang,
            'status': self.status,
            'waktu': self.waktu.strftime("%Y-%m-%d %H:%M:%S")
        }

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(255), nullable=False)
    waktu = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(DEFAULT_TIMEZONE), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f"<Notification {self.id} - {self.is_read}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'waktu': self.waktu.strftime("%d-%m-%Y %H:%M:%S"),
            'is_read': self.is_read
        }
