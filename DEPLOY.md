# Hướng dẫn deploy lên Azure for Students

Toàn bộ hệ thống chạy trên **một máy ảo (VM)** bằng Docker Compose:

```
Internet ──443/80──▶ Caddy (HTTPS tự động) ──▶ frontend (nginx) ──/api, /static──▶ backend (FastAPI) ──▶ db (PostgreSQL)
```

Chỉ Caddy mở cổng ra ngoài. Database, backend và frontend chỉ nói chuyện với nhau trong mạng nội bộ của Docker.

Thời gian làm lần đầu: khoảng 45–60 phút.

---

## 0. Chuẩn bị

| Cần có | Ghi chú |
| :--- | :--- |
| Tài khoản Azure for Students | Đăng ký bằng email `@hcmut.edu.vn` tại azure.microsoft.com/free/students |
| Một tên miền | Xem gợi ý tên miền cho sinh viên ở cuối file |
| Gmail dùng để gửi email quên mật khẩu | Bật **Xác minh 2 bước**, rồi tạo **App password** (Google Account → Security → App passwords). Đó là chuỗi 16 ký tự, dùng thay mật khẩu Gmail |
| SSH key trên máy bạn | Chưa có thì chạy `ssh-keygen -t ed25519` |

---

## 1. Tạo máy ảo trên Azure

Azure Portal → **Virtual machines** → **Create** → **Azure virtual machine**:

| Mục | Chọn |
| :--- | :--- |
| Region | **Southeast Asia** (Singapore, gần Việt Nam nhất) |
| Image | **Ubuntu Server 24.04 LTS – x64 Gen2** |
| Size | **B2ats v2** (2 vCPU, 1 GB RAM). Đây là size nằm trong gói miễn phí 750 giờ/tháng; portal sẽ ghi *"Free services eligible"*. B1s cũng được nhưng chậm hơn |
| Authentication | SSH public key, username `azureuser`, dán nội dung file `~/.ssh/id_ed25519.pub` |
| Inbound ports | Tick **SSH (22), HTTP (80), HTTPS (443)** |
| OS disk | **Standard SSD**, 64 GB (nằm trong mức miễn phí) |

Sau khi tạo xong:
- Vào **Networking** → **Public IP address** → đổi **Assignment** sang **Static**, để IP không đổi khi khởi động lại máy. IP tĩnh có tính phí nhỏ, trừ vào tín dụng sinh viên.
- Ghi lại địa chỉ **Public IP**.

> Azure chặn cổng 25 (SMTP) gửi ra ngoài. Ứng dụng dùng cổng 587 của Gmail nên không bị ảnh hưởng.

---

## 2. Trỏ tên miền về máy ảo

Vào trang quản lý DNS của nơi bạn mua tên miền, tạo 2 bản ghi:

| Type | Host | Value |
| :--- | :--- | :--- |
| A | `@` | Public IP của VM |
| A | `www` | Public IP của VM |

Kiểm tra từ máy bạn bằng `nslookup ten-mien-cua-ban`. Khi lệnh trả về đúng IP thì làm tiếp. Thường mất vài phút, có khi tới vài giờ.

---

## 3. Cài Docker trên máy ảo

```bash
ssh azureuser@<PUBLIC_IP>

# Docker + Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # thoát rồi ssh lại để quyền docker có hiệu lực
```

VM chỉ có 1 GB RAM, nên thêm 2 GB swap để build không bị thiếu bộ nhớ:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Lấy mã nguồn và cấu hình

```bash
git clone https://github.com/Cocobaut/exhitibtion-diary-platform.git
cd exhitibtion-diary-platform
cp .env.production.example .env

# Tạo sẵn 2 chuỗi bí mật để dán vào .env
echo "SECRET_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"

nano .env
```

Nếu repo để private, tạo một Personal Access Token trên GitHub (quyền đọc repo) và dùng nó làm mật khẩu khi `git clone`.

Điền đủ các dòng trong `.env`:
- `DOMAIN`: tên miền, không có `https://` và `www`, ví dụ `bao-tang-cam-xuc.me`.
- `ACME_EMAIL`: email của bạn, Let's Encrypt gửi thông báo về chứng chỉ HTTPS vào đây.
- `SECRET_KEY`, `POSTGRES_PASSWORD`: dán 2 chuỗi vừa tạo. **Lưu `SECRET_KEY` ở nơi an toàn.** Nếu đổi key, mọi người sẽ bị đăng xuất và API key AI đã lưu không giải mã được nữa.
- `SMTP_USER`, `EMAILS_FROM_EMAIL`: địa chỉ Gmail.
- `SMTP_PASSWORD`: App password 16 ký tự.

---

