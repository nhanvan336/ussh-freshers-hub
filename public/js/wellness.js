// Wellness Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wellness page loaded');
    
    // Wellness tracking functionality
    const wellnessTracker = {
        // Track mood
        trackMood: function() {
            const moodButtons = document.querySelectorAll('.mood-btn');
            moodButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Remove active class from all buttons
                    moodButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                    
                    const mood = this.dataset.mood;
                    console.log('Mood tracked:', mood);
                    
                    // Save mood to localStorage
                    this.saveMoodData(mood);
                    
                    // Show confirmation
                    this.showMoodConfirmation(mood);
                });
            });
        },
        
        saveMoodData: function(mood) {
            const today = new Date().toDateString();
            let moodData = JSON.parse(localStorage.getItem('moodData') || '{}');
            moodData[today] = mood;
            localStorage.setItem('moodData', JSON.stringify(moodData));
        },
        
        showMoodConfirmation: function(mood) {
            const confirmation = document.createElement('div');
            confirmation.className = 'mood-confirmation';
            confirmation.innerHTML = `
                <p>✅ Đã ghi nhận tâm trạng: <strong>${mood}</strong></p>
            `;
            confirmation.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color, #28a745);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(confirmation);
            
            setTimeout(() => {
                confirmation.remove();
            }, 3000);
        },
        
        // Initialize mood tracking
        init: function() {
            this.trackMood();
            this.loadMoodHistory();
        },
        
        loadMoodHistory: function() {
            const moodData = JSON.parse(localStorage.getItem('moodData') || '{}');
            const historyContainer = document.querySelector('.mood-history');
            
            if (historyContainer && Object.keys(moodData).length > 0) {
                const recentEntries = Object.entries(moodData)
                    .sort(([a], [b]) => new Date(b) - new Date(a))
                    .slice(0, 7);
                
                historyContainer.innerHTML = `
                    <h4>Lịch sử tâm trạng (7 ngày gần nhất)</h4>
                    <div class="mood-timeline">
                        ${recentEntries.map(([date, mood]) => `
                            <div class="mood-entry">
                                <span class="date">${new Date(date).toLocaleDateString('vi-VN')}</span>
                                <span class="mood ${mood.toLowerCase()}">${mood}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    };
    
    // Stress relief tools
    const stressRelief = {
        // Breathing exercise
        breathingExercise: function() {
            const breathingBtn = document.querySelector('.breathing-exercise-btn');
            if (breathingBtn) {
                breathingBtn.addEventListener('click', function() {
                    this.startBreathingSession();
                });
            }
        },
        
        startBreathingSession: function() {
            const modal = this.createBreathingModal();
            document.body.appendChild(modal);
            
            let phase = 'inhale'; // inhale, hold, exhale
            let counter = 0;
            const phases = {
                inhale: { duration: 4, text: 'Hít vào', next: 'hold' },
                hold: { duration: 7, text: 'Giữ', next: 'exhale' },
                exhale: { duration: 8, text: 'Thở ra', next: 'inhale' }
            };
            
            const circle = modal.querySelector('.breathing-circle');
            const instruction = modal.querySelector('.breathing-instruction');
            const timer = modal.querySelector('.breathing-timer');
            
            const breathingInterval = setInterval(() => {
                const currentPhase = phases[phase];
                instruction.textContent = currentPhase.text;
                timer.textContent = currentPhase.duration - (counter % currentPhase.duration);
                
                // Visual feedback
                circle.className = `breathing-circle ${phase}`;
                
                counter++;
                
                if (counter % currentPhase.duration === 0) {
                    phase = currentPhase.next;
                }
                
                // Stop after 5 cycles (about 2 minutes)
                if (counter >= 95) {
                    clearInterval(breathingInterval);
                    this.endBreathingSession(modal);
                }
            }, 1000);
            
            // Allow manual stop
            modal.querySelector('.stop-btn').addEventListener('click', () => {
                clearInterval(breathingInterval);
                modal.remove();
            });
        },
        
        createBreathingModal: function() {
            const modal = document.createElement('div');
            modal.className = 'breathing-modal';
            modal.innerHTML = `
                <div class="breathing-container">
                    <div class="breathing-header">
                        <h3>Bài tập th呼吸 4-7-8</h3>
                        <button class="stop-btn" aria-label="Dừng bài tập">×</button>
                    </div>
                    <div class="breathing-circle"></div>
                    <div class="breathing-instruction">Hít vào</div>
                    <div class="breathing-timer">4</div>
                    <p class="breathing-guide">Thực hiện theo hướng dẫn để giảm căng thẳng</p>
                </div>
            `;
            
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;
            
            return modal;
        },
        
        endBreathingSession: function(modal) {
            const container = modal.querySelector('.breathing-container');
            container.innerHTML = `
                <div class="breathing-complete">
                    <h3>🎉 Hoàn thành!</h3>
                    <p>Bạn đã hoàn thành bài tập thở. Cảm giác thế nào?</p>
                    <button class="close-btn">Đóng</button>
                </div>
            `;
            
            container.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
            });
            
            setTimeout(() => {
                modal.remove();
            }, 5000);
        },
        
        init: function() {
            this.breathingExercise();
        }
    };
    
    // Mental health resources
    const mentalHealthResources = {
        // Show emergency contacts
        emergencyContacts: function() {
            const emergencyBtn = document.querySelector('.emergency-btn');
            if (emergencyBtn) {
                emergencyBtn.addEventListener('click', function() {
                    this.showEmergencyModal();
                });
            }
        },
        
        showEmergencyModal: function() {
            const modal = document.createElement('div');
            modal.className = 'emergency-modal';
            modal.innerHTML = `
                <div class="emergency-container">
                    <h3>🆘 Hỗ trợ khẩn cấp</h3>
                    <div class="emergency-contacts">
                        <div class="contact-item">
                            <h4>Đường dây nóng tâm lý 24/7</h4>
                            <p><strong>1800-1567</strong> - Miễn phí</p>
                        </div>
                        <div class="contact-item">
                            <h4>Trung tâm Y tế USSH</h4>
                            <p><strong>(024) 3754-7506</strong></p>
                        </div>
                        <div class="contact-item">
                            <h4>Phòng Công tác Sinh viên</h4>
                            <p><strong>(024) 3754-7896</strong></p>
                        </div>
                    </div>
                    <button class="close-emergency-btn">Đóng</button>
                </div>
            `;
            
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close-emergency-btn').addEventListener('click', () => {
                modal.remove();
            });
        },
        
        init: function() {
            this.emergencyContacts();
        }
    };
    
    // Self-care reminders
    const selfCareReminders = {
        // Set up reminder notifications
        setupReminders: function() {
            const reminderForm = document.querySelector('.reminder-form');
            if (reminderForm) {
                reminderForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    this.addReminder();
                });
            }
        },
        
        addReminder: function() {
            const form = document.querySelector('.reminder-form');
            const title = form.querySelector('input[name="title"]').value;
            const time = form.querySelector('input[name="time"]').value;
            const frequency = form.querySelector('select[name="frequency"]').value;
            
            if (!title || !time) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }
            
            const reminder = {
                id: Date.now(),
                title,
                time,
                frequency,
                active: true,
                created: new Date().toISOString()
            };
            
            let reminders = JSON.parse(localStorage.getItem('selfCareReminders') || '[]');
            reminders.push(reminder);
            localStorage.setItem('selfCareReminders', JSON.stringify(reminders));
            
            this.displayReminders();
            form.reset();
            
            // Show success message
            this.showSuccessMessage('Đã thêm nhắc nhở!');
        },
        
        displayReminders: function() {
            const container = document.querySelector('.reminders-list');
            if (!container) return;
            
            const reminders = JSON.parse(localStorage.getItem('selfCareReminders') || '[]');
            
            if (reminders.length === 0) {
                container.innerHTML = '<p class="no-reminders">Chưa có nhắc nhở nào</p>';
                return;
            }
            
            container.innerHTML = reminders.map(reminder => `
                <div class="reminder-item ${reminder.active ? 'active' : 'inactive'}">
                    <div class="reminder-content">
                        <h4>${reminder.title}</h4>
                        <p>⏰ ${reminder.time} - ${this.getFrequencyText(reminder.frequency)}</p>
                    </div>
                    <div class="reminder-actions">
                        <button class="toggle-reminder" data-id="${reminder.id}">
                            ${reminder.active ? 'Tắt' : 'Bật'}
                        </button>
                        <button class="delete-reminder" data-id="${reminder.id}">Xóa</button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for actions
            this.attachReminderActions();
        },
        
        getFrequencyText: function(frequency) {
            const frequencies = {
                daily: 'Hàng ngày',
                weekly: 'Hàng tuần',
                monthly: 'Hàng tháng'
            };
            return frequencies[frequency] || frequency;
        },
        
        attachReminderActions: function() {
            // Toggle reminder
            document.querySelectorAll('.toggle-reminder').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    selfCareReminders.toggleReminder(id);
                });
            });
            
            // Delete reminder
            document.querySelectorAll('.delete-reminder').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    if (confirm('Bạn có chắc muốn xóa nhắc nhở này?')) {
                        selfCareReminders.deleteReminder(id);
                    }
                });
            });
        },
        
        toggleReminder: function(id) {
            let reminders = JSON.parse(localStorage.getItem('selfCareReminders') || '[]');
            const reminder = reminders.find(r => r.id === id);
            if (reminder) {
                reminder.active = !reminder.active;
                localStorage.setItem('selfCareReminders', JSON.stringify(reminders));
                this.displayReminders();
            }
        },
        
        deleteReminder: function(id) {
            let reminders = JSON.parse(localStorage.getItem('selfCareReminders') || '[]');
            reminders = reminders.filter(r => r.id !== id);
            localStorage.setItem('selfCareReminders', JSON.stringify(reminders));
            this.displayReminders();
            this.showSuccessMessage('Đã xóa nhắc nhở!');
        },
        
        showSuccessMessage: function(message) {
            const toast = document.createElement('div');
            toast.className = 'success-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color, #28a745);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        },
        
        init: function() {
            this.setupReminders();
            this.displayReminders();
        }
    };
    
    // Progress tracking
    const progressTracking = {
        // Track wellness activities
        trackActivity: function() {
            const activityBtns = document.querySelectorAll('.activity-track-btn');
            activityBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const activity = this.dataset.activity;
                    progressTracking.logActivity(activity);
                });
            });
        },
        
        logActivity: function(activity) {
            const today = new Date().toDateString();
            let activities = JSON.parse(localStorage.getItem('wellnessActivities') || '{}');
            
            if (!activities[today]) {
                activities[today] = [];
            }
            
            activities[today].push({
                activity,
                timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('wellnessActivities', JSON.stringify(activities));
            this.updateProgressDisplay();
            
            // Show feedback
            this.showActivityFeedback(activity);
        },
        
        updateProgressDisplay: function() {
            const progressContainer = document.querySelector('.progress-display');
            if (!progressContainer) return;
            
            const today = new Date().toDateString();
            const activities = JSON.parse(localStorage.getItem('wellnessActivities') || '{}');
            const todayActivities = activities[today] || [];
            
            progressContainer.innerHTML = `
                <h4>Hoạt động hôm nay</h4>
                <div class="activity-count">
                    <span class="count">${todayActivities.length}</span>
                    <span class="label">hoạt động</span>
                </div>
                ${todayActivities.length > 0 ? `
                    <div class="recent-activities">
                        ${todayActivities.slice(-3).map(item => `
                            <div class="activity-item">
                                ✅ ${item.activity}
                                <small>${new Date(item.timestamp).toLocaleTimeString('vi-VN')}</small>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>Chưa có hoạt động nào</p>'}
            `;
        },
        
        showActivityFeedback: function(activity) {
            const feedback = document.createElement('div');
            feedback.className = 'activity-feedback';
            feedback.innerHTML = `
                <p>🎉 Tuyệt vời! Bạn đã hoàn thành: <strong>${activity}</strong></p>
            `;
            feedback.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--primary-brown);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: bounceIn 0.5s ease;
            `;
            
            document.body.appendChild(feedback);
            
            setTimeout(() => {
                feedback.remove();
            }, 2000);
        },
        
        init: function() {
            this.trackActivity();
            this.updateProgressDisplay();
        }
    };
    
    // Initialize all wellness features
    wellnessTracker.init();
    stressRelief.init();
    mentalHealthResources.init();
    selfCareReminders.init();
    progressTracking.init();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes bounceIn {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            70% {
                transform: translate(-50%, -50%) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        .breathing-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(45deg, var(--primary-brown), var(--accent-gold));
            margin: 20px auto;
            transition: transform 1s ease-in-out;
        }
        
        .breathing-circle.inhale {
            transform: scale(1.3);
        }
        
        .breathing-circle.exhale {
            transform: scale(0.8);
        }
        
        .breathing-circle.hold {
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);
});