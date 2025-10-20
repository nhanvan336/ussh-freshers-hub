// ===================================
// USSH Freshers' Hub - Main JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // --- [BỔ SUNG] KẾT NỐI NÚT BẤM "BẮT ĐẦU TRÒ CHUYỆN" TRÊN TRANG CHỦ ---
    const startChatButton = document.getElementById('start-chat-btn');
    if (startChatButton) {
        startChatButton.addEventListener('click', () => {
            // Kiểm tra xem chatbot UI chuyên nghiệp (từ file chatbot-ui.js) đã sẵn sàng chưa
            if (window.chatbotUI && typeof window.chatbotUI.openChatbot === 'function') {
                window.chatbotUI.openChatbot(); // Gọi hàm để mở chatbot mới
            } else {
                console.error('Chatbot UI is not available or not initialized yet.');
                alert('Chức năng chatbot đang được tải, vui lòng thử lại sau giây lát.');
            }
        });
    }

    // Initialize các module khác (đã loại bỏ initializeChatbot() cũ)
    initializeNavigation();
    initializeScrollEffects();
    initializeFormHandlers();
    initializeAnimations();
    initializeAccessibility();
    
    // Khởi tạo Socket.io
    setTimeout(initializeSocket, 1000);
});

// ===================================
// Navigation Module
// ===================================
function initializeNavigation() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    if (mobileToggle && navbarMenu) {
        mobileToggle.addEventListener('click', function() {
            const isOpen = navbarMenu.style.display === 'flex';
            navbarMenu.style.display = isOpen ? 'none' : 'flex';
            mobileToggle.setAttribute('aria-expanded', !isOpen);
            
            // Animate hamburger lines
            const lines = mobileToggle.querySelectorAll('.hamburger-line');
            lines.forEach((line, index) => {
                if (!isOpen) {
                    if (index === 0) line.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) line.style.opacity = '0';
                    if (index === 2) line.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    line.style.transform = 'none';
                    line.style.opacity = '1';
                }
            });
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navbarMenu && !e.target.closest('.navbar') && window.innerWidth <= 768) {
            navbarMenu.style.display = 'none';
            mobileToggle.setAttribute('aria-expanded', 'false');
            
            // Reset hamburger animation
            const lines = mobileToggle.querySelectorAll('.hamburger-line');
            lines.forEach(line => {
                line.style.transform = 'none';
                line.style.opacity = '1';
            });
        }
    });
    
    // Smooth scroll for anchor links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Active nav highlight based on scroll position
    window.addEventListener('scroll', throttle(updateActiveNavigation, 100));
}

function updateActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    let currentSection = '';
    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= 100 && sectionTop > -section.offsetHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// ===================================
// Chatbot Module (ĐÃ ĐƯỢC GỠ BỎ)
// Toàn bộ hàm initializeChatbot() và các hàm con của nó đã được xóa
// để tránh xung đột với file chatbot-ui.js
// ===================================

// Global function for external calls from old HTML structure (like home.ejs)
// This is now handled by the new event listener at the top of the file.
// The `window.toggleChatbot` can be safely removed if no other part of the site uses it.
window.toggleChatbot = function() {
    console.warn('toggleChatbot() is deprecated. Use window.chatbotUI.openChatbot() instead.');
    if (window.chatbotUI && typeof window.chatbotUI.openChatbot === 'function') {
        window.chatbotUI.openChatbot();
    }
};


