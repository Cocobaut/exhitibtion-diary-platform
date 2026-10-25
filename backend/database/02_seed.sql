-- ====================================================================
-- PROJECT EXHIBITION & DIARY PLATFORM - SEED INITIAL DATA
-- Mỗi bảng bao gồm 5 dòng dữ liệu mẫu chuẩn hóa theo 01_schema.sql
-- ====================================================================

-- ====================================================================
-- 1. BẢNG: rooms (5 Phòng triển lãm)
-- ====================================================================
INSERT INTO rooms (id, room_code, title, description)
VALUES 
    (1, 'BROKEN', 'Phòng Đổ Vỡ', 'Không gian sẻ chia những đổ vỡ, tổn thương và góc khuất tâm hồn.'),
    (2, 'HOPE', 'Phòng Hy Vọng', 'Nơi gửi gắm những ước nguyện tương lai, thắp sáng lồng đèn hy vọng.'),
    (3, 'COMMUNITY', 'Phòng Động Viên Cộng Đồng', 'Cây thông điệp kết nối, lan tỏa sự đồng cảm và năng lượng tích cực.'),
    (4, 'HEALING', 'Phòng Chữa Lành', 'Nơi tĩnh lặng lắng nghe cảm xúc, tìm lại sự bình yên nội tại.'),
    (5, 'GRATITUDE', 'Phòng Biết Ơn', 'Nơi lưu giữ những lời cảm ơn chân thành và khoảnh khắc đáng trân quý.')
ON CONFLICT (room_code) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;

