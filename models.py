from datetime import datetime
from app import db

class Absensi(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nama = db.Column(db.String(100), nullable=False)
    lokasi = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    foto_depan = db.Column(db.String(255), nullable=False)  # File path for front photo
    foto_belakang = db.Column(db.String(255), nullable=False)  # File path for back photo
    status = db.Column(db.String(20), nullable=False)  # 'masuk' or 'pulang'
    waktu = db.Column(db.DateTime, default=datetime.now, nullable=False)
    
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