// ===================================
// Scroll Effects Module
// ===================================
function initializeScrollEffects() {
    const backToTopBtn = document.querySelector('.back-to-top');
    const header = document.querySelector('.header');
    
    // Back to top button
    if (backToTopBtn) {
        window.addEventListener('scroll', throttle(() => {
            if (window.scrollY > 300) {
                backToTopBtn.style.display = 'block';
                backToTopBtn.style.opacity = '1';
            } else {
                backToTopBtn.style.opacity = '0';
                setTimeout(() => {
                    if (window.scrollY <= 300) {
                        backToTopBtn.style.display = 'none';
                    }
                }, 300);
            }
        }, 100));
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Header scroll effect
    if (header) {
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', throttle(() => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                header.style.backdropFilter = 'blur(10px)';
            } else {
                header.style.backgroundColor = 'var(--white)';
                header.style.backdropFilter = 'none';
            }
            
            lastScrollY = currentScrollY;
        }, 50));
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .activity-column, .floating-card');
    animateElements.forEach(el => observer.observe(el));
}

// ===================================
// Form Handlers Module
// ===================================
function initializeFormHandlers() {
    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
    
    // Generic form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    });
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('.newsletter-input').value;
    
    if (validateEmail(email)) {
        showNotification('Cảm ơn bạn đã đăng ký nhận thông báo!', 'success');
        e.target.reset();
    } else {
        showNotification('Vui lòng nhập email hợp lệ.', 'error');
    }
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    clearFieldError(field);
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'Trường này là bắt buộc');
        return false;
    }
    
    if (field.type === 'email' && value && !validateEmail(value)) {
        showFieldError(field, 'Email không hợp lệ');
        return false;
    }
    
    return true;
}

function clearFieldError(field) {
    if (typeof field === 'object' && field.target) {
        field = field.target;
    }
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
    field.classList.remove('error');
}

function showFieldError(field, message) {
    clearFieldError(field);
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===================================
// Animations Module
// ===================================
function initializeAnimations() {
    // Counter animation for stats
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const countUpObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                countUpObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => countUpObserver.observe(stat));
    
    // Floating cards animation timing
    const floatingCards = document.querySelectorAll('.floating-card');
    floatingCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 1.5}s`;
    });
}

function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/[^\d]/g, ''));
    const suffix = element.textContent.replace(/[\d]/g, '');
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 50);
}

// ===================================
// Accessibility Module
// ===================================
function initializeAccessibility() {
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Focus management for dropdowns
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle.click();
            }
        });
    });
    
    // Announce screen reader messages
    createAriaLiveRegion();
}

function handleKeyboardNavigation(e) {
    // Escape key closes modals and dropdowns
    if (e.key === 'Escape') {
        const openDropdowns = document.querySelectorAll('.dropdown-menu[style*="visible"]');
        openDropdowns.forEach(dropdown => {
            dropdown.style.visibility = 'hidden';
            dropdown.style.opacity = '0';
        });
        
        // Close chatbot if open
        if (window.chatbotUI && window.chatbotUI.isOpen) {
            window.chatbotUI.closeChatbot();
        }
    }
}

function createAriaLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'aria-live-region';
    document.body.appendChild(liveRegion);
}

function announceToScreenReader(message) {
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

// ===================================
// Notification System
// ===================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon fas fa-${getNotificationIcon(type)}"></i>
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="Đóng thông báo">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => removeNotification(notification), 5000);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        removeNotification(notification);
    });
    
    // Announce to screen readers
    announceToScreenReader(message);
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// ===================================
// Utility Functions
// ===================================
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// ===================================
// API Helpers
// ===================================
const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    },
    
    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    },
    
    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    },
    
    delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
};

// ===================================
// Socket.io Integration
// ===================================
function initializeSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
        
        // Listen for real-time notifications
        socket.on('notification', (data) => {
            showNotification(data.message, data.type);
        });
        
        // Listen for new forum posts
        socket.on('newForumPost', (post) => {
            // updateForumFeed(post); // Implement this function if needed
        });
        
        window.realtimeService = { socket, isConnected: true };
    }
}

// ===================================
// Error Handling
// ===================================
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    if (window.location.hostname === 'localhost') {
        showNotification('Đã xảy ra lỗi JavaScript. Vui lòng kiểm tra console.', 'error');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// ===================================
// Performance Monitoring
// ===================================
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
        }, 0);
    });
}

