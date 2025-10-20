const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// GET route to display the contact page
router.get('/', (req, res) => {
    res.render('pages/contact', {
        title: 'Liên hệ - USSH Freshers\' Hub',
        user: req.user
    });
});

// POST route to handle form submission
router.post('/', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // --- CẤU HÌNH GỬI EMAIL ---
    // 1. Tạo một "transporter" - đối tượng có thể gửi mail
    // Thay thế các giá trị trong process.env bằng thông tin của bạn
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER, // Email của bạn, ví dụ: 'your-email@gmail.com'
            pass: process.env.GMAIL_APP_PASS, // Mật khẩu ứng dụng từ Google
        },
    });

    // 2. Thiết lập nội dung email
    const mailOptions = {
        from: `"${name}" <${email}>`, // Hiển thị tên và email người gửi
        to: process.env.GMAIL_USER, // Gửi đến email của bạn
        replyTo: email, // Khi bạn trả lời, sẽ trả lời đến email của người gửi
        subject: `[USSH Hub Contact] - ${subject}`,
        html: `
            <h3>Bạn có một tin nhắn mới từ USSH Freshers' Hub</h3>
            <p><strong>Từ:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr>
            <h4>Nội dung:</h4>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `,
    };

    // 3. Gửi email
    try {
        await transporter.sendMail(mailOptions);
        req.flash('success_msg', 'Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất có thể.');
        res.redirect('/contact');
    } catch (error) {
        console.error('Error sending email:', error);
        req.flash('error_msg', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        res.redirect('/contact');
    }
});

module.exports = router;
