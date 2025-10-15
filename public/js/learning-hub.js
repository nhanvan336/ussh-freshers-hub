// ===================================
// Learning Hub JavaScript
// ===================================

let currentPage = 1;
let totalPages = 12;
let currentFilters = {
    search: '',
    type: '',
    subject: '',
    semester: '',
    sort: 'newest'
};

// Initialize Learning Hub
function initializeLearningHub() {
    setupSearch();
    setupFilters();
    setupUploadModal();
    setupDocumentActions();
    setupViewToggle();
    loadDocuments();
}

// ===================================
// Search Functionality
// ===================================
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentFilters.search = this.value;
            performSearch();
        }, 500));
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentFilters.search = searchInput.value;
    }
    
    currentPage = 1;
    loadDocuments();
    
    // Add to search history
    if (currentFilters.search) {
        addToSearchHistory(currentFilters.search);
    }
}

function addToSearchHistory(term) {
    let history = JSON.parse(localStorage.getItem('learningHubSearchHistory') || '[]');
    history = history.filter(item => item !== term);
    history.unshift(term);
    history = history.slice(0, 10); // Keep only 10 recent searches
    localStorage.setItem('learningHubSearchHistory', JSON.stringify(history));
}

// ===================================
// Filter Functionality
// ===================================
function setupFilters() {
    const filterElements = document.querySelectorAll('#typeFilter, #subjectFilter, #semesterFilter, #sortFilter');
    
    filterElements.forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    currentFilters.type = document.getElementById('typeFilter')?.value || '';
    currentFilters.subject = document.getElementById('subjectFilter')?.value || '';
    currentFilters.semester = document.getElementById('semesterFilter')?.value || '';
    currentFilters.sort = document.getElementById('sortFilter')?.value || 'newest';
    
    currentPage = 1;
    loadDocuments();
}

function resetFilters() {
    // Reset filter selects
    document.getElementById('typeFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('semesterFilter').value = '';
    document.getElementById('sortFilter').value = 'newest';
    document.getElementById('searchInput').value = '';
    
    // Reset filter object
    currentFilters = {
        search: '',
        type: '',
        subject: '',
        semester: '',
        sort: 'newest'
    };
    
    currentPage = 1;
    loadDocuments();
}

// ===================================
// Document Loading
// ===================================
async function loadDocuments() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const documentsGrid = document.getElementById('documentsGrid');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            ...currentFilters
        });
        
        const response = await fetch(`/api/learning-hub/documents?${queryParams}`);
        
        if (!response.ok) {
            throw new Error('Failed to load documents');
        }
        
        const data = await response.json();
        
        displayDocuments(data.documents);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification('Có lỗi xảy ra khi tải tài liệu', 'error');
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

function displayDocuments(documents) {
    const documentsGrid = document.getElementById('documentsGrid');
    
    if (!documentsGrid) return;
    
    if (documents.length === 0) {
        documentsGrid.innerHTML = `
            <div class="no-documents">
                <div class="no-documents-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>Không tìm thấy tài liệu</h3>
                <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                <button class="btn btn-outline" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    Xóa bộ lọc
                </button>
            </div>
        `;
        return;
    }
    
    documentsGrid.innerHTML = documents.map(doc => createDocumentCard(doc)).join('');
    
    // Setup document actions for new cards
    setupDocumentActions();
}

