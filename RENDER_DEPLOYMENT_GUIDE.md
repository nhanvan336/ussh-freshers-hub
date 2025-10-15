# Hướng dẫn Deploy USSH Freshers' Hub lên Render

## Bước 1: Chuẩn bị code trên GitHub

### 1.1 Tạo repository mới trên GitHub
1. Đăng nhập vào GitHub.com
2. Click nút "New" hoặc "+" ở góc trên phải
3. Đặt tên repository: `ussh-freshers-hub`
4. Chọn "Public" (để có thể sử dụng free tier của Render)
5. Click "Create repository"

### 1.2 Push code lên GitHub
Mở terminal trong thư mục dự án và chạy:

```bash
# Khởi tạo git repository
git init

# Thêm tất cả files
git add .

# Commit đầu tiên
git commit -m "Initial commit - USSH Freshers Hub"

# Thêm remote origin (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/ussh-freshers-hub.git

# Push code lên GitHub
git branch -M main
git push -u origin main
```

## Bước 2: Thiết lập trên Render

### 2.1 Đăng ký/đăng nhập Render
1. Truy cập https://render.com
2. Click "Get Started for Free"
3. Đăng ký hoặc đăng nhập bằng GitHub account

### 2.2 Kết nối GitHub repository
1. Trên dashboard Render, click "New +"
2. Chọn "Web Service"
3. Chọn "Connect a repository"
4. Tìm và chọn repository `ussh-freshers-hub`
5. Click "Connect"

## Bước 3: Cấu hình Web Service

### 3.1 Cài đặt cơ bản
- **Name**: `ussh-freshers-hub`
- **Environment**: `Node`
- **Region**: `Singapore` (gần Việt Nam nhất)
- **Branch**: `main`
- **Root Directory**: để trống
- **Runtime**: `Node`

### 3.2 Build và Deploy Commands
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3.3 Plan
- Chọn **Free** tier ($0/month)
- Lưu ý: Free tier có giới hạn 750 hours/month và service sẽ sleep sau 15 phút không hoạt động

## Bước 4: Thiết lập Database

### 4.1 Tạo MongoDB Database
1. Trong dashboard Render, click "New +"
2. Chọn "PostgreSQL" hoặc tìm MongoDB trong External Services
3. **Lưu ý**: Render không cung cấp MongoDB miễn phí, bạn cần sử dụng MongoDB Atlas

### 4.2 Thiết lập MongoDB Atlas (Miễn phí)
1. Truy cập https://www.mongodb.com/cloud/atlas
2. Đăng ký tài khoản miễn phí
3. Tạo cluster mới (chọn M0 - Free tier)
4. Chọn region gần nhất (Singapore)
5. Tạo database user và password
6. Whitelist IP addresses (0.0.0.0/0 cho development)
7. Lấy connection string

## Bước 5: Cấu hình Environment Variables

Trong phần "Environment" của Web Service trên Render, thêm các biến sau:

### 5.1 Database
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ussh-freshers-hub?retryWrites=true&w=majority
```

### 5.2 Security
```
NODE_ENV=production
SESSION_SECRET=your-very-long-random-session-secret-here
JWT_SECRET=your-jwt-secret-key-here
BCRYPT_ROUNDS=12
```

### 5.3 Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5.4 Email Configuration (tùy chọn)
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ussh-freshers-hub.com
```

### 5.5 Application URLs
```
CLIENT_URL=https://your-app-name.onrender.com
BACKEND_URL=https://your-app-name.onrender.com
```

## Bước 6: Deploy Application

### 6.1 Deploy lần đầu
1. Sau khi cấu hình xong, click "Create Web Service"
2. Render sẽ tự động build và deploy
3. Quá trình này mất khoảng 5-10 phút

### 6.2 Xem logs
- Trong dashboard, click vào service name
- Tab "Logs" để xem quá trình build và runtime logs

## Bước 7: Test và Verify

### 7.1 Kiểm tra health endpoint
Truy cập: `https://your-app-name.onrender.com/health`

### 7.2 Kiểm tra website
Truy cập: `https://your-app-name.onrender.com`

## Bước 8: Custom Domain (Tùy chọn)

### 8.1 Thêm custom domain
1. Trong service settings, tab "Settings"
2. Phần "Custom Domains"
3. Thêm domain của bạn
4. Cấu hình DNS records theo hướng dẫn

## Troubleshooting

### Lỗi thường gặp:

1. **Build fails**: Kiểm tra `package.json` và dependencies
2. **App crashes**: Xem logs để tìm lỗi
3. **Database connection**: Kiểm tra MONGODB_URI và network access
4. **Environment variables**: Đảm bảo tất cả variables cần thiết đã được set

### Lệnh hữu ích:

```bash
# Xem logs realtime
render logs -f

# Restart service
render deploy

# Xem environment variables
render env
```

## Cập nhật Application

Để cập nhật application:

1. Push code mới lên GitHub:
```bash
git add .
git commit -m "Update: your changes"
git push origin main
```

2. Render sẽ tự động detect và deploy lại

## Monitoring và Maintenance

1. **Health Checks**: Render tự động ping health endpoint
2. **Logs**: Định kỳ kiểm tra logs để phát hiện lỗi
3. **Performance**: Monitor response time và resource usage
4. **Database**: Backup và monitor MongoDB Atlas

## Lưu ý quan trọng

1. **Free Tier Limitations**:
   - 750 hours/month
   - Service sleep sau 15 phút không hoạt động
   - Cold start delay khi service wake up

2. **Security**:
   - Không commit sensitive data vào Git
   - Sử dụng environment variables cho secrets
   - Regularly update dependencies

3. **Performance**:
   - Optimize images và assets
   - Use compression middleware
   - Implement proper caching

## Cost Optimization

1. **Free Tier**: Đủ cho development và testing
2. **Starter ($7/month)**: No sleep, faster builds
3. **Standard ($25/month)**: More resources, better performance

---

**Hoàn thành!** 🎉

Ứng dụng USSH Freshers' Hub của bạn đã được deploy thành công lên Render!
