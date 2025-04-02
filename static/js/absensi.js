document.addEventListener('DOMContentLoaded', function() {
    // Map initialization
    let map = null;
    let marker = null;
    const defaultLat = -6.2088;  // Default to Jakarta, Indonesia
    const defaultLng = 106.8456;
    
    // Initialize map with default location
    initMap(defaultLat, defaultLng);
    
    // Initialize map with given coordinates
    function initMap(lat, lng) {
        if (map === null) {
            map = L.map('map').setView([lat, lng], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            // Add a non-draggable marker
            marker = L.marker([lat, lng], {
                draggable: false
            }).addTo(map);
            
            // Initial values for hidden fields
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            
            // Get initial address from coordinates
            getAddressFromCoordinates(lat, lng);
        } else {
            // Update existing map
            map.setView([lat, lng], 13);
            marker.setLatLng([lat, lng]);
            
            // Get address from new coordinates
            getAddressFromCoordinates(lat, lng);
        }
    }
    
    // Function to get address from coordinates using OpenStreetMap Nominatim API
    function getAddressFromCoordinates(lat, lng) {
        // Show loading in the lokasi input
        const lokasiInput = document.getElementById('lokasi');
        lokasiInput.value = 'Mendapatkan alamat...';
        
        // Call Nominatim API
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
                if (data && data.display_name) {
                    lokasiInput.value = data.display_name;
                } else {
                    lokasiInput.value = `Koordinat: ${lat}, ${lng}`;
                }
            })
            .catch(error => {
                console.error('Error getting address:', error);
                lokasiInput.value = `Koordinat: ${lat}, ${lng}`;
            });
    }
    
    // Get location button click handler
    document.getElementById('getLocationBtn').addEventListener('click', function() {
        if (navigator.geolocation) {
            showAlert('success', 'Mendapatkan lokasi... Mohon tunggu');
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    initMap(lat, lng);
                    
                    // Update hidden fields
                    document.getElementById('latitude').value = lat;
                    document.getElementById('longitude').value = lng;
                },
                // Error callback
                function(error) {
                    let errorMessage = '';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Akses lokasi ditolak.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Informasi lokasi tidak tersedia.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Permintaan lokasi timeout.";
                            break;
                        case error.UNKNOWN_ERROR:
                            errorMessage = "Terjadi kesalahan yang tidak diketahui.";
                            break;
                    }
                    showAlert('error', 'Error: ' + errorMessage);
                }
            );
        } else {
            showAlert('error', 'Geolocation tidak didukung oleh browser ini.');
        }
    });
    
    // Front camera variables
    let frontStream = null;
    const frontCamera = document.getElementById('frontCamera');
    const frontCanvas = document.getElementById('frontCanvas');
    const frontPreview = document.getElementById('frontPreview');
    
    // Back camera variables
    let backStream = null;
    const backCamera = document.getElementById('backCamera');
    const backCanvas = document.getElementById('backCanvas');
    const backPreview = document.getElementById('backPreview');
    
    // Front camera button handlers
    document.getElementById('startFrontCameraBtn').addEventListener('click', function() {
        startCamera('front');
    });
    
    document.getElementById('captureFrontBtn').addEventListener('click', function() {
        capturePhoto('front');
    });
    
    document.getElementById('retakeFrontBtn').addEventListener('click', function() {
        retakePhoto('front');
    });
    
    // Back camera button handlers
    document.getElementById('startBackCameraBtn').addEventListener('click', function() {
        startCamera('back');
    });
    
    document.getElementById('captureBackBtn').addEventListener('click', function() {
        capturePhoto('back');
    });
    
    document.getElementById('retakeBackBtn').addEventListener('click', function() {
        retakePhoto('back');
    });
    
    // Start camera stream
    function startCamera(type) {
        const constraints = {
            video: { facingMode: type === 'back' ? 'environment' : 'user' },
            audio: false
        };
        
        // Stop any existing stream
        if (type === 'front' && frontStream) {
            frontStream.getTracks().forEach(track => track.stop());
        } else if (type === 'back' && backStream) {
            backStream.getTracks().forEach(track => track.stop());
        }
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                if (type === 'front') {
                    frontStream = stream;
                    frontCamera.srcObject = stream;
                    frontCamera.classList.remove('d-none');
                    frontCanvas.classList.add('d-none');
                    frontPreview.classList.add('d-none');
                    document.getElementById('captureFrontBtn').classList.remove('d-none');
                    document.getElementById('startFrontCameraBtn').classList.add('d-none');
                    document.getElementById('retakeFrontBtn').classList.add('d-none');
                    frontCamera.play();
                } else {
                    backStream = stream;
                    backCamera.srcObject = stream;
                    backCamera.classList.remove('d-none');
                    backCanvas.classList.add('d-none');
                    backPreview.classList.add('d-none');
                    document.getElementById('captureBackBtn').classList.remove('d-none');
                    document.getElementById('startBackCameraBtn').classList.add('d-none');
                    document.getElementById('retakeBackBtn').classList.add('d-none');
                    backCamera.play();
                }
            })
            .catch(function(err) {
                showAlert('error', `Error saat mengakses kamera: ${err.message}`);
            });
    }
    
    // Capture photo from camera
    function capturePhoto(type) {
        const video = type === 'front' ? frontCamera : backCamera;
        const canvas = type === 'front' ? frontCanvas : backCanvas;
        const preview = type === 'front' ? frontPreview : backPreview;
        const captureBtn = type === 'front' ? 'captureFrontBtn' : 'captureBackBtn';
        const retakeBtn = type === 'front' ? 'retakeFrontBtn' : 'retakeBackBtn';
        const inputField = type === 'front' ? 'foto_depan' : 'foto_belakang';
        
        // Get canvas context
        const context = canvas.getContext('2d');
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Set hidden input value
        document.getElementById(inputField).value = imageData;
        
        // Show preview
        preview.src = imageData;
        preview.classList.remove('d-none');
        canvas.classList.remove('d-none');
        video.classList.add('d-none');
        
        // Update buttons
        document.getElementById(captureBtn).classList.add('d-none');
        document.getElementById(retakeBtn).classList.remove('d-none');
        
        // Stop camera stream
        if (type === 'front' && frontStream) {
            frontStream.getTracks().forEach(track => track.stop());
        } else if (type === 'back' && backStream) {
            backStream.getTracks().forEach(track => track.stop());
        }
    }
    
    // Retake photo
    function retakePhoto(type) {
        // Reset input field
        const inputField = type === 'front' ? 'foto_depan' : 'foto_belakang';
        document.getElementById(inputField).value = '';
        
        // Start camera again
        startCamera(type);
    }
    
    // Form submission
    document.getElementById('absensiForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const nama = document.getElementById('nama').value;
        const lokasi = document.getElementById('lokasi').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const fotoDpn = document.getElementById('foto_depan').value;
        const fotoBkg = document.getElementById('foto_belakang').value;
        const status = document.querySelector('input[name="status"]:checked').value;
        
        // Validate form data
        if (!nama || !lokasi || !latitude || !longitude || !fotoDpn || !fotoBkg || !status) {
            showAlert('error', 'Harap lengkapi semua field yang diperlukan.');
            return;
        }
        
        // Disable submit button to prevent double submission
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';
        
        // Prepare form data
        const formData = new FormData(this);
        
        // Send data to server
        axios.post('/submit-absensi', formData)
            .then(response => {
                if (response.data.success) {
                    showAlert('success', response.data.message);
                    // Reset form
                    document.getElementById('absensiForm').reset();
                    
                    // Reset photos
                    document.getElementById('foto_depan').value = '';
                    document.getElementById('foto_belakang').value = '';
                    frontPreview.classList.add('d-none');
                    backPreview.classList.add('d-none');
                    document.getElementById('startFrontCameraBtn').classList.remove('d-none');
                    document.getElementById('startBackCameraBtn').classList.remove('d-none');
                    document.getElementById('retakeFrontBtn').classList.add('d-none');
                    document.getElementById('retakeBackBtn').classList.add('d-none');
                    
                    // Reset map to default
                    initMap(defaultLat, defaultLng);
                } else {
                    showAlert('error', response.data.message || 'Terjadi kesalahan saat mengirim data.');
                }
            })
            .catch(error => {
                showAlert('error', error.response?.data?.message || 'Terjadi kesalahan pada server. Silakan coba lagi.');
            })
            .finally(() => {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            });
    });
    
    // Helper function to show alerts
    function showAlert(type, message) {
        const alertContainer = document.getElementById('alertContainer');
        
        // Create alert element
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
        alertEl.role = 'alert';
        
        // Set alert content
        alertEl.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Clear previous alerts
        alertContainer.innerHTML = '';
        
        // Add new alert
        alertContainer.appendChild(alertEl);
        
        // Auto-dismiss after 5 seconds (for success alerts)
        if (type === 'success') {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alertEl);
                bsAlert.close();
            }, 5000);
        }
    }
});
