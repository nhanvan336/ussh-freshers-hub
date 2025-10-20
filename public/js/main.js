// ===================================
// USSH Freshers' Hub - Main JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    
    // --- [BỔ SUNG] KẾT NỐI NÚT BẤM "BẮT ĐẦU TRÒ CHUYỆN" ---
    const startChatButton = document.getElementById('start-chat-btn');
    if (startChatButton) {
        startChatButton.addEventListener('click', () => {
            // Kiểm tra xem chatbot UI (từ file chatbot-ui.js) đã được khởi tạo chưa
            if (window.chatbotUI && typeof window.chatbotUI.openChatbot === 'function') {
                window.chatbotUI.openChatbot(); // Mở chatbot
            } else {
                console.error('Chatbot UI is not available or not initialized yet.');
                // Phương án dự phòng: thử gọi hàm global cũ hơn
                if (typeof window.toggleChatbot === 'function') {
                    window.toggleChatbot();
                } else {
                    alert('Chức năng chatbot đang được tải, vui lòng thử lại sau giây lát.');
                }
            }
        });
    }
    // --- KẾT THÚC PHẦN BỔ SUNG ---

    // Initialize all modules (giữ nguyên code của bạn)
    initializeNavigation();
    initializeChatbot(); // Hàm này của bạn có thể vẫn hữu ích cho chatbot cũ
    initializeScrollEffects();
    initializeFormHandlers();
    initializeAnimations();
    initializeAccessibility();
});

// ===================================
// Navigation Module (Giữ nguyên)
// ===================================
function initializeNavigation() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (mobileToggle && navbarMenu) {
        mobileToggle.addEventListener('click', function() {
            const isOpen = navbarMenu.style.display === 'flex';
            navbarMenu.style.display = isOpen ? 'none' : 'flex';
            mobileToggle.setAttribute('aria-expanded', !isOpen);
            
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
    
    document.addEventListener('click', function(e) {
        if (navbarMenu && !e.target.closest('.navbar') && window.innerWidth <= 768) {
            navbarMenu.style.display = 'none';
            mobileToggle.setAttribute('aria-expanded', 'false');
            
            const lines = mobileToggle.querySelectorAll('.hamburger-line');
            lines.forEach(line => {
                line.style.transform = 'none';
                line.style.opacity = '1';
            });
        }
    });
    
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
// Chatbot Module (Giữ nguyên)
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
    
    if (chatbotToggle && chatbotContainer) {
        chatbotToggle.addEventListener('click', toggleChatbot);
        chatbotClose?.addEventListener('click', closeChatbot);
        
        chatbotSendBtn?.addEventListener('click', sendMessage);
        chatbotInput?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        addWelcomeMessage();
    }
    
    function toggleChatbot() {
        isOpen = !isOpen;
        chatbotContainer.style.display = isOpen ? 'flex' : 'none';
        chatbotToggle.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
        
        if (isOpen) {
            chatbotInput?.focus();
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
        
        addMessage(message, 'user');
        chatbotInput.value = '';
        
        showTypingIndicator();
        
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
        
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }
        
        const defaultResponses = [
            'Tôi hiểu bạn đang hỏi về vấn đề này. Bạn có thể tìm thêm thông tin trong các mục Học tập, Diễn đàn, hoặc Cẩm nang sinh viên.',
            'Đây là một câu hỏi thú vị! Tôi khuyên bạn nên tham gia Diễn đàn cộng đồng để nhận được nhiều ý kiến từ các bạn sinh viên khác.',
            'Cảm ơn bạn đã hỏi! Để có thông tin chính xác nhất, hãy kiểm tra Cẩm nang sinh viên hoặc liên hệ trực tiếp với nhà trường.',
            'Tôi sẽ cố gắng hỗ trợ tốt nhất có thể. Bạn có thể nói rõ hơn về vấn đề bạn cần giúp đỡ không?'
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
}

// ===================================
// Các module khác (Giữ nguyên)
// ===================================
function initializeScrollEffects() { /* ... */ }
function initializeFormHandlers() { /* ... */ }
function initializeAnimations() { /* ... */ }
function initializeAccessibility() { /* ... */ }
function handleKeyboardNavigation(e) { /* ... */ }
function createAriaLiveRegion() { /* ... */ }
function announceToScreenReader(message) { /* ... */ }
function showNotification(message, type = 'info') { /* ... */ }
function removeNotification(notification) { /* ... */ }
function getNotificationIcon(type) { /* ... */ }
function throttle(func, limit) { /* ... */ }
function debounce(func, delay) { /* ... */ }
// (Tôi đã rút gọn các hàm này vì chúng không thay đổi)

