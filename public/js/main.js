// ===================================

// USSH Freshers' Hub - Main JavaScript

// ===================================

document.addEventListener('DOMContentLoaded', function() {

    // Initialize all modules

    initializeNavigation();

    initializeChatbot();

    initializeScrollEffects();

    initializeFormHandlers();

    initializeAnimations();

    initializeAccessibility();

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

// Chatbot Module

// ===================================

function initializeChatbot() {

    const chatbotToggle = document.querySelector('.chatbot-toggle');

    const chatbotContainer = document.querySelector('.chatbot-container');

    const chatbotClose = document.querySelector('.chatbot-close');

    const chatbotInput = document.querySelector('.chatbot-input input');

    const chatbotSendBtn = document.querySelector('.chatbot-input button');

    const chatbotMessages = document.querySelector('.chatbot-messages');


    let isOpen = false;

    let messageHistory = [];


    // Toggle chatbot

    if (chatbotToggle && chatbotContainer) {

        chatbotToggle.addEventListener('click', toggleChatbot);

        chatbotClose?.addEventListener('click', closeChatbot);

        // Send message handlers

        chatbotSendBtn?.addEventListener('click', sendMessage);

        chatbotInput?.addEventListener('keypress', function(e) {

            if (e.key === 'Enter') {

                sendMessage();
            }

        });


        // Initialize with welcome message

        addWelcomeMessage();

    }

    function toggleChatbot() {

        isOpen = !isOpen;

        chatbotContainer.style.display = isOpen ? 'flex' : 'none';

        chatbotToggle.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';

        if (isOpen) {

            chatbotInput?.focus();

            // Add entrance animation

            chatbotContainer.style.animation = 'slideUpFadeIn 0.3s ease-out';

        }

    }

    function closeChatbot() {

        isOpen = false;

        chatbotContainer.style.display = 'none';

        chatbotToggle.style.transform = 'scale(1)';

    }

    function sendMessage() {

        const message = chatbotInput?.value.trim();

        if (!message) return;

        // Add user message

        addMessage(message, 'user');

        chatbotInput.value = '';
  
        // Show typing indicator

        showTypingIndicator();

        // Simulate AI response

        setTimeout(() => {

            hideTypingIndicator();

            const response = generateAIResponse(message);

            addMessage(response, 'bot');

        }, 1000 + Math.random() * 1000);

    }
   
    function addMessage(content, sender) {

        const messageDiv = document.createElement('div');

        messageDiv.className = `chat-message ${sender}-message`;


        const timestamp = new Date().toLocaleTimeString('vi-VN', {

            hour: '2-digit',

            minute: '2-digit'

        });
  
        messageDiv.innerHTML = `

            <div class="message-content">${content}</div>

            <div class="message-time">${timestamp}</div>

        `;

        chatbotMessages?.appendChild(messageDiv);

        chatbotMessages?.scrollTo({

            top: chatbotMessages.scrollHeight,

            behavior: 'smooth'

        });

        // Store in history

        messageHistory.push({ content, sender, timestamp });

    }

    function addWelcomeMessage() {

        setTimeout(() => {

            addMessage('Xin chào! Tôi là trợ lý AI của USSH Freshers\' Hub. Tôi có thể giúp bạn tìm hiểu về đời sống sinh viên, học tập và các hoạt động của trường. Bạn cần hỗ trợ gì không?', 'bot');

        }, 500);

    }

    function showTypingIndicator() {

        const typingDiv = document.createElement('div');

        typingDiv.className = 'typing-indicator';

        typingDiv.innerHTML = `

            <div class="typing-dots">

                <span></span>

                <span></span>

                <span></span>

            </div>

        `;

        chatbotMessages?.appendChild(typingDiv);

        chatbotMessages?.scrollTo({

            top: chatbotMessages.scrollHeight,

            behavior: 'smooth'

        });

    }

    function hideTypingIndicator() {

        const typingIndicator = document.querySelector('.typing-indicator');

        typingIndicator?.remove();

    }

    function generateAIResponse(message) {

        const lowerMessage = message.toLowerCase();


        // Simple keyword-based responses

        const responses = {

            'xin chào': 'Xin chào! Rất vui được gặp bạn. Tôi có thể giúp gì cho bạn?',

            'học tập': 'Bạn có thể truy cập Trung tâm học tập để tìm tài liệu theo từng môn học. Có gì cụ thể bạn muốn tìm hiểu không?',

            'đăng ký': 'Để đăng ký tài khoản, bạn chỉ cần click vào nút "Đăng ký" ở góc trên bên phải và điền thông tin cần thiết.',

            'diễn đàn': 'Diễn đàn cộng đồng là nơi bạn có thể thảo luận với các bạn sinh viên khác. Hãy tham gia để chia sẻ kinh nghiệm nhé!',

            'sức khỏe': 'Góc sức khỏe tinh thần cung cấp hỗ trợ tâm lý và theo dõi tâm trạng. Bạn có thể hỏi đáp ẩn danh nếu cần.',

            'cẩm nang': 'Cẩm nang sinh viên có đầy đủ thông tin về trường, bản đồ, lịch sự kiện và quy định. Rất hữu ích cho tân sinh viên!',

            'thời gian': `Hiện tại là ${new Date().toLocaleTimeString('vi-VN')}. Bạn cần biết thời gian mở cửa của cơ sở nào không?`,

            'liên hệ': 'Bạn có thể liên hệ qua email freshers@ussh.edu.vn hoặc số điện thoại (024) 3514 0000.',

            'sự kiện': 'Có nhiều sự kiện thú vị sắp diễn ra! Hãy kiểm tra lịch sự kiện trong Cẩm nang sinh viên nhé.',

            'tài liệu': 'Trung tâm học tập có đầy đủ tài liệu theo môn học, bài giảng video và đề thi. Bạn muốn tìm tài liệu môn nào?'

        };

        // Find matching response

        for (const [keyword, response] of Object.entries(responses)) {

            if (lowerMessage.includes(keyword)) {

                return response;

            }

        }

        // Default responses

        const defaultResponses = [

            'Tôi hiểu bạn đang hỏi về vấn đề này. Bạn có thể tìm thêm thông tin trong các mục Học tập, Diễn đàn, hoặc Cẩm nang sinh viên.',

            'Đây là một câu hỏi thú vị! Tôi khuyên bạn nên tham gia Diễn đàn cộng đồng để nhận được nhiều ý kiến từ các bạn sinh viên khác.',

            'Cảm ơn bạn đã hỏi! Để có thông tin chính xác nhất, hãy kiểm tra Cẩm nang sinh viên hoặc liên hệ trực tiếp với nhà trường.',

            'Tôi sẽ cố gắng hỗ trợ tốt nhất có thể. Bạn có thể nói rõ hơn về vấn đề bạn cần giúp đỡ không?'

        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];

    }

}

// Global function for external calls

window.toggleChatbot = function() {

    const chatbotToggle = document.querySelector('.chatbot-toggle');

    if (chatbotToggle) {

        chatbotToggle.click();

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

        const chatbotContainer = document.querySelector('.chatbot-container');

        if (chatbotContainer && chatbotContainer.style.display === 'flex') {

            document.querySelector('.chatbot-close')?.click();

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

            updateForumFeed(post);

        });

        return socket;

    }

}

// Initialize socket when available

document.addEventListener('DOMContentLoaded', () => {

    setTimeout(initializeSocket, 1000);

});

// ===================================

// Error Handling

// ===================================

window.addEventListener('error', (e) => {

    console.error('JavaScript error:', e.error);

    // Don't show error notifications to users in production

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