function createDocumentCard(doc) {
    const typeInfo = getDocumentTypeInfo(doc.type);
    const ratingStars = generateRatingStars(doc.rating);
    
    return `
        <div class="document-card" data-id="${doc._id}">
            <div class="document-type-badge ${doc.type}">
                <i class="${typeInfo.icon}"></i>
                ${typeInfo.label}
            </div>
            <div class="document-thumbnail">
                <img src="${doc.thumbnail || '/images/document-default.jpg'}" 
                     alt="${doc.title}" loading="lazy">
                ${doc.type === 'video' ? `<div class="video-duration">${formatDuration(doc.duration)}</div>` : ''}
            </div>
            <div class="document-content">
                <h3 class="document-title">
                    <a href="/learning-hub/document/${doc._id}">${doc.title}</a>
                </h3>
                <p class="document-description">${doc.description}</p>
                <div class="document-meta">
                    <span class="document-subject">${getSubjectName(doc.subject)}</span>
                    <span class="document-semester">Học kỳ ${doc.semester}</span>
                    <span class="document-size">${formatFileSize(doc.fileSize)}</span>
                </div>
                <div class="document-stats">
                    <div class="stat">
                        <i class="fas fa-${doc.type === 'video' ? 'play' : 'download'}"></i>
                        <span>${doc.downloadCount} ${doc.type === 'video' ? 'lượt xem' : 'lượt tải'}</span>
                    </div>
                    <div class="rating">
                        <div class="stars">${ratingStars}</div>
                        <span class="rating-score">${doc.rating.toFixed(1)}</span>
                    </div>
                </div>
                <div class="document-author">
                    <img src="${doc.author.avatar || '/images/default-avatar.png'}" 
                         alt="${doc.author.name}" class="author-avatar">
                    <div class="author-info">
                        <span class="author-name">${doc.author.name}</span>
                        <span class="upload-date">${formatTimeAgo(doc.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="document-actions">
                <button class="btn btn-primary" onclick="downloadDocument('${doc._id}')">
                    <i class="fas fa-${doc.type === 'video' ? 'play' : 'download'}"></i>
                    ${doc.type === 'video' ? 'Xem video' : 'Tải xuống'}
                </button>
                <button class="btn btn-outline" onclick="viewDocument('${doc._id}')">
                    <i class="fas fa-eye"></i>
                    Xem trước
                </button>
                <button class="btn-icon ${doc.isFavorited ? 'favorited' : ''}" 
                        onclick="toggleFavorite('${doc._id}')" 
                        title="${doc.isFavorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
}

function getDocumentTypeInfo(type) {
    const types = {
        document: { icon: 'fas fa-file-pdf', label: 'PDF' },
        video: { icon: 'fas fa-play', label: 'Video' },
        exam: { icon: 'fas fa-file-alt', label: 'Đề thi' },
        assignment: { icon: 'fas fa-tasks', label: 'Bài tập' },
        note: { icon: 'fas fa-sticky-note', label: 'Ghi chú' }
    };
    return types[type] || types.document;
}

function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function getSubjectName(subjectCode) {
    const subjects = {
        philosophy: 'Triết học',
        history: 'Lịch sử',
        literature: 'Văn học',
        linguistics: 'Ngôn ngữ học',
        psychology: 'Tâm lý học',
        sociology: 'Xã hội học',
        journalism: 'Báo chí',
        english: 'Tiếng Anh',
        computer: 'Tin học',
        math: 'Toán'
    };
    return subjects[subjectCode] || subjectCode;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    } else if (diffDays < 30) {
        return `${diffDays} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN');
    }
}

// ===================================
// Document Actions
// ===================================
function setupDocumentActions() {
    // Actions are handled by individual onclick events in the HTML
}

async function downloadDocument(documentId) {
    try {
        const response = await fetch(`/api/learning-hub/documents/${documentId}/download`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to download document');
        }
        
        const data = await response.json();
        
        if (data.downloadUrl) {
            // Create temporary link to trigger download
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('Tài liệu đang được tải xuống', 'success');
        }
        
    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification('Không thể tải xuống tài liệu', 'error');
    }
}