SELECT setval(pg_get_serial_sequence('rooms', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM rooms;

-- ====================================================================
-- 2. BẢNG: users (6 Người dùng: 1 OWNER, 2 ADMIN, 3 USER)
-- Mật khẩu mặc định: AdminPassword@2026 / UserPassword@2026 / OwnerPassword@2026
-- password_hash là bcrypt hash hợp lệ của chuỗi mật khẩu
-- ====================================================================
INSERT INTO users (id, username, email, password_hash, nickname, role, avatar_url, bio, is_active)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000000',
        'owner_master',
        'owner@exhibition.edu.vn',
        '$2b$12$4rMuWtyzLY5uTLP.RmaHju8XneNlR.4KCO8h1cXFMnCyXo2Ug/rzq',
        'Chủ Sở Hữu Triển Lãm',
        'OWNER',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        'Tài khoản Chủ sở hữu tối cao của nền tảng',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin_exhibition',
        'admin@exhibition.edu.vn',
        '$2b$12$4rMuWtyzLY5uTLP.RmaHju8XneNlR.4KCO8h1cXFMnCyXo2Ug/rzq',
        'Ban Quản Trị',
        'ADMIN',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        'Tài khoản quản trị viên hệ thống triển lãm',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'moderator_linh',
        'linh.moderator@exhibition.edu.vn',
        '$2b$12$4rMuWtyzLY5uTLP.RmaHju8XneNlR.4KCO8h1cXFMnCyXo2Ug/rzq',
        'Kiểm Duyệt Viên Linh',
        'ADMIN',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
        'Điều phối viên nội dung và kiểm duyệt bài viết',
        TRUE
    ),
    (
        'b0000000-0000-0000-0000-000000000001',
        'minh_tam',
        'minhtam@gmail.com',
        '$2b$12$sOGd8SrEtrILJXEi..BF0udLoeD3NonhBfDej6Wt22w6aF4itiBFu',
        'Minh Tâm',
        'USER',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        'Người tìm kiếm sự tĩnh lặng qua từng trang viết',
        TRUE
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'hoang_nam',
        'hoangnam@gmail.com',
        '$2b$12$sOGd8SrEtrILJXEi..BF0udLoeD3NonhBfDej6Wt22w6aF4itiBFu',
        'Hoàng Nam',
        'USER',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
        'Sinh viên năm 3 yêu thích hội họa và nhiếp ảnh',
        TRUE
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'lan_anh',
        'lananh@gmail.com',
        '$2b$12$sOGd8SrEtrILJXEi..BF0udLoeD3NonhBfDej6Wt22w6aF4itiBFu',
        'Lan Anh',
        'USER',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
        'Luôn tin rằng nụ cười có thể chữa lành mọi tổn thương',
        TRUE
    )
ON CONFLICT (id) DO UPDATE 
SET nickname = EXCLUDED.nickname, bio = EXCLUDED.bio;

-- ====================================================================
-- 3. BẢNG: artworks (5 Tác phẩm trong các phòng triển lãm)
-- ====================================================================
INSERT INTO artworks (
    id, user_id, room_id, title, author_display_name, is_anonymous, 
    short_content, content, media_url, status, reviewed_by, reviewed_at, 
    admin_note, target_date, is_opened, visibility, tag_category, color_code, view_count
)
VALUES 
    (
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        1,
        'Những mảnh vỡ sau kỳ thi đại học',
        'Ẩn danh',
        TRUE,
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng...',
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng. Từng kỳ vọng của gia đình như tảng đá đè nặng lên vai. Nhưng hôm nay, tôi quyết định đối diện và chấp nhận vết nứt này như một phần của hành trình trưởng thành.',
        'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Nội dung chân thực, phù hợp chủ đề Đổ Vỡ.',
        NULL,
        FALSE,
        'PUBLIC',
        'Áp lực học tập',
        '#4A5568',
        142
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        2,
        'Nguyện ước gửi cánh hạc giấy',
        'Hoàng Nam',
        FALSE,
        'Gửi vào tương lai lời chúc cho bản thân kiên định với ngành Khoa học Máy tính.',
        'Tôi đã gấp 100 con hạc giấy trước ngày nhận kết quả học bổng. Hy vọng ngọn đèn này sẽ thắp sáng ước mơ trở thành kỹ sư công nghệ cống hiến cho xã hội.',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Ý nghĩa truyền cảm hứng tốt.',
        CURRENT_TIMESTAMP + INTERVAL '1 year',
        FALSE,
        'PUBLIC',
        'Ước mơ',
        '#F6AD55',
        89
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003',
        3,
        'Bạn không hề đơn độc',
        'Lan Anh',
        FALSE,
        'Nếu bạn đang cảm thấy mệt mỏi, hãy hít thở thật sâu và nhớ rằng luôn có người ủng hộ bạn.',
        'Một chiếc ôm ấm áp gửi tới bất kỳ ai đang cảm thấy chênh vênh giữa dòng đời. Hãy nhớ rằng bầu trời sau cơn mưa bao giờ cũng rực rỡ nhất.',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        'Bài viết mang lại năng lượng rất tích cực.',
        NULL,
        FALSE,
        'PUBLIC',
        'Động viên',
        '#68D391',
        205
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000001',
        4,
        'Chiều mưa bên góc quán quen',
        'Minh Tâm',
        FALSE,
        'Tách trà nóng và tiếng mưa rơi xoa dịu đi những căng thẳng tích tụ.',
        'Ngồi bên khung cửa sổ nhìn giọt mưa đọng lại trên mặt kính, cảm nhận sự chậm lại của nhịp sống. Tự cho phép bản thân nghỉ ngơi là bước đầu tiên để chữa lành.',
        'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '6 hours',
        'Hình ảnh và ngôn từ sâu lắng.',
        NULL,
        FALSE,
        'PUBLIC',
        'Bình yên',
        '#63B3ED',
        64
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000002',
        5,
        'Lời cảm ơn gửi người thầy đầu tiên',
        'Hoàng Nam',
        FALSE,
        'Cảm ơn thầy đã dạy con cách đứng dậy sau những lần vấp ngã.',
        'Con vẫn nhớ bài học đầu tiên thầy dạy: Điểm số không định nghĩa giá trị con người em. Lời động viên ấy đã theo con suốt những năm tháng đại học.',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
        'PENDING',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE,
        'PUBLIC',
        'Tri ân',
        '#FC8181',
        18
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. BẢNG: artwork_interactions (5 Tương tác cảm xúc trên tác phẩm)
-- ====================================================================
INSERT INTO artwork_interactions (id, artwork_id, user_id, reaction_type)
VALUES 
    (
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'HUG'
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        'SYMPATHY'
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'HEART'
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000002',
        'INSPIRED'
    ),
    (
        'd0000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000003',
        'HEART'
    )
ON CONFLICT (artwork_id, user_id, reaction_type) DO NOTHING;

-- ====================================================================
-- 5. BẢNG: diaries (5 Nhật ký người dùng)
-- ====================================================================
INSERT INTO diaries (
    id, user_id, title, content, mood, media_urls, is_encrypted, is_public, is_approved, entry_date
)
VALUES 
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'Một ngày nhiều suy ngẫm',
        'Hôm nay dành trọn buổi tối để đọc cuốn sách yêu thích. Cảm thấy lòng dịu lại sau tuần làm việc mệt mỏi.',
        'Bình yên',
        '["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80"]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'Ghi chú mục tiêu cá nhân',
        'Tự nhủ phải chăm chỉ tập thể dục vào mỗi sáng và không thức khuya nữa.',
        'Quyết tâm',
        '[]'::jsonb,
        TRUE,
        FALSE,
        TRUE,
        CURRENT_DATE - INTERVAL '1 day'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000002',
        'Báo cáo tiến độ hoàn thành',
        'Cuối cùng cũng nộp xong đồ án kỳ này, cảm giác như trút được gánh nặng khổng lồ!',
        'Hạnh phúc',
        '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80"]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE - INTERVAL '2 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000003',
        'Hương hoa sữa đầu mùa',
        'Đi dạo trên con đường thân quen, mùi hoa thoang thoảng làm nhớ về những ký ức tuổi học trò.',
        'Hoài niệm',
        '[]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE - INTERVAL '3 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000003',
        'Bí mật riêng tư của tôi',
        'Có những nỗi niềm chưa thể nói thành lời với bất kỳ ai, xin gửi lại trang giấy này.',
        'Trầm tư',
        '[]'::jsonb,
        TRUE,
        FALSE,
        TRUE,
        CURRENT_DATE - INTERVAL '4 days'
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 6. BẢNG: diary_interactions (5 Tương tác trên nhật ký công khai)
-- ====================================================================
INSERT INTO diary_interactions (id, diary_id, user_id, reaction_type)
VALUES 
    (
        'f0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'HUG'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        'SYMPATHY'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000001',
        'HEART'
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000001',
        'HEART'
    ),
    (
        'f0000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000002',
        'HUG'
    )
ON CONFLICT (diary_id, user_id) DO NOTHING;

-- ====================================================================
-- 7. BẢNG: message_capsules (5 Thông điệp Máy nhả thông điệp)
-- ====================================================================
INSERT INTO message_capsules (id, author_id, author_role, message, category, is_approved, draw_count)
VALUES 
    (
        1,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Mọi vết nứt đều là nơi ánh sáng có thể len lỏi vào. Bạn đã làm rất tốt ngày hôm nay rồi!',
        'HEALING',
        TRUE,
        15
    ),
    (
        2,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Dũng cảm không phải là không sợ hãi, mà là bước tiếp ngay cả khi nỗi sợ vẫn còn đó.',
        'COURAGE',
        TRUE,
        28
    ),
    (
        3,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Cơn bão nào rồi cũng sẽ qua, sau cơn mưa bầu trời sẽ lại trong xanh và ấm áp.',
        'PERSPECTIVE',
        TRUE,
        42
    ),
    (
        4,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Hãy dịu dàng với chính mình, bạn đang tiến bộ hơn từng ngày dù đôi lúc không nhận ra.',
        'HEALING',
        TRUE,
        19
    ),
    (
        5,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Mỗi bước chân nhỏ bé hôm nay đang vẽ nên con đường tuyệt vời của tương lai.',
        'COURAGE',
        TRUE,
        33
    )
ON CONFLICT (id) DO UPDATE 
SET message = EXCLUDED.message, category = EXCLUDED.category;

SELECT setval(pg_get_serial_sequence('message_capsules', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM message_capsules;

-- ====================================================================
-- 8. BẢNG: user_capsule_draws (5 Lịch sử rút thông điệp)
-- ====================================================================
INSERT INTO user_capsule_draws (id, user_id, capsule_id, is_saved, drawn_at)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        1,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        2,
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000002',
        3,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000003',
        4,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000003',
        5,
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 9. BẢNG: notifications (5 Thông báo cho người dùng)
-- ====================================================================
INSERT INTO notifications (id, recipient_id, sender_id, type, title, body, target_url, is_read, created_at)
VALUES 
    (
        '20000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'INTERACTION',
        'Tương tác mới từ Hoàng Nam',
        'Hoàng Nam đã gửi một cái ôm đến bài viết của bạn tại Phòng Đổ Vỡ.',
        '/rooms/BROKEN',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        NULL,
        'CAPSULE',
        'Thông điệp chữa lành hôm nay',
        'Bạn đã rút được thông điệp số #3: Cơn bão nào rồi cũng sẽ qua...',
        '/capsules',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '18 hours'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'SYSTEM',
        'Bài viết đã được duyệt',
        'Tác phẩm "Những mảnh vỡ sau kỳ thi đại học" của bạn đã được kiểm duyệt thành công.',
        '/artworks/c0000000-0000-0000-0000-000000000001',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000003',
        NULL,
        'REMINDER',
        'Gợi ý viết nhật ký',
        'Bạn đã ghi lại cảm xúc của ngày hôm nay chưa? Hãy dành 5 phút viết nhật ký nhé.',
        '/diary/write',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '3 hours'
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000001',
        'INTERACTION',
        'Tương tác nhật ký từ Minh Tâm',
        'Minh Tâm đã bày tỏ cảm xúc yêu thích nhật ký công khai của bạn.',
        '/diaries/community',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 10. BẢNG: password_reset_tokens (5 Token đặt lại mật khẩu)
-- ====================================================================
INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
VALUES 
    (
        '30000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        CURRENT_TIMESTAMP + INTERVAL '1 hour',
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a',
        CURRENT_TIMESTAMP + INTERVAL '2 hours',
        CURRENT_TIMESTAMP - INTERVAL '30 minutes',
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003',
        'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b',
        CURRENT_TIMESTAMP + INTERVAL '1 day',
        NULL,
        CURRENT_TIMESTAMP
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000001',
        'd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b3c',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        NULL,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000002',
        'e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b3c4d',
        CURRENT_TIMESTAMP + INTERVAL '30 minutes',
        NULL,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 11. BẢNG: revoked_tokens (5 JWT Token bị thu hồi khi Logout)
-- ====================================================================
INSERT INTO revoked_tokens (jti, expires_at, revoked_at)
VALUES 
    (
        '9f1c2e3d4b5a46789abc0d1e2f300001',
        CURRENT_TIMESTAMP + INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    ),
    (
        '9f1c2e3d4b5a46789abc0d1e2f300002',
        CURRENT_TIMESTAMP + INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    ),
    (
        '9f1c2e3d4b5a46789abc0d1e2f300003',
        CURRENT_TIMESTAMP + INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '45 minutes'
    ),
    (
        '9f1c2e3d4b5a46789abc0d1e2f300004',
        CURRENT_TIMESTAMP + INTERVAL '3 days',
        CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ),
    (
        '9f1c2e3d4b5a46789abc0d1e2f300005',
        CURRENT_TIMESTAMP + INTERVAL '7 days',
        CURRENT_TIMESTAMP - INTERVAL '10 minutes'
    )
ON CONFLICT (jti) DO NOTHING;

-- ====================================================================
-- 12. BẢNG: admin_audit_logs (5 Nhật ký kiểm duyệt của Admin)
-- ====================================================================
INSERT INTO admin_audit_logs (
    id, artwork_id, artwork_title, room_id, admin_id, action_type, note, performed_at
)
VALUES 
    (
        '40000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'Những mảnh vỡ sau kỳ thi đại học',
        1,
        'a0000000-0000-0000-0000-000000000001',
        'APPROVE',
        'Phê duyệt bài viết: Nội dung chân thực, thông điệp tích cực.',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        'Nguyện ước gửi cánh hạc giấy',
        2,
        'a0000000-0000-0000-0000-000000000001',
        'APPROVE',
        'Phê duyệt bài viết phòng Hy Vọng.',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000003',
        'Bạn không hề đơn độc',
        3,
        'a0000000-0000-0000-0000-000000000002',
        'APPROVE_AND_UPLOAD_MEDIA',
        'Hỗ trợ tối ưu hóa ảnh bìa và phê duyệt phát hành lên phòng Cộng Đồng.',
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000004',
        'Chiều mưa bên góc quán quen',
        4,
        'a0000000-0000-0000-0000-000000000002',
        'APPROVE',
        'Phê duyệt bài viết cho phòng Chữa Lành.',
        CURRENT_TIMESTAMP - INTERVAL '6 hours'
    ),
    (
        '40000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000005',
        'Lời cảm ơn gửi người thầy đầu tiên',
        5,
        'a0000000-0000-0000-0000-000000000001',
        'UPDATE',
        'Cập nhật nhãn phân loại danh mục bài viết chuẩn chủ đề Tri ân.',
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;
