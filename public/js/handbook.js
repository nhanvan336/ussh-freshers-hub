// Handbook Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Handbook page loaded');
    
    // Navigation and search functionality
    const handbookNavigation = {
        // Initialize sidebar navigation
        initSidebar: function() {
            const sidebar = document.querySelector('.handbook-sidebar');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            
            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('collapsed');
                    this.setAttribute('aria-expanded', 
                        sidebar.classList.contains('collapsed') ? 'false' : 'true'
                    );
                });
            }
            
            // Auto-collapse sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar?.classList.add('collapsed');
            }
        },
        
        // Section navigation
        sectionNavigation: function() {
            const navLinks = document.querySelectorAll('.handbook-nav a[href^="#"]');
            const sections = document.querySelectorAll('.handbook-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    
                    if (targetSection) {
                        // Update active nav item
                        navLinks.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Show target section
                        sections.forEach(s => s.classList.remove('active'));
                        targetSection.classList.add('active');
                        
                        // Smooth scroll to section
                        targetSection.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                        
                        // Update URL without page reload
                        history.pushState(null, null, `#${targetId}`);
                    }
                });
            });
            
            // Handle direct URL navigation
            this.handleDirectNavigation();
        },
        
        handleDirectNavigation: function() {
            const hash = window.location.hash;
            if (hash) {
                const targetSection = document.querySelector(hash);
                const targetLink = document.querySelector(`a[href="${hash}"]`);
                
                if (targetSection && targetLink) {
                    setTimeout(() => {
                        targetLink.click();
                    }, 100);
                }
            } else {
                // Show first section by default
                const firstLink = document.querySelector('.handbook-nav a');
                if (firstLink) {
                    firstLink.click();
                }
            }
        },
        
        init: function() {
            this.initSidebar();
            this.sectionNavigation();
        }
    };
    
    // Search functionality
    const handbookSearch = {
        searchData: [],
        
        // Initialize search
        initSearch: function() {
            this.buildSearchIndex();
            this.setupSearchInput();
        },
        
        buildSearchIndex: function() {
            const sections = document.querySelectorAll('.handbook-section');
            
            sections.forEach(section => {
                const title = section.querySelector('h2, h3')?.textContent || '';
                const content = section.textContent || '';
                const id = section.id || '';
                
                this.searchData.push({
                    id,
                    title,
                    content: content.toLowerCase(),
                    element: section
                });
            });
        },
        
        setupSearchInput: function() {
            const searchInput = document.querySelector('.handbook-search input');
            const searchResults = document.querySelector('.search-results');
            
            if (!searchInput) return;
            
            let searchTimeout;
            
            searchInput.addEventListener('input', function() {
                const query = this.value.trim();
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        handbookSearch.performSearch(query);
                    } else {
                        handbookSearch.clearSearchResults();
                    }
                }, 300);
            });
            
            // Clear search on escape
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    this.value = '';
                    handbookSearch.clearSearchResults();
                }
            });
        },
        
        performSearch: function(query) {
            const results = this.searchData.filter(item => 
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.content.includes(query.toLowerCase())
            );
            
            this.displaySearchResults(results, query);
        },
        
        displaySearchResults: function(results, query) {
            let searchResults = document.querySelector('.search-results');
            
            if (!searchResults) {
                searchResults = document.createElement('div');
                searchResults.className = 'search-results';
                document.querySelector('.handbook-search').appendChild(searchResults);
            }
            
            if (results.length === 0) {
                searchResults.innerHTML = `
                    <div class="no-results">
                        <p>Không tìm thấy kết quả cho "${query}"</p>
                    </div>
                `;
            } else {
                searchResults.innerHTML = `
                    <div class="results-header">
                        <h4>Tìm thấy ${results.length} kết quả cho "${query}"</h4>
                    </div>
                    <div class="results-list">
                        ${results.map(result => `
                            <div class="result-item" data-target="${result.id}">
                                <h5>${this.highlightText(result.title, query)}</h5>
                                <p>${this.getSearchSnippet(result.content, query)}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Add click handlers to results
                searchResults.querySelectorAll('.result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const targetId = this.dataset.target;
                        const targetLink = document.querySelector(`a[href="#${targetId}"]`);
                        if (targetLink) {
                            targetLink.click();
                            handbookSearch.clearSearchResults();
                            document.querySelector('.handbook-search input').value = '';
                        }
                    });
                });
            }
            
            searchResults.style.display = 'block';
        },
        
        highlightText: function(text, query) {
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        },
        
        getSearchSnippet: function(content, query) {
            const index = content.toLowerCase().indexOf(query.toLowerCase());
            if (index === -1) return content.substring(0, 150) + '...';
            
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + query.length + 100);
            const snippet = content.substring(start, end);
            
            return (start > 0 ? '...' : '') + 
                   this.highlightText(snippet, query) + 
                   (end < content.length ? '...' : '');
        },
        
        clearSearchResults: function() {
            const searchResults = document.querySelector('.search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
        },
        
        init: function() {
            this.initSearch();
        }
    };
    
    // Content features
    const contentFeatures = {
        // Table of contents generation
        generateTOC: function() {
            const tocContainer = document.querySelector('.table-of-contents');
            if (!tocContainer) return;
            
            const sections = document.querySelectorAll('.handbook-section');
            const tocItems = [];
            
            sections.forEach((section, index) => {
                const heading = section.querySelector('h2, h3');
                if (heading && section.id) {
                    tocItems.push({
                        id: section.id,
                        title: heading.textContent,
                        level: heading.tagName.toLowerCase()
                    });
                }
            });
            
            if (tocItems.length > 0) {
                tocContainer.innerHTML = `
                    <h3>Mục lục</h3>
                    <ul class="toc-list">
                        ${tocItems.map(item => `
                            <li class="toc-item toc-${item.level}">
                                <a href="#${item.id}">${item.title}</a>
                            </li>
                        `).join('')}
                    </ul>
                `;
            }
        },
        
        // Copy code blocks
        setupCodeCopy: function() {
            const codeBlocks = document.querySelectorAll('pre code');
            
            codeBlocks.forEach(block => {
                const pre = block.parentElement;
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '📋 Copy';
                copyBtn.setAttribute('aria-label', 'Copy code');
                
                copyBtn.addEventListener('click', function() {
                    navigator.clipboard.writeText(block.textContent).then(() => {
                        this.innerHTML = '✅ Copied!';
                        setTimeout(() => {
                            this.innerHTML = '📋 Copy';
                        }, 2000);
                    }).catch(() => {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = block.textContent;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        this.innerHTML = '✅ Copied!';
                        setTimeout(() => {
                            this.innerHTML = '📋 Copy';
                        }, 2000);
                    });
                });
                
                pre.style.position = 'relative';
                pre.appendChild(copyBtn);
            });
        },
        
        // Collapsible sections
        setupCollapsibleSections: function() {
            const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
            
            collapsibleHeaders.forEach(header => {
                header.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const isExpanded = this.classList.contains('expanded');
                    
                    this.classList.toggle('expanded');
                    content.classList.toggle('expanded');
                    
                    // Update aria-expanded
                    this.setAttribute('aria-expanded', !isExpanded);
                });
            });
        },
        
        // Print functionality
        setupPrint: function() {
            const printBtn = document.querySelector('.print-handbook-btn');
            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    window.print();
                });
            }
        },
        
        // Progress tracking for reading
        trackReadingProgress: function() {
            const sections = document.querySelectorAll('.handbook-section');
            const progressBar = document.querySelector('.reading-progress');
            
            if (!progressBar || sections.length === 0) return;
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const sectionId = entry.target.id;
                        this.markSectionAsRead(sectionId);
                        this.updateProgressBar();
                    }
                });
            }, {
                threshold: 0.5
            });
            
            sections.forEach(section => {
                if (section.id) {
                    observer.observe(section);
                }
            });
        },
        
        markSectionAsRead: function(sectionId) {
            let readSections = JSON.parse(localStorage.getItem('handbookProgress') || '[]');
            if (!readSections.includes(sectionId)) {
                readSections.push(sectionId);
                localStorage.setItem('handbookProgress', JSON.stringify(readSections));
            }
        },
        
        updateProgressBar: function() {
            const progressBar = document.querySelector('.reading-progress');
            const sections = document.querySelectorAll('.handbook-section[id]');
            const readSections = JSON.parse(localStorage.getItem('handbookProgress') || '[]');
            
            const progress = (readSections.length / sections.length) * 100;
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
                
                // Update progress text
                const progressText = document.querySelector('.progress-text');
                if (progressText) {
                    progressText.textContent = `${readSections.length}/${sections.length} phần đã đọc`;
                }
            }
        },
        
        init: function() {
            this.generateTOC();
            this.setupCodeCopy();
            this.setupCollapsibleSections();
            this.setupPrint();
            this.trackReadingProgress();
            this.updateProgressBar(); // Initial update
        }
    };
    
    // Bookmark functionality
    const bookmarks = {
        // Add/remove bookmarks
        toggleBookmark: function(sectionId, title) {
            let bookmarks = JSON.parse(localStorage.getItem('handbookBookmarks') || '[]');
            const existingIndex = bookmarks.findIndex(b => b.id === sectionId);
            
            if (existingIndex > -1) {
                bookmarks.splice(existingIndex, 1);
                this.showMessage('Đã xóa bookmark');
            } else {
                bookmarks.push({
                    id: sectionId,
                    title,
                    timestamp: new Date().toISOString()
                });
                this.showMessage('Đã thêm bookmark');
            }
            
            localStorage.setItem('handbookBookmarks', JSON.stringify(bookmarks));
            this.updateBookmarkButtons();
            this.displayBookmarks();
        },
        
        setupBookmarkButtons: function() {
            const sections = document.querySelectorAll('.handbook-section[id]');
            
            sections.forEach(section => {
                const heading = section.querySelector('h2, h3');
                if (heading) {
                    const bookmarkBtn = document.createElement('button');
                    bookmarkBtn.className = 'bookmark-btn';
                    bookmarkBtn.innerHTML = '🔖';
                    bookmarkBtn.setAttribute('aria-label', 'Bookmark section');
                    
                    bookmarkBtn.addEventListener('click', () => {
                        this.toggleBookmark(section.id, heading.textContent);
                    });
                    
                    heading.appendChild(bookmarkBtn);
                }
            });
            
            this.updateBookmarkButtons();
        },
        
        updateBookmarkButtons: function() {
            const bookmarks = JSON.parse(localStorage.getItem('handbookBookmarks') || '[]');
            const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
            
            bookmarkBtns.forEach(btn => {
                const section = btn.closest('.handbook-section');
                const isBookmarked = bookmarks.some(b => b.id === section?.id);
                
                btn.classList.toggle('bookmarked', isBookmarked);
                btn.innerHTML = isBookmarked ? '🔖' : '🔖';
                btn.style.opacity = isBookmarked ? '1' : '0.5';
            });
        },
        
        displayBookmarks: function() {
            const bookmarksContainer = document.querySelector('.bookmarks-list');
            if (!bookmarksContainer) return;
            
            const bookmarks = JSON.parse(localStorage.getItem('handbookBookmarks') || '[]');
            
            if (bookmarks.length === 0) {
                bookmarksContainer.innerHTML = '<p class="no-bookmarks">Chưa có bookmark nào</p>';
                return;
            }
            
            bookmarksContainer.innerHTML = `
                <h4>Bookmarks (${bookmarks.length})</h4>
                <div class="bookmark-items">
                    ${bookmarks.map(bookmark => `
                        <div class="bookmark-item">
                            <a href="#${bookmark.id}" class="bookmark-link">
                                <span class="bookmark-title">${bookmark.title}</span>
                                <small class="bookmark-date">
                                    ${new Date(bookmark.timestamp).toLocaleDateString('vi-VN')}
                                </small>
                            </a>
                            <button class="remove-bookmark" data-id="${bookmark.id}">×</button>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add event listeners
            bookmarksContainer.querySelectorAll('.bookmark-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetLink = document.querySelector(`a[href="#${targetId}"]`);
                    if (targetLink) {
                        targetLink.click();
                    }
                });
            });
            
            bookmarksContainer.querySelectorAll('.remove-bookmark').forEach(btn => {
                btn.addEventListener('click', function() {
                    const sectionId = this.dataset.id;
                    const section = document.getElementById(sectionId);
                    const title = section?.querySelector('h2, h3')?.textContent || '';
                    bookmarks.toggleBookmark(sectionId, title);
                });
            });
        },
        
        showMessage: function(message) {
            const toast = document.createElement('div');
            toast.className = 'bookmark-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--primary-brown);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideUp 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 2000);
        },
        
        init: function() {
            this.setupBookmarkButtons();
            this.displayBookmarks();
        }
    };
    
    // Initialize all handbook features
    handbookNavigation.init();
    handbookSearch.init();
    contentFeatures.init();
    bookmarks.init();
    
    // Add custom CSS for handbook features
    const style = document.createElement('style');
    style.textContent = `
        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
            z-index: 100;
            display: none;
        }
        
        .result-item {
            padding: 15px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .result-item:hover {
            background: #f8f9fa;
        }
        
        .result-item h5 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: var(--primary-brown);
        }
        
        .result-item p {
            margin: 0;
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }
        
        .result-item mark {
            background: #fff3cd;
            padding: 1px 2px;
            border-radius: 2px;
        }
        
        .copy-code-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .copy-code-btn:hover {
            background: rgba(0,0,0,0.9);
        }
        
        .bookmark-btn {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            margin-left: 10px;
            transition: transform 0.2s;
        }
        
        .bookmark-btn:hover {
            transform: scale(1.2);
        }
        
        .reading-progress {
            height: 4px;
            background: var(--primary-brown);
            transition: width 0.3s ease;
            border-radius: 2px;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .collapsible-header {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .collapsible-header::before {
            content: '▶';
            transition: transform 0.2s;
        }
        
        .collapsible-header.expanded::before {
            transform: rotate(90deg);
        }
        
        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .collapsible-content.expanded {
            max-height: 1000px;
        }
    `;
    document.head.appendChild(style);
});