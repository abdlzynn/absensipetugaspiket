document.addEventListener('DOMContentLoaded', function() {
    // Map initialization
    let map = null;
    let marker = null;
    const defaultLat = -6.2088;  // Default fallback to Jakarta, Indonesia
    const defaultLng = 106.8456;
    
    // Try to get device location first, if not available use default
    if (navigator.geolocation) {
        showAlert('success', 'Mendapatkan lokasi perangkat... Mohon tunggu');
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                initMap(position.coords.latitude, position.coords.longitude);
                // Update hidden fields with detected location
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
                showAlert('success', 'Lokasi berhasil ditemukan');
            },
            // Error callback (use default location if geolocation fails)
            function(error) {
                console.error("Geolocation error:", error);
                initMap(defaultLat, defaultLng);
                showAlert('error', 'Gagal mendapatkan lokasi otomatis. Gunakan tombol "Dapatkan Lokasi"');
            },
            // Options - use high accuracy for better results
            {
                enableHighAccuracy: true,
                timeout: 10000, 
                maximumAge: 0
            }
        );
    } else {
        // Fallback to default location if geolocation not supported
        initMap(defaultLat, defaultLng);
    }
    
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
    
    // Get location button handler - to refresh location if needed
    document.getElementById('getLocationBtn').addEventListener('click', function() {
        if (navigator.geolocation) {
            showAlert('success', 'Memperbarui lokasi... Mohon tunggu');
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
                },
                // Options - use high accuracy, short timeout and no cached position
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            showAlert('error', 'Geolocation tidak didukung oleh browser ini.');
        }
    });
    
    // Front and back camera variables
    const frontPreview = document.getElementById('frontPreview');
    const backPreview = document.getElementById('backPreview');
    
    // File input handlers for camera capture
    document.getElementById('frontCameraInput').addEventListener('change', function(e) {
        handleCameraCapture(e, 'front');
    });
    
    document.getElementById('backCameraInput').addEventListener('change', function(e) {
        handleCameraCapture(e, 'back');
    });
    
    // Reset button handlers
    document.getElementById('retakeFrontBtn').addEventListener('click', function() {
        retakePhoto('front');
    });
    
    document.getElementById('retakeBackBtn').addEventListener('click', function() {
        retakePhoto('back');
    });
    
    // Handle file input change (camera capture)
    function handleCameraCapture(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        const preview = type === 'front' ? frontPreview : backPreview;
        const inputField = type === 'front' ? 'foto_depan' : 'foto_belakang';
        const retakeBtn = type === 'front' ? 'retakeFrontBtn' : 'retakeBackBtn';
        
        // Compress and resize image before saving
        compressImage(file, function(compressedImage) {
            // Display preview
            preview.src = compressedImage;
            preview.classList.remove('d-none');
            
            // Set the compressed base64 data to hidden input
            document.getElementById(inputField).value = compressedImage;
            
            // Show retake button
            document.getElementById(retakeBtn).classList.remove('d-none');
        });
    }
    
    // Function to compress and resize image
    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                
                // Calculate new dimensions (max 800px width/height)
                let width = img.width;
                let height = img.height;
                const maxSize = 800;
                
                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
                
                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;
                
                // Draw resized image on canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed JPEG (quality 0.6 = 60%)
                const compressedImage = canvas.toDataURL('image/jpeg', 0.6);
                
                // Return compressed image
                callback(compressedImage);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // Reset photo
    function retakePhoto(type) {
        // Reset input field
        const inputField = type === 'front' ? 'foto_depan' : 'foto_belakang';
        const fileInput = type === 'front' ? 'frontCameraInput' : 'backCameraInput';
        const preview = type === 'front' ? frontPreview : backPreview;
        const retakeBtn = type === 'front' ? 'retakeFrontBtn' : 'retakeBackBtn';
        
        // Clear values
        document.getElementById(inputField).value = '';
        document.getElementById(fileInput).value = '';
        
        // Hide preview and retake button
        preview.classList.add('d-none');
        document.getElementById(retakeBtn).classList.add('d-none');
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
                    document.getElementById('frontCameraInput').value = '';
                    document.getElementById('backCameraInput').value = '';
                    frontPreview.classList.add('d-none');
                    backPreview.classList.add('d-none');
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
