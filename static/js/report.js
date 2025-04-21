/**
 * Report item form functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    const reportForm = document.getElementById('reportForm');
    const itemImageInput = document.getElementById('item_image');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const submitButton = document.getElementById('submitButton');
    const statusLost = document.getElementById('statusLost');
    const statusFound = document.getElementById('statusFound');
    const dateInput = document.getElementById('date');
    
    // Set the maximum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('max', today);
    
    // Default date to today
    if (!dateInput.value) {
        dateInput.value = today;
    }
    
    // Handle image preview
    itemImageInput.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
            // Check file size (max 16MB)
            if (file.size > 16 * 1024 * 1024) {
                showError('Image file is too large. Maximum size is 16MB.', 'reportForm');
                this.value = ''; // Clear the file input
                imagePreviewContainer.classList.add('d-none');
                return;
            }
            
            // Check file type
            const fileType = file.type;
            if (!fileType.match('image.*')) {
                showError('Please select an image file (JPG, PNG, GIF).', 'reportForm');
                this.value = ''; // Clear the file input
                imagePreviewContainer.classList.add('d-none');
                return;
            }
            
            // Create image preview
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('d-none');
            };
            
            reader.readAsDataURL(file);
        } else {
            imagePreviewContainer.classList.add('d-none');
        }
    });
    
    // Update form labels based on selected status
    function updateFormLabels() {
        const statusLabel = statusLost.checked ? 'Lost' : 'Found';
        const locationLabel = statusLost.checked ? 'Where did you lose the item?' : 'Where did you find the item?';
        const dateLabel = statusLost.checked ? 'When did you lose the item?' : 'When did you find the item?';
        
        document.querySelector('label[for="location"]').textContent = locationLabel;
        document.querySelector('label[for="date"]').textContent = dateLabel;
        
        // Update submit button text
        submitButton.innerHTML = `<i class="fas fa-paper-plane me-2"></i>Report ${statusLabel} Item`;
    }
    
    // Update form when status changes
    statusLost.addEventListener('change', updateFormLabels);
    statusFound.addEventListener('change', updateFormLabels);
    
    // Initialize form labels
    updateFormLabels();
    
    // Form validation before submission
    reportForm.addEventListener('submit', function(e) {
        // Check if category is selected
        const categoryField = document.getElementById('category');
        if (categoryField.value === '') {
            e.preventDefault();
            showError('Please select a category for the item', 'reportForm');
            categoryField.focus();
            return false;
        }
        
        // Check if date is valid
        if (new Date(dateInput.value) > new Date()) {
            e.preventDefault();
            showError('The date cannot be in the future', 'reportForm');
            dateInput.focus();
            return false;
        }
        
        // Disable the submit button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    });
});
