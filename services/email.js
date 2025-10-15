const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }
  
  init() {
    // Configure based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production configuration (e.g., using SendGrid, Mailgun, etc.)
      this.transporter = nodemailer.createTransporter({
        service: 'gmail', // or your preferred service
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Development configuration (using Ethereal for testing)
      this.createTestAccount();
    }
  }
  
  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('📧 Email service initialized with test account:', testAccount.user);
    } catch (error) {
      console.error('Failed to create email test account:', error);
    }
  }
  
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'USSH Freshers Hub <noreply@ussh-freshers-hub.com>',
        to: to,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email sent:', info.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Email templates
  getEmailTemplate(templateName, variables = {}) {
    const templates = {
      welcome: {
        subject: 'Chào mừng đến với USSH Freshers\' Hub! 🎓',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Chào mừng ${variables.fullName}!</h2>
            <p>Chúc mừng bạn đã tham gia thành công cộng đồng sinh viên K1 USSH!</p>
            <p>Với USSH Freshers' Hub, bạn có thể:</p>
            <ul>
              <li>📚 Tìm kiếm tài liệu học tập</li>
              <li>💬 Tham gia thảo luận cộng đồng</li>
              <li>🧠 Nhận hỗ trợ tâm lý</li>
              <li>📅 Cập nhật thông tin trường học</li>
            </ul>
            <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
            <p style="color: #666;">USSH Freshers' Hub Team</p>
          </div>
        `
      },
      
      emailVerification: {
        subject: 'Xác thực email - USSH Freshers\' Hub',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Xác thực địa chỉ email</h2>
            <p>Xin chào ${variables.fullName},</p>
            <p>Vui lòng click vào nút bên dưới để xác thực địa chỉ email của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${variables.verificationUrl}" 
                 style="background-color: #8B4513; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Xác thực Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Nếu bạn không thể click vào nút, hãy copy link sau vào trình duyệt:<br>
              ${variables.verificationUrl}
            </p>
            <p style="color: #666;">Link này sẽ hết hạn sau 24 giờ.</p>
          </div>
        `
      },
      
      passwordReset: {
        subject: 'Đặt lại mật khẩu - USSH Freshers\' Hub',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Đặt lại mật khẩu</h2>
            <p>Xin chào ${variables.fullName},</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${variables.resetUrl}" 
                 style="background-color: #8B4513; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            <p style="color: #666;">Link này sẽ hết hạn sau 1 giờ.</p>
          </div>
        `
      },
      
      newForumPost: {
        subject: 'Có bài đăng mới trong diễn đàn!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Bài đăng mới: ${variables.postTitle}</h2>
            <p>Có bài đăng mới trong danh mục <strong>${variables.category}</strong>:</p>
            <blockquote style="border-left: 4px solid #8B4513; padding-left: 15px; color: #666;">
              ${variables.excerpt}
            </blockquote>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${variables.postUrl}" 
                 style="background-color: #8B4513; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Xem bài đăng
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Bạn nhận được email này vì đã đăng ký nhận thông báo từ diễn đàn.
            </p>
          </div>
        `
      },
      
      eventReminder: {
        subject: 'Nhắc nhở sự kiện: ${variables.eventTitle}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Sự kiện sắp diễn ra!</h2>
            <p><strong>${variables.eventTitle}</strong></p>
            <p>📅 <strong>Thời gian:</strong> ${variables.eventDate}</p>
            <p>📍 <strong>Địa điểm:</strong> ${variables.location}</p>
            <p><strong>Mô tả:</strong></p>
            <p>${variables.description}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${variables.eventUrl}" 
                 style="background-color: #8B4513; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Xem chi tiết
              </a>
            </div>
          </div>
        `
      }
    };
    
    return templates[templateName] || null;
  }
  
  async sendWelcomeEmail(user) {
    const template = this.getEmailTemplate('welcome', {
      fullName: user.fullName
    });
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  }
  
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    
    const template = this.getEmailTemplate('emailVerification', {
      fullName: user.fullName,
      verificationUrl: verificationUrl
    });
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  }
  
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    const template = this.getEmailTemplate('passwordReset', {
      fullName: user.fullName,
      resetUrl: resetUrl
    });
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  }
  
  async sendForumNotification(user, post) {
    const postUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/forum/post/${post._id}`;
    
    const template = this.getEmailTemplate('newForumPost', {
      postTitle: post.title,
      category: post.category,
      excerpt: post.content.substring(0, 200) + '...',
      postUrl: postUrl
    });
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html
    });
  }
  
  async sendEventReminder(user, event) {
    const eventUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/handbook/events/${event._id}`;
    
    const template = this.getEmailTemplate('eventReminder', {
      eventTitle: event.title,
      eventDate: event.startDate.toLocaleString('vi-VN'),
      location: event.location.venue,
      description: event.description,
      eventUrl: eventUrl
    });
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject.replace('${variables.eventTitle}', event.title),
      html: template.html
    });
  }
  
  // Bulk email sending for newsletters, announcements
  async sendBulkEmail(recipients, { subject, html, text }) {
    try {
      const results = [];
      
      // Send in batches to avoid overwhelming the server
      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const promises = batch.map(recipient => 
          this.sendEmail({
            to: recipient.email,
            subject: subject,
            html: html.replace(/{{fullName}}/g, recipient.fullName),
            text: text
          })
        );
        
        const batchResults = await Promise.allSettled(promises);
        results.push(...batchResults);
        
        // Wait between batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Bulk email error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();