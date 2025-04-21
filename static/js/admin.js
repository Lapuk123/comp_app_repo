/**
 * Admin functionality for JRU Lost and Found System
 * Handles item and user management operations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements for item management
    const itemsTable = document.getElementById('itemsTable');
    const editItemModal = document.getElementById('editItemModal');
    const deleteItemModal = document.getElementById('deleteItemModal');
    const editItemForm = document.getElementById('editItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const filterStatus = document.getElementById('filterStatus');
    const filterCategory = document.getElementById('filterCategory');
    const searchItems = document.getElementById('searchItems');
    const clearFilters = document.getElementById('clearFilters');
    
    // Elements for user management
    const usersTable = document.getElementById('usersTable');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    const filterUserType = document.getElementById('filterUserType');
    const filterUserStatus = document.getElementById('filterUserStatus');
    const searchUsers = document.getElementById('searchUsers');
    const clearUserFilters = document.getElementById('clearUserFilters');
    
    // Initialize edit item functionality
    if (itemsTable) {
        // Handle item edit button clicks
        document.querySelectorAll('.edit-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                fetchItemDetails(itemId);
            });
        });
        
        // Handle item delete button clicks
        document.querySelectorAll('.delete-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                const itemName = this.getAttribute('data-item-name');
                
                document.getElementById('deleteItemName').textContent = itemName;
                confirmDeleteBtn.setAttribute('data-item-id', itemId);
                
                const modal = new bootstrap.Modal(deleteItemModal);
                modal.show();
            });
        });
        
        // Handle save item button click
        if (saveItemBtn) {
            saveItemBtn.addEventListener('click', function() {
                saveItemChanges();
            });
        }
        
        // Handle confirm delete button click
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item-id');
                deleteItem(itemId);
            });
        }
        
        // Handle item filters
        if (filterStatus) {
            filterStatus.addEventListener('change', filterItems);
        }
        
        if (filterCategory) {
            filterCategory.addEventListener('change', filterItems);
        }
        
        if (searchItems) {
            searchItems.addEventListener('input', debounce(filterItems, 300));
        }
        
        if (clearFilters) {
            clearFilters.addEventListener('click', function() {
                filterStatus.value = '';
                filterCategory.value = '';
                searchItems.value = '';
                filterItems();
            });
        }
    }
    
    // Initialize user management functionality
    if (usersTable) {
        // Handle user edit button clicks
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                fetchUserDetails(userId);
            });
        });
        
        // Handle user delete button clicks
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const userName = this.getAttribute('data-user-name');
                
                document.getElementById('deleteUserName').textContent = userName;
                confirmDeleteUserBtn.setAttribute('data-user-id', userId);
                
                const modal = new bootstrap.Modal(deleteUserModal);
                modal.show();
            });
        });
        
        // Handle save user button click
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', function() {
                saveUserChanges();
            });
        }
        
        // Handle confirm delete user button click
        if (confirmDeleteUserBtn) {
            confirmDeleteUserBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                deleteUser(userId);
            });
        }
        
        // Handle user filters
        if (filterUserType) {
            filterUserType.addEventListener('change', filterUsers);
        }
        
        if (filterUserStatus) {
            filterUserStatus.addEventListener('change', filterUsers);
        }
        
        if (searchUsers) {
            searchUsers.addEventListener('input', debounce(filterUsers, 300));
        }
        
        if (clearUserFilters) {
            clearUserFilters.addEventListener('click', function() {
                filterUserType.value = '';
                filterUserStatus.value = '';
                searchUsers.value = '';
                filterUsers();
            });
        }
    }
    
    // Automatically show edit modal if URL has edit parameter
    if (itemsTable) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('edit')) {
            const itemId = urlParams.get('edit');
            fetchItemDetails(itemId);
        }
    }
    
    /**
     * Fetch item details for editing
     * @param {string} itemId - The ID of the item to edit
     */
    function fetchItemDetails(itemId) {
        // Get item details from the table row
        const itemRow = document.querySelector(`tr[data-item-id="${itemId}"]`);
        if (!itemRow) return;
        
        const cells = itemRow.querySelectorAll('td');
        
        // Populate the edit form
        document.getElementById('editItemId').value = itemId;
        document.getElementById('editItemName').value = cells[1].textContent;
        document.getElementById('editItemStatus').value = itemRow.getAttribute('data-item-status');
        
        // Find the category ID by name
        const categoryName = itemRow.getAttribute('data-item-category');
        const categorySelect = document.getElementById('editItemCategory');
        
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].textContent === categoryName) {
                categorySelect.selectedIndex = i;
                break;
            }
        }
        
        document.getElementById('editItemLocation').value = cells[4].textContent;
        document.getElementById('editItemDate').value = cells[5].textContent;
        
        // Fetch additional details via AJAX
        fetch(`/item/${itemId}`)
            .then(response => response.text())
            .then(html => {
                // Create a temporary element to parse the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Extract item description and contact info
                const description = tempDiv.querySelector('.text-muted + p').textContent;
                document.getElementById('editItemDescription').value = description;
                
                // Extract contact info if available
                const contactInfoElement = tempDiv.querySelector('h5.text-muted:contains("Contact") + p');
                if (contactInfoElement) {
                    document.getElementById('editItemContact').value = contactInfoElement.textContent.replace('📞 ', '');
                }
                
                // Check if image exists
                const imgElement = tempDiv.querySelector('.col-md-4 img');
                if (imgElement && imgElement.src) {
                    document.getElementById('currentItemImage').src = imgElement.src;
                    document.getElementById('currentItemImage').classList.remove('d-none');
                    document.getElementById('noImageText').classList.add('d-none');
                } else {
                    document.getElementById('currentItemImage').classList.add('d-none');
                    document.getElementById('noImageText').classList.remove('d-none');
                }
                
                // Show the modal
                const modal = new bootstrap.Modal(editItemModal);
                modal.show();
            })
            .catch(error => {
                console.error('Error fetching item details:', error);
                showError('Failed to load item details. Please try again.');
            });
    }
    
    /**
     * Save changes to an item
     */
    function saveItemChanges() {
        const itemId = document.getElementById('editItemId').value;
        const formData = new FormData(editItemForm);
        
        // Disable save button and show loading state
        saveItemBtn.disabled = true;
        saveItemBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        fetch(`/api/item/update/${itemId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal and reload page to show updated data
                bootstrap.Modal.getInstance(editItemModal).hide();
                showSuccessAlert(data.message);
                
                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(data.message || 'An error occurred while saving changes');
            }
        })
        .catch(error => {
            console.error('Error saving item changes:', error);
            showErrorAlert(error.message || 'Failed to save changes. Please try again.');
            
            // Reset save button
            saveItemBtn.disabled = false;
            saveItemBtn.innerHTML = 'Save Changes';
        });
    }
    
    /**
     * Delete an item
     * @param {string} itemId - The ID of the item to delete
     */
    function deleteItem(itemId) {
        // Disable delete button and show loading state
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
        
        fetch(`/api/item/delete/${itemId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal and remove the row from the table
                bootstrap.Modal.getInstance(deleteItemModal).hide();
                
                // Show success message and remove the row
                showSuccessAlert(data.message);
                
                const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
                if (row) {
                    row.remove();
                }
                
                // If no items left, show no items message
                if (itemsTable.querySelector('tbody').children.length === 0) {
                    const noItemsRow = document.createElement('tr');
                    noItemsRow.innerHTML = `
                        <td colspan="8" class="text-center">
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>No items found.
                            </div>
                        </td>
                    `;
                    itemsTable.querySelector('tbody').appendChild(noItemsRow);
                }
            } else {
                throw new Error(data.message || 'An error occurred while deleting the item');
            }
        })
        .catch(error => {
            console.error('Error deleting item:', error);
            showErrorAlert(error.message || 'Failed to delete item. Please try again.');
            
            // Reset delete button
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Delete Item';
        });
    }
    
    /**
     * Filter items based on selected criteria
     */
    function filterItems() {
        const status = filterStatus.value.toLowerCase();
        const category = filterCategory.value;
        const query = searchItems.value.toLowerCase();
        
        // Get all rows and filter them
        const rows = itemsTable.querySelectorAll('tbody tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            // Skip the "no items" row if it exists
            if (row.querySelector('.alert')) {
                row.style.display = 'none';
                return;
            }
            
            const rowStatus = row.getAttribute('data-item-status');
            const rowCategory = row.getAttribute('data-item-category');
            const itemName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            
            let shouldShow = true;
            
            // Apply status filter
            if (status && rowStatus !== status) {
                shouldShow = false;
            }
            
            // Apply category filter
            if (category && rowCategory !== category) {
                shouldShow = false;
            }
            
            // Apply search query
            if (query && !itemName.includes(query)) {
                shouldShow = false;
            }
            
            // Show or hide the row
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show "no items" message if no visible rows
        if (visibleCount === 0) {
            // Remove existing "no items" row if it exists
            const existingNoItems = itemsTable.querySelector('tbody .alert');
            if (existingNoItems) {
                existingNoItems.closest('tr').style.display = '';
            } else {
                const noItemsRow = document.createElement('tr');
                noItemsRow.innerHTML = `
                    <td colspan="8" class="text-center">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>No items match your filter criteria.
                        </div>
                    </td>
                `;
                itemsTable.querySelector('tbody').appendChild(noItemsRow);
            }
        }
    }
    
    /**
     * Fetch user details for editing
     * @param {string} userId - The ID of the user to edit
     */
    function fetchUserDetails(userId) {
        // Get user details from the table row
        const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (!userRow) return;
        
        const cells = userRow.querySelectorAll('td');
        
        // Populate the edit form
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserName').value = cells[1].textContent;
        document.getElementById('editUserEmail').value = cells[2].textContent;
        document.getElementById('editUserType').value = userRow.getAttribute('data-user-type');
        document.getElementById('editUserActive').checked = userRow.getAttribute('data-user-active') === 'True';
        document.getElementById('editUserPassword').value = '';
        
        // Show the modal
        const modal = new bootstrap.Modal(editUserModal);
        modal.show();
    }
    
    /**
     * Save changes to a user
     */
    function saveUserChanges() {
        const userId = document.getElementById('editUserId').value;
        const formData = new FormData(editUserForm);
        
        // Handle checkbox value
        formData.set('is_active', document.getElementById('editUserActive').checked ? 'true' : 'false');
        
        // Disable save button and show loading state
        saveUserBtn.disabled = true;
        saveUserBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        fetch(`/api/user/update/${userId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal and reload page to show updated data
                bootstrap.Modal.getInstance(editUserModal).hide();
                showSuccessAlert(data.message);
                
                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(data.message || 'An error occurred while saving changes');
            }
        })
        .catch(error => {
            console.error('Error saving user changes:', error);
            showErrorAlert(error.message || 'Failed to save changes. Please try again.');
            
            // Reset save button
            saveUserBtn.disabled = false;
            saveUserBtn.innerHTML = 'Save Changes';
        });
    }
    
    /**
     * Delete a user
     * @param {string} userId - The ID of the user to delete
     */
    function deleteUser(userId) {
        // Disable delete button and show loading state
        confirmDeleteUserBtn.disabled = true;
        confirmDeleteUserBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
        
        fetch(`/api/user/delete/${userId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal and remove the row from the table
                bootstrap.Modal.getInstance(deleteUserModal).hide();
                
                // Show success message and remove the row
                showSuccessAlert(data.message);
                
                const row = document.querySelector(`tr[data-user-id="${userId}"]`);
                if (row) {
                    row.remove();
                }
                
                // If no users left, show no users message
                if (usersTable.querySelector('tbody').children.length === 0) {
                    const noUsersRow = document.createElement('tr');
                    noUsersRow.innerHTML = `
                        <td colspan="7" class="text-center">
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>No users found.
                            </div>
                        </td>
                    `;
                    usersTable.querySelector('tbody').appendChild(noUsersRow);
                }
            } else {
                throw new Error(data.message || 'An error occurred while deleting the user');
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            showErrorAlert(error.message || 'Failed to delete user. Please try again.');
            
            // Reset delete button
            confirmDeleteUserBtn.disabled = false;
            confirmDeleteUserBtn.innerHTML = 'Delete User';
        });
    }
    
    /**
     * Filter users based on selected criteria
     */
    function filterUsers() {
        const userType = filterUserType.value;
        const isActive = filterUserStatus.value;
        const query = searchUsers.value.toLowerCase();
        
        // Get all rows and filter them
        const rows = usersTable.querySelectorAll('tbody tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            // Skip the "no users" row if it exists
            if (row.querySelector('.alert')) {
                row.style.display = 'none';
                return;
            }
            
            const rowUserType = row.getAttribute('data-user-type');
            const rowIsActive = row.getAttribute('data-user-active') === 'True';
            const userName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const userEmail = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            
            let shouldShow = true;
            
            // Apply user type filter
            if (userType && rowUserType !== userType) {
                shouldShow = false;
            }
            
            // Apply active status filter
            if (isActive === 'active' && !rowIsActive) {
                shouldShow = false;
            } else if (isActive === 'inactive' && rowIsActive) {
                shouldShow = false;
            }
            
            // Apply search query
            if (query && !userName.includes(query) && !userEmail.includes(query)) {
                shouldShow = false;
            }
            
            // Show or hide the row
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show "no users" message if no visible rows
        if (visibleCount === 0) {
            // Remove existing "no users" row if it exists
            const existingNoUsers = usersTable.querySelector('tbody .alert');
            if (existingNoUsers) {
                existingNoUsers.closest('tr').style.display = '';
            } else {
                const noUsersRow = document.createElement('tr');
                noUsersRow.innerHTML = `
                    <td colspan="7" class="text-center">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>No users match your filter criteria.
                        </div>
                    </td>
                `;
                usersTable.querySelector('tbody').appendChild(noUsersRow);
            }
        }
    }
    
    /**
     * Show a success alert message
     * @param {string} message - The success message to display
     */
    function showSuccessAlert(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert at the top of the card body
        const cardBody = document.querySelector('.card-body');
        cardBody.insertBefore(alertDiv, cardBody.firstChild);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 3000);
    }
    
    /**
     * Show an error alert message
     * @param {string} message - The error message to display
     */
    function showErrorAlert(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert at the top of the modal body
        if (editItemModal.classList.contains('show')) {
            editItemModal.querySelector('.modal-body').insertBefore(alertDiv, editItemModal.querySelector('.modal-body').firstChild);
        } else if (editUserModal.classList.contains('show')) {
            editUserModal.querySelector('.modal-body').insertBefore(alertDiv, editUserModal.querySelector('.modal-body').firstChild);
        } else {
            const cardBody = document.querySelector('.card-body');
            cardBody.insertBefore(alertDiv, cardBody.firstChild);
        }
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }
});

// Utility function: querySelector with :contains (for text content search)
// Used for finding elements containing specific text
Element.prototype.querySelector = function(query) {
    if (query.includes(':contains(') && query.includes(')')) {
        const parts = query.split(':contains(');
        const selector = parts[0];
        const text = parts[1].slice(0, -1);
        
        const elements = this.querySelectorAll(selector);
        for (const element of elements) {
            if (element.textContent.includes(text)) {
                return element;
            }
        }
        return null;
    }
    
    return Document.prototype.querySelector.call(this, query);
};