async function viewDocument(documentId) {
    try {
        const response = await fetch(`/api/learning-hub/documents/${documentId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load document');
        }
        
        const document = await response.json();
        
        showPreviewModal(document);
        
    } catch (error) {
        console.error('Error viewing document:', error);
        showNotification('Không thể xem trước tài liệu', 'error');
    }
}

async function toggleFavorite(documentId) {
    try {
        const response = await fetch(`/api/learning-hub/documents/${documentId}/favorite`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle favorite');
        }
        
        const data = await response.json();
        
        // Update UI
        const favoriteBtn = document.querySelector(`[onclick="toggleFavorite('${documentId}')"]`);
        if (favoriteBtn) {
            if (data.isFavorited) {
                favoriteBtn.classList.add('favorited');
                favoriteBtn.title = 'Bỏ yêu thích';
                showNotification('Đã thêm vào yêu thích', 'success');
            } else {
                favoriteBtn.classList.remove('favorited');
                favoriteBtn.title = 'Thêm vào yêu thích';
                showNotification('Đã bỏ khỏi yêu thích', 'info');
            }
        }
        
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Không thể cập nhật yêu thích', 'error');
    }
}

async function playVideo(videoId) {
    // Similar to viewDocument but specifically for videos
    viewDocument(videoId);
}

// ===================================
// View Toggle
// ===================================
function setupViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    const viewBtns = document.querySelectorAll('.view-btn');
    const documentsGrid = document.getElementById('documentsGrid');
    
    // Update active button
    viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update grid class
    if (documentsGrid) {
        documentsGrid.className = view === 'list' ? 'documents-list' : 'documents-grid';
    }
    
    // Save preference
    localStorage.setItem('learningHubView', view);
}

// ===================================
// Pagination
// ===================================
function updatePagination(pagination) {
    totalPages = pagination.totalPages;
    currentPage = pagination.currentPage;
    
    const paginationWrapper = document.querySelector('.pagination-wrapper');
    if (!paginationWrapper) return;
    
    const paginationHTML = generatePaginationHTML(pagination);
    paginationWrapper.innerHTML = paginationHTML;
}

function generatePaginationHTML(pagination) {
    const { currentPage, totalPages, hasPrev, hasNext } = pagination;
    let html = '<nav aria-label="Phân trang tài liệu"><ul class="pagination">';
    
    // Previous button
    html += `
        <li class="page-item ${!hasPrev ? 'disabled' : ''}">
            ${hasPrev ? 
                `<a class="page-link" href="#" onclick="loadPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Trước
                </a>` :
                `<span class="page-link">
                    <i class="fas fa-chevron-left"></i> Trước
                </span>`
            }
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPage(1)">1</a>
            </li>
        `;
        if (startPage > 2) {
            html += '<li class="page-item"><span class="page-link">...</span></li>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                ${i === currentPage ?
                    `<span class="page-link">${i}</span>` :
                    `<a class="page-link" href="#" onclick="loadPage(${i})">${i}</a>`
                }
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<li class="page-item"><span class="page-link">...</span></li>';
        }
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPage(${totalPages})">${totalPages}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${!hasNext ? 'disabled' : ''}">
            ${hasNext ? 
                `<a class="page-link" href="#" onclick="loadPage(${currentPage + 1})">
                    Sau <i class="fas fa-chevron-right"></i>
                </a>` :
                `<span class="page-link">
                    Sau <i class="fas fa-chevron-right"></i>
                </span>`
            }
        </li>
    `;
    
    html += '</ul></nav>';
    return html;
}

function loadPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    loadDocuments();
    
    // Scroll to top of documents section
    document.querySelector('.documents-section')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// ===================================
// Upload Modal
// ===================================
function setupUploadModal() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('documentFile');
    const fileUploadArea = document.querySelector('.file-upload-area');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    if (fileUploadArea) {
        setupDragAndDrop(fileUploadArea, fileInput);
    }
}

function setupDragAndDrop(uploadArea, fileInput) {
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelection({ target: fileInput });
        }
    });
}