## 5. Chạy

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # 4 dịch vụ đều "Up", db "healthy"
docker compose -f docker-compose.prod.yml logs caddy # thấy "certificate obtained successfully" là có HTTPS
```

Lần chạy đầu, database tự tạo bảng từ `backend/database/01_schema.sql`. Sau đó nạp `02_seed_production.sql`, gồm phòng, lời nhắn hòm thư và từ điển từ ngữ vi phạm. Bản production **không có tài khoản hay bài viết mẫu nào**.

### Tạo tài khoản chủ bảo tàng (OWNER)

```bash
docker compose -f docker-compose.prod.yml exec backend python -m scripts.create_owner
```

Nhập tên đăng nhập, email thật (để dùng được chức năng quên mật khẩu) và một mật khẩu mạnh.

### Việc làm ngay sau khi lên web

1. Mở `https://ten-mien-cua-ban`, đăng nhập bằng tài khoản OWNER.
2. Vào **Owner** → cấp quyền **Admin** cho tài khoản của các thành viên nhóm. Các bạn tự đăng ký tài khoản trước.
3. Vào **Owner → Cài đặt AI**: nhập Gemini API key, bật AI, rồi thử nút "Dịch bằng AI" một lần.
4. Thử chức năng **Quên mật khẩu** bằng email của bạn để chắc chắn gửi được email.

---

## 6. Sao lưu tự động

```bash
./deploy/backup.sh   # chạy thử một lần, file nằm trong thư mục backups/
crontab -e
```

Thêm dòng sau để sao lưu lúc 3 giờ sáng mỗi ngày. Script giữ lại 14 ngày gần nhất.

```
0 3 * * * cd /home/azureuser/exhitibtion-diary-platform && ./deploy/backup.sh >> backups/backup.log 2>&1
```

Backup nằm trên chính VM thì sẽ mất theo VM. Thỉnh thoảng hãy tải về máy bạn:

```bash
scp -r azureuser@<PUBLIC_IP>:exhitibtion-diary-platform/backups ./backups-azure
```

### Khôi phục từ bản sao lưu

```bash
C="docker compose -f docker-compose.prod.yml"
# Database (ghi đè dữ liệu hiện tại)
$C exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/db-YYYYMMDD-HHMMSS.dump
# Ảnh tải lên
$C exec -T backend tar -xzf - -C /app < backups/uploads-YYYYMMDD-HHMMSS.tar.gz
```

---

## 7. Cập nhật phiên bản mới

```bash
cd ~/exhitibtion-diary-platform
./deploy/backup.sh
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Lưu ý: các file SQL trong `backend/database/` **chỉ chạy lần đầu**, khi volume database còn trống. Nếu sau này đổi cấu trúc bảng, phải chạy lệnh SQL thay đổi bằng tay. Đừng xoá volume, vì `down -v` sẽ **xoá sạch dữ liệu**.

---

## 8. Theo dõi và chi phí

- **UptimeRobot** (miễn phí): theo dõi `https://ten-mien-cua-ban`, báo qua email khi trang không truy cập được.
- **Azure → Cost Management → Budgets**: đặt ngưỡng cảnh báo, ví dụ 5 USD/tháng, để biết sớm nếu có dịch vụ ngoài gói miễn phí bị tính tiền.
- Xem log khi có lỗi: `docker compose -f docker-compose.prod.yml logs -f backend`

---

## Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
| :--- | :--- |
| Caddy báo lỗi lấy chứng chỉ | DNS chưa trỏ đúng IP, hoặc chưa mở cổng 80/443 trong Network security group của VM |
| `compose` báo "Hãy đặt ... trong .env" | Còn thiếu dòng tương ứng trong `.env` |
| Không nhận được email quên mật khẩu | Kiểm tra App password Gmail và xem `logs backend`. Cũng xem thư mục Spam |
| Build bị dừng giữa chừng hoặc máy treo | Chưa bật swap (bước 3) |
| Đăng nhập báo "thử sai quá nhiều lần" | Chức năng chống dò mật khẩu đang hoạt động. Đợi 15 phút, hoặc chạy `docker compose -f docker-compose.prod.yml restart backend` |

---

## Gợi ý tên miền cho sinh viên

Các ưu đãi có thể thay đổi, hãy kiểm tra lại trên trang chính thức trước khi đăng ký.

- **GitHub Student Developer Pack** (education.github.com/pack), dùng email `@hcmut.edu.vn` để xác minh:
  - **Namecheap**: miễn phí 1 năm một tên miền `.me`, kèm SSL. Dễ dùng, giá gia hạn mềm nhất trong ba lựa chọn → **nên chọn**.
  - **Name.com**: miễn phí 1 năm một tên miền thuộc nhóm đuôi mới như `.dev`, `.app`, `.live`, `.studio`.
  - **get.tech**: miễn phí 1 năm một tên miền `.tech`. Giá gia hạn cao, chỉ nên dùng thử.
- **`.id.vn`** (VNNIC): từng miễn phí 2 năm cho công dân Việt Nam 18–23 tuổi, nhưng chương trình ghi hạn đến 31/12/2025. Hãy kiểm tra trên tenmien.vn xem đã được gia hạn chưa. Nếu còn, đây là lựa chọn có tên miền `.vn` mà không tốn phí.
