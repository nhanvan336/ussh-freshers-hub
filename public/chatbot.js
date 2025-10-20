document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử HTML cần thiết của chatbot
    const chatbotToggle = document.querySelector('.chatbot-toggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const chatbotClose = document.querySelector('.chatbot-close');
    const messagesContainer = document.querySelector('.chatbot-messages');
    const input = document.querySelector('.chatbot-input input');
    const sendButton = document.querySelector('.chatbot-input button');

    // Mảng để lưu lịch sử cuộc trò chuyện
    let chatHistory = [];

    // Hàm để bật/tắt chatbot
    const toggleChatbot = () => {
        const isVisible = chatbotContainer.style.display === 'flex';
        chatbotContainer.style.display = isVisible ? 'none' : 'flex';
        chatbotToggle.style.display = isVisible ? 'flex' : 'none';
        if (!isVisible) {
            input.focus();
        }
    };

    // Thêm sự kiện click cho nút bật và nút đóng
    chatbotToggle.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', toggleChatbot);
    
    // Hàm hiển thị tin nhắn trong giao diện
    const addMessage = (sender, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        // Chuyển đổi Markdown đơn giản (in đậm, in nghiêng) thành HTML
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        messageDiv.innerHTML = formattedText;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // Hàm hiển thị chỉ báo "AI đang gõ..."
    const showTypingIndicator = () => {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // Hàm xóa chỉ báo "AI đang gõ..."
    const removeTypingIndicator = () => {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    };

    // Hàm gửi tin nhắn đến Gemini AI
    const sendMessageToAI = async (message) => {
        addMessage('user', message);
        showTypingIndicator();
        
        // Thêm tin nhắn của người dùng vào lịch sử
        chatHistory.push({ role: "user", parts: [{ text: message }] });

        // Cấu hình và gọi API của Gemini
        const apiKey = ""; // API key sẽ được cung cấp tự động
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const systemPrompt = "Bạn là USSH Assistant, một trợ lý AI thân thiện và hữu ích dành cho sinh viên trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG Hà Nội. Nhiệm vụ của bạn là trả lời các câu hỏi liên quan đến đời sống sinh viên, học tập, quy chế, các địa điểm trong trường. Luôn trả lời bằng tiếng Việt một cách ngắn gọn, rõ ràng và lịch sự. Không trả lời các câu hỏi không liên quan.";
        
        const payload = {
            contents: chatHistory,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const result = await response.json();
            removeTypingIndicator();
            
            const botResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (botResponse) {
                addMessage('bot', botResponse);
                // Thêm câu trả lời của AI vào lịch sử
                chatHistory.push({ role: "model", parts: [{ text: botResponse }] });
            } else {
                addMessage('bot', 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.');
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
            removeTypingIndicator();
            addMessage('bot', 'Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    };

    // Hàm xử lý khi người dùng gửi tin nhắn
    const handleSend = () => {
        const message = input.value.trim();
        if (message) {
            sendMessageToAI(message);
            input.value = '';
        }
    };

    // Thêm sự kiện click cho nút gửi và nhấn Enter
    sendButton.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    // Thêm tin nhắn chào mừng ban đầu
    addMessage('bot', 'Xin chào! Tôi là Trợ lý AI của USSH. Tôi có thể giúp gì cho bạn?');
});