function handleFileSelection(e) {
    const file = e.target.files[0];
    const selectedFileDiv = document.getElementById('selectedFile');
    
    if (!file) return;
    
    // Validate file
    const validationResult = validateFile(file);
    if (!validationResult.valid) {
        showNotification(validationResult.message, 'error');
        e.target.value = '';
        return;
    }
    
    // Show selected file
    if (selectedFileDiv) {
        selectedFileDiv.style.display = 'block';
        selectedFileDiv.innerHTML = `
            <div class="file-info">
                <i class="fas fa-${getFileIcon(file.type)}"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" onclick="clearFileSelection()" class="btn-icon">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    // Auto-fill title if empty
    const titleInput = document.getElementById('documentTitle');
    if (titleInput && !titleInput.value) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        titleInput.value = nameWithoutExt;
    }
}

function validateFile(file) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4',
        'video/avi',
        'video/quicktime'
    ];
    
    if (file.size > maxSize) {
        return {
            valid: false,
            message: 'Tệp tin quá lớn. Kích thước tối đa là 100MB.'
        };
    }
    
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            message: 'Loại tệp tin không được hỗ trợ.'
        };
    }
    
    return { valid: true };
}

function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'file-pdf';
    if (mimeType.includes('word')) return 'file-word';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
    if (mimeType.includes('video')) return 'file-video';
    return 'file';
}

function clearFileSelection() {
    const fileInput = document.getElementById('documentFile');
    const selectedFileDiv = document.getElementById('selectedFile');
    
    if (fileInput) fileInput.value = '';
    if (selectedFileDiv) selectedFileDiv.style.display = 'none';
}

async function handleFileUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = progressDiv?.querySelector('.progress-fill');
    const progressText = progressDiv?.querySelector('.progress-text');
    
    // Disable submit button and show progress
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải lên...';
    }
    
    if (progressDiv) {
        progressDiv.style.display = 'block';
    }
    
    try {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                if (progressFill) {
                    progressFill.style.width = percentComplete + '%';
                }
                if (progressText) {
                    progressText.textContent = `Đang tải lên... ${Math.round(percentComplete)}%`;
                }
            }
        });
        
        // Handle completion
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showNotification('Tài liệu đã được tải lên thành công!', 'success');
                closeUploadModal();
                loadDocuments(); // Refresh the documents list
            } else {
                throw new Error('Upload failed');
            }
        });
        
        xhr.addEventListener('error', function() {
            throw new Error('Upload failed');
        });
        
        xhr.open('POST', '/api/learning-hub/documents/upload');
        xhr.send(formData);
        
    } catch (error) {
        console.error('Error uploading file:', error);
        showNotification('Có lỗi xảy ra khi tải lên tài liệu', 'error');
    } finally {
        // Reset form state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Tải lên';
        }
        
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }
}

function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    const form = document.getElementById('uploadForm');
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (form) {
        form.reset();
        clearFileSelection();
    }
}

// ===================================
// Preview Modal
// ===================================
function showPreviewModal(document) {
    const modal = document.getElementById('previewModal');
    const title = document.getElementById('previewTitle');
    const content = document.getElementById('previewContent');
    
    if (!modal || !title || !content) return;
    
    title.textContent = document.title;
    
    // Generate preview content based on document type
    if (document.type === 'video') {
        content.innerHTML = `
            <div class="video-preview">
                <video controls width="100%" height="400">
                    <source src="${document.fileUrl}" type="video/mp4">
                    Trình duyệt không hỗ trợ video.
                </video>
            </div>
        `;
    } else if (document.type === 'document' && document.fileUrl.endsWith('.pdf')) {
        content.innerHTML = `
            <div class="pdf-preview">
                <iframe src="${document.fileUrl}" width="100%" height="600" frameborder="0">
                    <p>Trình duyệt không hỗ trợ xem PDF. 
                    <a href="${document.fileUrl}" target="_blank">Mở trong tab mới</a></p>
                </iframe>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="document-info">
                <h3>${document.title}</h3>
                <p>${document.description}</p>
                <div class="document-details">
                    <p><strong>Môn học:</strong> ${getSubjectName(document.subject)}</p>
                    <p><strong>Học kỳ:</strong> ${document.semester}</p>
                    <p><strong>Kích thước:</strong> ${formatFileSize(document.fileSize)}</p>
                    <p><strong>Tác giả:</strong> ${document.author.name}</p>
                </div>
                <div class="preview-actions">
                    <a href="${document.fileUrl}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i>
                        Mở trong tab mới
                    </a>
                </div>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ===================================
// Event Listeners
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('learning-hub')) {
        initializeLearningHub();
    }
});

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'uploadModal') {
            closeUploadModal();
        } else if (e.target.id === 'previewModal') {
            closePreviewModal();
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUploadModal();
        closePreviewModal();
    }
    
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
    }
});

// ===================================
// Utility Functions
// ===================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}