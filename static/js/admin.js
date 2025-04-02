document.addEventListener('DOMContentLoaded', function() {
    // Date filter handling
    const dateFilter = document.getElementById('tanggal');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            document.getElementById('filterForm').submit();
        });
    }
    
    // Status filter handling
    const statusFilter = document.getElementById('status');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            document.getElementById('filterForm').submit();
        });
    }
});
