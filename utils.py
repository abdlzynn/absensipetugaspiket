import os
from datetime import datetime
from io import BytesIO
import tempfile
from flask import render_template
from weasyprint import HTML, CSS
from app import app
from models import DEFAULT_TIMEZONE

def generate_pdf(absensi_list, tanggal=None, nama=None, status=None):
    """Generate a PDF report of attendance records"""
    # Create a temporary file to store the PDF
    temp_file = BytesIO()
    
    # Create filter description
    filters = []
    if tanggal and tanggal != 'None' and tanggal.strip():
        try:
            date_obj = datetime.strptime(tanggal, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%d-%m-%Y')
            filters.append(f"Tanggal: {formatted_date}")
        except ValueError:
            filters.append("Tanggal: Semua")
    if nama and nama.strip():
        filters.append(f"Nama: {nama}")
    if status and status.strip():
        filters.append(f"Status: {'Masuk' if status == 'masuk' else 'Pulang'}")
    
    filter_description = ", ".join(filters) if filters else "Semua data"
    
    # Create HTML content for the PDF
    today = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Laporan Absensi</title>
        <style>
            @page {{
                size: A4;
                margin: 2cm;
            }}
            body {{
                font-family: Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.5;
            }}
            .header {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .title {{
                font-size: 18pt;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            .subtitle {{
                font-size: 14pt;
                margin-bottom: 20px;
            }}
            .info {{
                margin-bottom: 20px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th, td {{
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
            }}
            th {{
                background-color: #f2f2f2;
            }}
            .footer {{
                text-align: right;
                font-size: 10pt;
                margin-top: 30px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Laporan Absensi Petugas Piket</div>
            <div class="subtitle">Yayasan Mizan Amanah</div>
        </div>
        
        <div class="info">
            <p><strong>Tanggal Cetak:</strong> {today}</p>
            <p><strong>Filter:</strong> {filter_description}</p>
            <p><strong>Jumlah Data:</strong> {len(absensi_list)}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Lokasi</th>
                    <th>Status</th>
                    <th>Waktu</th>
                </tr>
            </thead>
            <tbody>
    """
    
    # Add rows to the table
    for i, absensi in enumerate(absensi_list, 1):
        waktu_str = absensi.waktu.strftime("%d-%m-%Y %H:%M:%S")
        html_content += f"""
                <tr>
                    <td>{i}</td>
                    <td>{absensi.nama}</td>
                    <td>{absensi.lokasi}</td>
                    <td>{"Masuk" if absensi.status == "masuk" else "Pulang"}</td>
                    <td>{absensi.waktu.astimezone(DEFAULT_TIMEZONE).strftime('%d-%m-%Y %H:%M:%S')} (Waktu Perangkat)</td>
                </tr>
        """
    
    # Close the HTML content
    html_content += """
            </tbody>
        </table>
        
        <div class="footer">
            <p>Dokumen ini dihasilkan secara otomatis oleh sistem.</p>
        </div>
    </body>
    </html>
    """
    
    # Generate PDF from HTML
    HTML(string=html_content).write_pdf(temp_file)
    
    # Reset file pointer
    temp_file.seek(0)
    
    return temp_file
