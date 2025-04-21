/**
 * Search functionality for the Lost and Found system
 */

document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchQuery = document.getElementById('searchQuery');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const fromDate = document.getElementById('fromDate');
    const toDate = document.getElementById('toDate');
    const resultsList = document.getElementById('resultsList');
    const noResults = document.getElementById('noResults');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultCount = document.getElementById('resultCount');
    const searchSpinner = document.getElementById('searchSpinner');
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const resultItemTemplate = document.getElementById('resultItemTemplate');

    // Get URL parameters and fill search form if they exist
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('query')) searchQuery.value = urlParams.get('query');
    if (urlParams.has('status')) statusFilter.value = urlParams.get('status');
    if (urlParams.has('category')) categoryFilter.value = urlParams.get('category');
    if (urlParams.has('from_date')) fromDate.value = urlParams.get('from_date');
    if (urlParams.has('to_date')) toDate.value = urlParams.get('to_date');

    // If any filter is set, show the filters and filter toggle button
    if (statusFilter.value || categoryFilter.value || fromDate.value || toDate.value) {
        new bootstrap.Collapse(document.getElementById('advancedFilters')).show();
        updateFilterToggleButton(true);
    }

    // Toggle filter button text
    filterToggleBtn.addEventListener('click', function() {
        const isCollapsed = this.getAttribute('aria-expanded') === 'false';
        updateFilterToggleButton(isCollapsed);
    });

    // Update filter toggle button text and icon
    function updateFilterToggleButton(isExpanded) {
        const textSpan = filterToggleBtn.querySelector('span');
        const icon = filterToggleBtn.querySelector('i');
        
        if (isExpanded) {
            textSpan.textContent = 'Hide Filters';
            icon.classList.remove('fa-filter');
            icon.classList.add('fa-chevron-up');
            clearFiltersBtn.classList.remove('d-none');
        } else {
            textSpan.textContent = 'Show Filters';
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-filter');
            
            // Only hide clear button if no filters are active
            if (!statusFilter.value && !categoryFilter.value && !fromDate.value && !toDate.value) {
                clearFiltersBtn.classList.add('d-none');
            }
        }
    }

    // Clear all filters
    clearFiltersBtn.addEventListener('click', function() {
        statusFilter.value = '';
        categoryFilter.value = '';
        fromDate.value = '';
        toDate.value = '';
        
        this.classList.add('d-none');
        performSearch();
    });

    // Handle form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch();
    });

    // Search when filters change
    statusFilter.addEventListener('change', performSearch);
    categoryFilter.addEventListener('change', performSearch);
    
    // Debounce the date inputs to avoid too many requests
    fromDate.addEventListener('change', performSearch);
    toDate.addEventListener('change', performSearch);

    // Perform search when the page loads if any search params exist
    if (urlParams.toString()) {
        performSearch();
    }

    /**
     * Perform the search and display results
     */
    function performSearch() {
        // Update URL with current search parameters
        const searchParams = new URLSearchParams();
        if (searchQuery.value) searchParams.set('query', searchQuery.value);
        if (statusFilter.value) searchParams.set('status', statusFilter.value);
        if (categoryFilter.value) searchParams.set('category', categoryFilter.value);
        if (fromDate.value) searchParams.set('from_date', fromDate.value);
        if (toDate.value) searchParams.set('to_date', toDate.value);
        
        // Update browser history without reloading the page
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        // Show spinner and hide previous results
        searchSpinner.classList.remove('d-none');
        noResults.classList.add('d-none');
        resultsContainer.classList.add('d-none');
        
        // Build fetch URL
        const apiUrl = `/api/search?${searchParams.toString()}`;
        
        // Fetch results
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide spinner
                searchSpinner.classList.add('d-none');
                
                // Clear previous results
                resultsList.innerHTML = '';
                
                if (data.success && data.results.length > 0) {
                    // Display results
                    data.results.forEach(item => {
                        const resultItem = resultItemTemplate.content.cloneNode(true);
                        const link = resultItem.querySelector('a');
                        
                        link.href = `/item/${item.id}`;
                        
                        // Set item details
                        resultItem.querySelector('.item-name').textContent = item.name;
                        resultItem.querySelector('.item-description').textContent = item.description;
                        resultItem.querySelector('.item-location').textContent = item.location;
                        resultItem.querySelector('.item-date').textContent = formatDate(item.date);
                        resultItem.querySelector('.item-category').textContent = item.category;
                        resultItem.querySelector('.item-time').textContent = `Reported on ${item.created_at}`;
                        
                        // Set status badge
                        const statusBadge = resultItem.querySelector('.item-status');
                        statusBadge.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
                        statusBadge.className = `${getStatusBadgeClass(item.status)}`;
                        
                        // Handle image
                        const imageElement = resultItem.querySelector('.item-image');
                        const noImageDiv = resultItem.querySelector('.item-no-image');
                        
                        if (item.image) {
                            imageElement.src = `/uploads/${item.image}`;
                            imageElement.alt = item.name;
                            noImageDiv.classList.add('d-none');
                            imageElement.classList.remove('d-none');
                        } else {
                            imageElement.classList.add('d-none');
                            noImageDiv.classList.remove('d-none');
                        }
                        
                        resultsList.appendChild(resultItem);
                    });
                    
                    // Show results container and update count
                    resultsContainer.classList.remove('d-none');
                    resultCount.textContent = `${data.results.length} item${data.results.length !== 1 ? 's' : ''}`;
                } else {
                    // Show no results message
                    noResults.classList.remove('d-none');
                    noResults.textContent = 'No items found matching your search criteria.';
                    resultCount.textContent = '0 items';
                }
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
                searchSpinner.classList.add('d-none');
                noResults.classList.remove('d-none');
                noResults.textContent = 'An error occurred while searching. Please try again.';
                showError('Error fetching search results. Please try again later.');
            });
    }
});
