const mongoose = require('mongoose');
const Document = require('./models/Document'); // Đường dẫn tới model Document của bạn
const User = require('./models/User');       // Đường dẫn tới model User của bạn
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ussh_freshers_hub';

const seedDocuments = async () => {
    try {
        // 1. Kết nối đến Database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Đã kết nối đến MongoDB để seeding...');

        // 2. Tìm hoặc tạo một người dùng mẫu để làm người tải lên
        let sampleUploader = await User.findOne({ email: 'seeder@ussh.edu.vn' });
        if (!sampleUploader) {
            console.log('Tạo người dùng mẫu...');
            sampleUploader = new User({
                username: 'seeder',
                email: 'seeder@ussh.edu.vn',
                password: 'password123', // Mật khẩu này sẽ được hash bởi model
                fullName: 'Người Dùng Mẫu',
                studentId: '00000000',
                major: 'Other',
                role: 'student'
            });
            await sampleUploader.save();
        }

        // 3. Xóa các tài liệu cũ để tránh trùng lặp
        console.log('Xóa các tài liệu cũ...');
        await Document.deleteMany({});

        // 4. Tạo danh sách tài liệu mẫu
        const documents = [
            {
                title: 'Đề cương Lịch sử Văn minh Thế giới',
                description: 'Tổng hợp kiến thức trọng tâm và câu hỏi ôn tập cho môn Lịch sử Văn minh Thế giới.',
                category: 'exam',
                subject: 'History',
                fileInfo: {
                    originalName: 'de_cuong_van_minh_the_gioi.pdf',
                    fileType: 'pdf',
                    size: 2048,
                    url: '/uploads/sample.pdf' // Đường dẫn giả lập
                },
                uploader: sampleUploader._id,
                isApproved: true,
                tags: ['lịch sử', 'văn minh', 'đề cương'],
            },
            {
                title: 'Giáo trình Tâm lý học Đại cương',
                description: 'Giáo trình chính thức của khoa Tâm lý học, cung cấp kiến thức nền tảng về các trường phái và khái niệm cơ bản.',
                category: 'ebook',
                subject: 'Psychology',
                fileInfo: {
                    originalName: 'giao_trinh_tam_ly_hoc.pdf',
                    fileType: 'pdf',
                    size: 5120,
                    url: '/uploads/sample.pdf'
                },
                uploader: sampleUploader._id,
                isApproved: true,
                isFeatured: true, // Đánh dấu là tài liệu nổi bật
                tags: ['tâm lý học', 'đại cương', 'giáo trình'],
            },
            {
                title: 'Slide bài giảng Nhập môn Báo chí Truyền thông',
                description: 'Tổng hợp slide bài giảng của giảng viên về các khái niệm cơ bản trong ngành báo chí và truyền thông hiện đại.',
                category: 'lecture',
                subject: 'Journalism',
                fileInfo: {
                    originalName: 'nhap_mon_bao_chi.pptx',
                    fileType: 'pptx',
                    size: 10240,
                    url: '/uploads/sample.pptx'
                },
                uploader: sampleUploader._id,
                isApproved: true,
                tags: ['báo chí', 'truyền thông', 'slide'],
            },
            {
                title: 'Tuyển tập các bài luận Triết học Mác-Lênin điểm cao',
                description: 'Một số bài luận mẫu đạt điểm cao môn Những nguyên lý cơ bản của Chủ nghĩa Mác-Lênin để tham khảo.',
                category: 'other',
                subject: 'Philosophy',
                fileInfo: {
                    originalName: 'luan_mau_triet_hoc.docx',
                    fileType: 'docx',
                    size: 512,
                    url: '/uploads/sample.docx'
                },
                uploader: sampleUploader._id,
                isApproved: true,
                tags: ['triết học', 'luận mẫu'],
            },
            {
                title: 'Các phương pháp nghiên cứu Xã hội học',
                description: 'Tài liệu giới thiệu các phương pháp định tính và định lượng trong nghiên cứu xã hội học.',
                category: 'ebook',
                subject: 'Sociology',
                fileInfo: {
                    originalName: 'phuong_phap_nghien_cuu.pdf',
                    fileType: 'pdf',
                    size: 3072,
                    url: '/uploads/sample.pdf'
                },
                uploader: sampleUploader._id,
                isApproved: true,
                tags: ['xã hội học', 'nghiên cứu khoa học'],
            },
        ];

        // 5. Thêm các tài liệu mới vào database
        console.log('Thêm 5 tài liệu mẫu vào database...');
        await Document.insertMany(documents);

        console.log('✅ Seeding hoàn tất!');

    } catch (error) {
        console.error('❌ Đã có lỗi xảy ra khi seeding:', error);
    } finally {
        // 6. Ngắt kết nối database
        mongoose.connection.close();
        console.log('Đã ngắt kết nối MongoDB.');
    }
};

seedDocuments();
```

### Bước 3: Chạy script

1.  Mở cửa sổ dòng lệnh (terminal) của bạn lên.
2.  Di chuyển vào thư mục gốc của dự án `ussh-freshers-hub/`.
3.  Chạy lệnh sau:
    ```bash
    node seed.js
