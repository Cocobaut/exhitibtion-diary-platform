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
-- Mật khẩu mặc định: OWNER và ADMIN dùng AdminPassword@2026, USER dùng UserPassword@2026
-- password_hash là bcrypt hash hợp lệ của chuỗi mật khẩu
-- ====================================================================
INSERT INTO users (id, username, email, password_hash, nickname, role, avatar_url, bio, theme_preference, is_active)
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
        'museum',
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
        'museum',
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
        'moss',
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
        'museum',
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
        'paper',
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
        'plum',
        TRUE
    ),
    (
        'b0000000-0000-0000-0000-000000000010',
        'hoanghon_01',
        'hoanghon@example.com',
        '$2b$12$rtwHcOnrPCbNqeiAslJW9.YImmcwCHYdqVesQ7//I4k8cOBMHlUoG',
        'Người Lữ Khách',
        'USER',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
        'Người lắng nghe những câu chuyện thầm kín bên hoàng hôn',
        'museum',
        TRUE
    )
ON CONFLICT (id) DO UPDATE 
SET nickname = EXCLUDED.nickname, bio = EXCLUDED.bio, theme_preference = EXCLUDED.theme_preference;

-- ====================================================================
-- 3. BẢNG: artworks (5 Tác phẩm trong các phòng triển lãm)
-- ====================================================================
INSERT INTO artworks (
    id, user_id, room_id, original_language, title, title_vi, title_en, author_display_name, is_anonymous, 
    short_content, short_content_vi, short_content_en, content, content_vi, content_en, media_url, status, reviewed_by, reviewed_at, 
    admin_note, target_date, is_opened, visibility, tag_category, color_code, view_count
)
VALUES 
    (
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        1,
        'vi',
        'Những mảnh vỡ sau kỳ thi đại học',
        'Những mảnh vỡ sau kỳ thi đại học',
        'Broken Pieces After the University Exam',
        'Minh Tâm',
        TRUE,
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng...',
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng...',
        'The shattered feeling of failing my first choice made me retreat for months...',
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng. Từng kỳ vọng của gia đình như tảng đá đè nặng lên vai. Nhưng hôm nay, tôi quyết định đối diện và chấp nhận vết nứt này như một phần của hành trình trưởng thành.',
        'Cảm giác vụn vỡ khi trượt nguyện vọng 1 đã khiến tôi thu mình suốt nhiều tháng. Từng kỳ vọng của gia đình như tảng đá đè nặng lên vai. Nhưng hôm nay, tôi quyết định đối diện và chấp nhận vết nứt này như một phần của hành trình trưởng thành.',
        'The shattered feeling of missing my top choice made me withdraw for months. Every expectation from family weighed like a boulder. But today, I decide to face and embrace this fracture as part of growing up.',
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
        'vi',
        'Nguyện ước gửi cánh hạc giấy',
        'Nguyện ước gửi cánh hạc giấy',
        'Wishes Sent with Paper Cranes',
        'Hoàng Nam',
        FALSE,
        'Gửi vào tương lai lời chúc cho bản thân kiên định với ngành Khoa học Máy tính.',
        'Gửi vào tương lai lời chúc cho bản thân kiên định với ngành Khoa học Máy tính.',
        'Sending into the future my wish to remain steadfast in Computer Science.',
        'Tôi đã gấp 100 con hạc giấy trước ngày nhận kết quả học bổng. Hy vọng ngọn đèn này sẽ thắp sáng ước mơ trở thành kỹ sư công nghệ cống hiến cho xã hội.',
        'Tôi đã gấp 100 con hạc giấy trước ngày nhận kết quả học bổng. Hy vọng ngọn đèn này sẽ thắp sáng ước mơ trở thành kỹ sư công nghệ cống hiến cho xã hội.',
        'I folded 100 paper cranes before the scholarship announcement. May this lantern illuminate my dream of becoming an engineer dedicated to society.',
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
        'vi',
        'Bạn không hề đơn độc',
        'Bạn không hề đơn độc',
        'You Are Never Alone',
        'Lan Anh',
        FALSE,
        'Nếu bạn đang cảm thấy mệt mỏi, hãy hít thở thật sâu và nhớ rằng luôn có người ủng hộ bạn.',
        'Nếu bạn đang cảm thấy mệt mỏi, hãy hít thở thật sâu và nhớ rằng luôn có người ủng hộ bạn.',
        'If you are feeling tired, take a deep breath and remember that someone is always cheering for you.',
        'Một chiếc ôm ấm áp gửi tới bất kỳ ai đang cảm thấy chênh vênh giữa dòng đời. Hãy nhớ rằng bầu trời sau cơn mưa bao giờ cũng rực rỡ nhất.',
        'Một chiếc ôm ấm áp gửi tới bất kỳ ai đang cảm thấy chênh vênh giữa dòng đời. Hãy nhớ rằng bầu trời sau cơn mưa bao giờ cũng rực rỡ nhất.',
        'A warm hug to anyone feeling adrift in life. Remember that the sky after the rain is always the most radiant.',
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
        'vi',
        'Chiều mưa bên góc quán quen',
        'Chiều mưa bên góc quán quen',
        'Rainy Afternoon at My Usual Spot',
        'Minh Tâm',
        FALSE,
        'Tách trà nóng và tiếng mưa rơi xoa dịu đi những căng thẳng tích tụ.',
        'Tách trà nóng và tiếng mưa rơi xoa dịu đi những căng thẳng tích tụ.',
        'A warm cup of tea and the sound of falling rain soothing accumulated stress.',
        'Ngồi bên khung cửa sổ nhìn giọt mưa đọng lại trên mặt kính, cảm nhận sự chậm lại của nhịp sống. Tự cho phép bản thân nghỉ ngơi là bước đầu tiên để chữa lành.',
        'Ngồi bên khung cửa sổ nhìn giọt mưa đọng lại trên mặt kính, cảm nhận sự chậm lại của nhịp sống. Tự cho phép bản thân nghỉ ngơi là bước đầu tiên để chữa lành.',
        'Sitting by the window watching raindrops settle on the glass, feeling the slow pace of life. Allowing oneself to rest is the first step toward healing.',
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
        'vi',
        'Lời cảm ơn gửi người thầy đầu tiên',
        'Lời cảm ơn gửi người thầy đầu tiên',
        'Gratitude to My First Teacher',
        'Hoàng Nam',
        FALSE,
        'Cảm ơn thầy đã dạy con cách đứng dậy sau những lần vấp ngã.',
        'Cảm ơn thầy đã dạy con cách đứng dậy sau những lần vấp ngã.',
        'Thank you teacher for showing me how to stand up after falling.',
        'Con vẫn nhớ bài học đầu tiên thầy dạy: Điểm số không định nghĩa giá trị con người em. Lời động viên ấy đã theo con suốt những năm tháng đại học.',
        'Con vẫn nhớ bài học đầu tiên thầy dạy: Điểm số không định nghĩa giá trị con người em. Lời động viên ấy đã theo con suốt những năm tháng đại học.',
        'I still remember your first lesson: Grades do not define your worth. That encouragement has stayed with me through university years.',
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
    ),
    -- ================================================================
    -- TÁC PHẨM CỦA hoanghon_01: PHÒNG 1 (ĐỔ VỠ - 5 Tác phẩm)
    -- ================================================================
    (
        'c0000000-0000-0000-0000-000000000011',
        'b0000000-0000-0000-0000-000000000010',
        1,
        'vi',
        'Chuyến tàu muộn và chiếc vé rách',
        'Chuyến tàu muộn và chiếc vé rách',
        'Late Train and the Torn Ticket',
        'Người Lữ Khách',
        FALSE,
        'Bỏ lỡ chuyến tàu cuối cùng đưa tôi rời khỏi thành phố đầy những kỷ niệm đau buồn...',
        'Bỏ lỡ chuyến tàu cuối cùng đưa tôi rời khỏi thành phố đầy những kỷ niệm đau buồn...',
        'Missing the last train that would take me away from the city filled with painful memories...',
        'Chiếc vé tàu ướt nhòe trong cơn mưa bất chợt. Đôi khi sự lỡ làng không phải là dấu chấm hết, mà là lời nhắc nhở ta cần dừng lại để đối diện với chính nỗi đau của mình.',
        'Chiếc vé tàu ướt nhòe trong cơn mưa bất chợt. Đôi khi sự lỡ làng không phải là dấu chấm hết, mà là lời nhắc nhở ta cần dừng lại để đối diện với chính nỗi đau của mình.',
        'The train ticket blurred in the sudden downpour. Sometimes missing out is not the end, but a reminder to pause and face our own pain.',
        'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        'Hình tượng chiếc vé tàu và sự lỡ làng rất xúc động.',
        NULL,
        FALSE,
        'PUBLIC',
        'Lỡ làng',
        '#4A5568',
        78
    ),
    (
        'c0000000-0000-0000-0000-000000000012',
        'b0000000-0000-0000-0000-000000000010',
        1,
        'vi',
        'Khoảng lặng giữa hai người từng thân',
        'Khoảng lặng giữa hai người từng thân',
        'The Silence Between Strangers Who Were Once Close',
        'Người Lữ Khách',
        TRUE,
        'Tình bạn nhiều năm tan vỡ chỉ vì những hiểu lầm không ai chịu mở lời giải thích...',
        'Tình bạn nhiều năm tan vỡ chỉ vì những hiểu lầm không ai chịu mở lời giải thích...',
        'A long-lasting friendship shattered simply because of unspoken misunderstandings...',
        'Chúng ta im lặng nhìn nhau bước qua dòng người đông đúc như hai kẻ xa lạ. Sự đổ vỡ của tình bạn nhiều khi để lại vết sẹo âm ỉ và nhức nhối hơn cả tình yêu.',
        'Chúng ta im lặng nhìn nhau bước qua dòng người đông đúc như hai kẻ xa lạ. Sự đổ vỡ của tình bạn nhiều khi để lại vết sẹo âm ỉ và nhức nhối hơn cả tình yêu.',
        'We walked past each other silently in the crowd like two strangers. The collapse of a friendship often leaves deeper and quieter scars than heartbreak.',
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Đồng cảm sâu sắc với tâm sự về tình bạn.',
        NULL,
        FALSE,
        'PUBLIC',
        'Tình bạn',
        '#718096',
        115
    ),
    (
        'c0000000-0000-0000-0000-000000000013',
        'b0000000-0000-0000-0000-000000000010',
        1,
        'vi',
        'Góc phòng tối và những đêm mất ngủ',
        'Góc phòng tối và những đêm mất ngủ',
        'The Dark Corner and Sleepless Nights',
        'Người Lữ Khách',
        FALSE,
        'Áp lực công việc đè nặng khiến giấc ngủ trở thành điều xa xỉ mỗi đêm...',
        'Áp lực công việc đè nặng khiến giấc ngủ trở thành điều xa xỉ mỗi đêm...',
        'Overwhelming work pressure turning sleep into a nightly luxury...',
        'Nhìn ánh đèn đường hắt qua khe cửa sổ, tôi nhận ra mình đã kiệt sức từ lâu. Nhận diện sự gục ngã là lúc tôi cho phép bản thân được nghỉ ngơi thực sự.',
        'Nhìn ánh đèn đường hắt qua khe cửa sổ, tôi nhận ra mình đã kiệt sức từ lâu. Nhận diện sự gục ngã là lúc tôi cho phép bản thân được nghỉ ngơi thực sự.',
        'Staring at the streetlights through the blinds, I realized I had been exhausted for so long. Acknowledging burnout is when I finally allow myself to rest.',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Thông điệp tích cực về việc chấp nhận nghỉ ngơi.',
        NULL,
        FALSE,
        'PUBLIC',
        'Áp lực',
        '#2D3748',
        92
    ),
    (
        'c0000000-0000-0000-0000-000000000014',
        'b0000000-0000-0000-0000-000000000010',
        1,
        'vi',
        'Tấm gương vỡ trong căn gác xép',
        'Tấm gương vỡ trong căn gác xép',
        'The Broken Mirror in the Attic',
        'Người Lữ Khách',
        FALSE,
        'Mỗi mảnh vỡ của tấm gương cũ phản chiếu một thời nông nổi đã qua...',
        'Mỗi mảnh vỡ của tấm gương cũ phản chiếu một thời nông nổi đã qua...',
        'Each shard of the old mirror reflects a reckless youthful memory...',
        'Tôi từng sợ nhìn vào những vết nứt, sợ thấy hình ảnh không hoàn hảo của mình. Nhưng giờ đây tôi hiểu, tấm gương vỡ vẫn có thể phản chiếu ánh mặt trời rực rỡ.',
        'Tôi từng sợ nhìn vào những vết nứt, sợ thấy hình ảnh không hoàn hảo của mình. Nhưng giờ đây tôi hiểu, tấm gương vỡ vẫn có thể phản chiếu ánh mặt trời rực rỡ.',
        'I used to fear the fractures, terrified of seeing my imperfect self. But now I know that even broken mirrors can still reflect the dazzling sunlight.',
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '18 hours',
        'Hình tượng ẩn dụ sâu sắc.',
        NULL,
        FALSE,
        'PUBLIC',
        'Vết thương',
        '#4A5568',
        53
    ),
    (
        'c0000000-0000-0000-0000-000000000015',
        'b0000000-0000-0000-0000-000000000010',
        1,
        'vi',
        'Lời tạm biệt chưa kịp nói',
        'Lời tạm biệt chưa kịp nói',
        'The Unspoken Goodbye',
        'Người Lữ Khách',
        TRUE,
        'Ngày người ấy rời đi, trời không mưa nhưng lòng tôi giông bão ngập tràn...',
        'Ngày người ấy rời đi, trời không mưa nhưng lòng tôi giông bão ngập tràn...',
        'On the day they left, it did not rain outside, but a thunderstorm raged in my heart...',
        'Có những cuộc chia ly diễn ra trong im lặng tuyệt đối. Viết ra dòng này là cách tôi đặt dấu chấm hết nhẹ nhàng cho một chương dang dở của cuộc đời.',
        'Có những cuộc chia ly diễn ra trong im lặng tuyệt đối. Viết ra dòng này là cách tôi đặt dấu chấm hết nhẹ nhàng cho một chương dang dở của cuộc đời.',
        'Some partings occur in absolute silence. Writing this down is how I gently close an unfinished chapter of my life.',
        'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '6 hours',
        'Ngôn từ nhẹ nhàng, xoa dịu nỗi đau.',
        NULL,
        FALSE,
        'PUBLIC',
        'Chia ly',
        '#A0AEC0',
        40
    ),
    -- ================================================================
    -- TÁC PHẨM CỦA hoanghon_01: PHÒNG 2 (HY VỌNG - 5 Lồng đèn)
    -- ================================================================
    (
        'c0000000-0000-0000-0000-000000000021',
        'b0000000-0000-0000-0000-000000000010',
        2,
        'vi',
        'Nguyện ước bình an cho gia đình',
        'Nguyện ước bình an cho gia đình',
        'A Wish of Peace for My Family',
        'Người Lữ Khách',
        FALSE,
        'Thắp ngọn đèn hy vọng gửi gắm sức khỏe và sự bình an tới cha mẹ phương xa...',
        'Thắp ngọn đèn hy vọng gửi gắm sức khỏe và sự bình an tới cha mẹ phương xa...',
        'Lighting a hope lantern sending health and peace to my parents far away...',
        'Mong cha mẹ luôn mạnh khỏe và an yên. Năm nay con nhất định sẽ về sớm để cùng cả nhà sum vầy bên mâm cơm ấm cúng.',
        'Mong cha mẹ luôn mạnh khỏe và an yên. Năm nay con nhất định sẽ về sớm để cùng cả nhà sum vầy bên mâm cơm ấm cúng.',
        'I pray that my parents stay healthy and tranquil. This year I will certainly return home early to gather around a warm family meal.',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Lồng đèn ấm áp tình cảm gia đình.',
        CURRENT_TIMESTAMP + INTERVAL '60 days',
        FALSE,
        'PUBLIC',
        'Gia đình',
        '#F6AD55',
        67
    ),
    (
        'c0000000-0000-0000-0000-000000000022',
        'b0000000-0000-0000-0000-000000000010',
        2,
        'vi',
        'Gửi tôi của ngày tốt nghiệp đại học',
        'Gửi tôi của ngày tốt nghiệp đại học',
        'To Me on Graduation Day',
        'Người Lữ Khách',
        FALSE,
        'Lồng đèn lưu giữ lời hứa không bao giờ từ bỏ đam mê nghiên cứu khoa học...',
        'Lồng đèn lưu giữ lời hứa không bao giờ từ bỏ đam mê nghiên cứu khoa học...',
        'A lantern holding the promise never to abandon the passion for scientific research...',
        'Chào tôi của hai năm nữa! Hãy nhớ lại những đêm miệt mài trong phòng lab này nhé. Bạn đã đi một chặng đường dài và làm rất tốt.',
        'Chào tôi của hai năm nữa! Hãy nhớ lại những đêm miệt mài trong phòng lab này nhé. Bạn đã đi một chặng đường dài và làm rất tốt.',
        'Hello to me two years from now! Remember the tireless nights in this lab. You have come a long way and done wonderfully.',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Mục tiêu học tập rõ ràng, tích cực.',
        CURRENT_TIMESTAMP + INTERVAL '300 days',
        FALSE,
        'PUBLIC',
        'Học tập',
        '#4FD1C5',
        85
    ),
    (
        'c0000000-0000-0000-0000-000000000023',
        'b0000000-0000-0000-0000-000000000010',
        2,
        'vi',
        'Bức thư bí mật gửi chính tôi tuổi 30',
        'Bức thư bí mật gửi chính tôi tuổi 30',
        'A Secret Letter to Myself at 30',
        'Người Lữ Khách',
        FALSE,
        'Tâm sự riêng tư về ước mơ lập nghiệp và tìm thấy người bạn đồng hành...',
        'Tâm sự riêng tư về ước mơ lập nghiệp và tìm thấy người bạn đồng hành...',
        'Private reflections on starting a business and finding a true life partner...',
        'Tuổi 30 có thể nhiều âu lo, nhưng hy vọng bạn vẫn giữ được trái tim ấm áp và sự nhiệt huyết như tuổi đôi mươi ngày hôm nay.',
        'Tuổi 30 có thể nhiều âu lo, nhưng hy vọng bạn vẫn giữ được trái tim ấm áp và sự nhiệt huyết như tuổi đôi mươi ngày hôm nay.',
        'Turning 30 might bring worries, but I hope you still preserve a warm heart and the same fiery passion as in your twenties.',
        NULL,
        'APPROVED',
        NULL,
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        NULL,
        CURRENT_TIMESTAMP + INTERVAL '730 days',
        FALSE,
        'PRIVATE',
        'Riêng tư',
        '#9F7AEA',
        1
    ),
    (
        'c0000000-0000-0000-0000-000000000024',
        'b0000000-0000-0000-0000-000000000010',
        2,
        'vi',
        'Lời chúc mùa thi đỗ đạt',
        'Lời chúc mùa thi đỗ đạt',
        'Wishes for Exam Season Success',
        'Người Lữ Khách',
        TRUE,
        'Lồng đèn công khai đã đến hạn mở, gửi lời chúc may mắn tới các sĩ tử...',
        'Lồng đèn công khai đã đến hạn mở, gửi lời chúc may mắn tới các sĩ tử...',
        'An unlocked public lantern sending luck and confidence to all candidates...',
        'Chúc mọi nỗ lực của các bạn trong suốt 12 năm đèn sách đều được đền đáp xứng đáng. Tự tin bước vào phòng thi và tỏa sáng nhé!',
        'Chúc mọi nỗ lực của các bạn trong suốt 12 năm đèn sách đều được đền đáp xứng đáng. Tự tin bước vào phòng thi và tỏa sáng nhé!',
        'May all your efforts across twelve years of study be rewarded deservedly. Enter the exam room with pride and shine bright!',
        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '10 days',
        'Lồng đèn đã mở khóa cho mọi người cùng đọc.',
        CURRENT_TIMESTAMP - INTERVAL '5 days',
        TRUE,
        'PUBLIC',
        'Khích lệ',
        '#ECC94B',
        124
    ),
    (
        'c0000000-0000-0000-0000-000000000025',
        'b0000000-0000-0000-0000-000000000010',
        2,
        'vi',
        'Hành trình mở tiệm sách nhỏ',
        'Hành trình mở tiệm sách nhỏ',
        'The Journey to Open a Cozy Bookstore',
        'Người Lữ Khách',
        FALSE,
        'Ước nguyện xây dựng một góc đọc sách yên bình giữa lòng thành phố náo nhiệt...',
        'Ước nguyện xây dựng một góc đọc sách yên bình giữa lòng thành phố náo nhiệt...',
        'A dream of creating a quiet reading sanctuary amid the bustling city...',
        'Một tiệm sách nhỏ thơm mùi cà phê và giấy mới, nơi ai cũng có thể ghé vào trú chân những chiều mưa rào. Hy vọng ước mơ này sẽ sớm thành hiện thực.',
        'Một tiệm sách nhỏ thơm mùi cà phê và giấy mới, nơi ai cũng có thể ghé vào trú chân những chiều mưa rào. Hy vọng ước mơ này sẽ sớm thành hiện thực.',
        'A small bookstore smelling of fresh coffee and new pages, where anyone can seek shelter on rainy afternoons. May this dream blossom soon.',
        'https://images.unsplash.com/photo-1507842229450-7990c37c2a7f?auto=format&fit=crop&w=600&q=80',
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Ước mơ văn hóa rất đáng trân trọng.',
        CURRENT_TIMESTAMP + INTERVAL '180 days',
        FALSE,
        'PUBLIC',
        'Ước mơ',
        '#ED8936',
        45
    ),
    -- ================================================================
    -- TÁC PHẨM CỦA hoanghon_01: PHÒNG 3 (CỘNG ĐỒNG - 5 Dải lụa)
    -- ================================================================
    (
        'c0000000-0000-0000-0000-000000000031',
        'b0000000-0000-0000-0000-000000000010',
        3,
        'vi',
        'Bạn đã vượt qua rất nhiều điều kỳ diệu',
        'Bạn đã vượt qua rất nhiều điều kỳ diệu',
        'You Have Overcome Many Miraculous Things',
        'Người Lữ Khách',
        FALSE,
        'Mỗi bước đi dù nhỏ bé cũng là một chiến thắng đáng tự hào của bạn hôm nay...',
        'Mỗi bước đi dù nhỏ bé cũng là một chiến thắng đáng tự hào của bạn hôm nay...',
        'Every step, however small, is a proud victory of yours today...',
        'Đừng so sánh bước tiến của mình với người khác. Mỗi bông hoa nở rộ theo mùa riêng của nó. Hãy tự hào về sự kiên cường của chính bạn!',
        'Đừng so sánh bước tiến của mình với người khác. Mỗi bông hoa nở rộ theo mùa riêng của nó. Hãy tự hào về sự kiên cường của chính bạn!',
        'Never compare your pace with others. Every flower blooms in its own season. Be profoundly proud of your inner resilience!',
        NULL,
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        'Thông điệp khích lệ rất truyền cảm.',
        NULL,
        FALSE,
        'PUBLIC',
        'ENCOURAGEMENT',
        '#FFD700',
        156
    ),
    (
        'c0000000-0000-0000-0000-000000000032',
        'b0000000-0000-0000-0000-000000000010',
        3,
        'vi',
        'Thở chậm lại và tha thứ cho chính mình',
        'Thở chậm lại và tha thứ cho chính mình',
        'Breathe Slowly and Forgive Yourself',
        'Người Lữ Khách',
        TRUE,
        'Cho phép bản thân được sai lầm và học cách đón nhận những khiếm khuyết...',
        'Cho phép bản thân được sai lầm và học cách đón nhận những khiếm khuyết...',
        'Allow yourself to make mistakes and learn to embrace all imperfections...',
        'Không ai có thể hoàn hảo trong mọi quyết định. Hãy ôm lấy đứa trẻ bên trong bạn, thủ thỉ rằng bạn đã cố gắng hết sức rồi.',
        'Không ai có thể hoàn hảo trong mọi quyết định. Hãy ôm lấy đứa trẻ bên trong bạn, thủ thỉ rằng bạn đã cố gắng hết sức rồi.',
        'Nobody can make perfect choices every time. Embrace your inner child and whisper softly that you did your very best.',
        NULL,
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        'Lời chữa lành sâu sắc.',
        NULL,
        FALSE,
        'PUBLIC',
        'HEALING',
        '#98FB98',
        98
    ),
    (
        'c0000000-0000-0000-0000-000000000033',
        'b0000000-0000-0000-0000-000000000010',
        3,
        'vi',
        'Biết ơn tách cà phê sớm và ánh nắng ban mai',
        'Biết ơn tách cà phê sớm và ánh nắng ban mai',
        'Grateful for Morning Coffee and Golden Sunlight',
        'Người Lữ Khách',
        FALSE,
        'Hạnh phúc giản đơn bắt đầu từ những điều nhỏ bé diễn ra xung quanh ta mỗi ngày...',
        'Hạnh phúc giản đơn bắt đầu từ những điều nhỏ bé diễn ra xung quanh ta mỗi ngày...',
        'Simple happiness begins with tiny blessings surrounding us every single day...',
        'Cảm ơn vì sớm mai thức dậy vẫn thấy gia đình bình yên, vẫn được hít thở bầu không khí trong lành và bắt đầu một ngày mới đầy hy vọng.',
        'Cảm ơn vì sớm mai thức dậy vẫn thấy gia đình bình yên, vẫn được hít thở bầu không khí trong lành và bắt đầu một ngày mới đầy hy vọng.',
        'Thankful to wake up knowing my family is safe, breathing fresh morning air, and starting a brand new day brimming with hope.',
        NULL,
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'Lòng biết ơn mang năng lượng an lành.',
        NULL,
        FALSE,
        'PUBLIC',
        'GRATITUDE',
        '#FFB6C1',
        112
    ),
    (
        'c0000000-0000-0000-0000-000000000034',
        'b0000000-0000-0000-0000-000000000010',
        3,
        'vi',
        'Cơn mưa rào giúp rửa trôi bụi bặm',
        'Cơn mưa rào giúp rửa trôi bụi bặm',
        'The Heavy Rain Washes Away the Dust',
        'Người Lữ Khách',
        FALSE,
        'Nhìn nhận những trắc trở như cơ hội quý giá để ta thanh lọc tâm hồn...',
        'Nhìn nhận những trắc trở như cơ hội quý giá để ta thanh lọc tâm hồn...',
        'Viewing hardships as precious opportunities to cleanse and purify the soul...',
        'Khi gặp khó khăn, thay vì hỏi tại sao lại là mình, hãy thử nghĩ xem cuộc đời đang muốn dạy cho ta bài học gì. Góc nhìn thay đổi, thế giới sẽ đổi thay.',
        'Khi gặp khó khăn, thay vì hỏi tại sao lại là mình, hãy thử nghĩ xem cuộc đời đang muốn dạy cho ta bài học gì. Góc nhìn thay đổi, thế giới sẽ đổi thay.',
        'When facing hardship, instead of asking why me, consider what lesson life is teaching you. Shift your perspective, and the whole world shifts.',
        NULL,
        'APPROVED',
        'a0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '16 hours',
        'Góc nhìn cuộc sống bao dung và thông tuệ.',
        NULL,
        FALSE,
        'PUBLIC',
        'PERSPECTIVE',
        '#87CEFA',
        88
    ),
    (
        'c0000000-0000-0000-0000-000000000035',
        'b0000000-0000-0000-0000-000000000010',
        3,
        'vi',
        'Những vết thương rồi sẽ nở thành hoa',
        'Những vết thương rồi sẽ nở thành hoa',
        'Wounds Will Eventually Blossom Into Flowers',
        'Người Lữ Khách',
        TRUE,
        'Gửi tặng bạn nguồn năng lượng ấm áp nhất sau những tổn thương đã qua...',
        'Gửi tặng bạn nguồn năng lượng ấm áp nhất sau những tổn thương đã qua...',
        'Sending you the warmest healing energy after everything you have endured...',
        'Vết nứt chính là nơi ánh sáng tràn vào. Chúc bạn có đủ can đảm để đón nhận sự chữa lành và bước tiếp một cách kiêu hãnh.',
        'Vết nứt chính là nơi ánh sáng tràn vào. Chúc bạn có đủ can đảm để đón nhận sự chữa lành và bước tiếp một cách kiêu hãnh.',
        'The crack is where the light enters you. May you have the courage to embrace healing and walk forward with proud confidence.',
        NULL,
        'APPROVED',
        'a0000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP - INTERVAL '4 hours',
        'Thông điệp khép lại một ngày rất đẹp.',
        NULL,
        FALSE,
        'PUBLIC',
        'HEALING',
        '#98FB98',
        140
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
    id, user_id, original_language, title, title_vi, title_en, content, content_vi, content_en, mood, media_urls, is_encrypted, is_public, is_approved, entry_date
)
VALUES 
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'vi',
        'Một ngày nhiều suy ngẫm',
        'Một ngày nhiều suy ngẫm',
        'A Day of Deep Reflection',
        'Hôm nay dành trọn buổi tối để đọc cuốn sách yêu thích. Cảm thấy lòng dịu lại sau tuần làm việc mệt mỏi.',
        'Hôm nay dành trọn buổi tối để đọc cuốn sách yêu thích. Cảm thấy lòng dịu lại sau tuần làm việc mệt mỏi.',
        'Spent the entire evening reading my favorite book today. Feeling serene and recharged after a grueling workweek.',
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
        'vi',
        'Ghi chú mục tiêu cá nhân',
        'Ghi chú mục tiêu cá nhân',
        'Notes on Personal Goals',
        'Tự nhủ phải chăm chỉ tập thể dục vào mỗi sáng và không thức khuya nữa.',
        'Tự nhủ phải chăm chỉ tập thể dục vào mỗi sáng và không thức khuya nữa.',
        'Reminding myself to exercise diligently every morning and stop staying up late.',
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
        'vi',
        'Báo cáo tiến độ hoàn thành',
        'Báo cáo tiến độ hoàn thành',
        'Progress Report Completed',
        'Cuối cùng cũng nộp xong đồ án kỳ này, cảm giác như trút được gánh nặng khổng lồ!',
        'Cuối cùng cũng nộp xong đồ án kỳ này, cảm giác như trút được gánh nặng khổng lồ!',
        'Finally submitted my term project, feels like a huge weight lifted off my shoulders!',
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
        'vi',
        'Hương hoa sữa đầu mùa',
        'Hương hoa sữa đầu mùa',
        'Early Season Milk Flower Fragrance',
        'Đi dạo trên con đường thân quen, mùi hoa thoang thoảng làm nhớ về những ký ức tuổi học trò.',
        'Đi dạo trên con đường thân quen, mùi hoa thoang thoảng làm nhớ về những ký ức tuổi học trò.',
        'Strolling along the familiar road, the subtle scent of milk flowers brings back fond school memories.',
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
        'vi',
        'Bí mật riêng tư của tôi',
        'Bí mật riêng tư của tôi',
        'My Private Secret',
        'Có những nỗi niềm chưa thể nói thành lời với bất kỳ ai, xin gửi lại trang giấy này.',
        'Có những nỗi niềm chưa thể nói thành lời với bất kỳ ai, xin gửi lại trang giấy này.',
        'There are feelings that words cannot express to anyone, let them rest on this page.',
        'Trầm tư',
        '[]'::jsonb,
        TRUE,
        FALSE,
        TRUE,
        CURRENT_DATE - INTERVAL '4 days'
    ),
    -- NHẬT KÝ CỦA hoanghon_01 (5 Nhật ký cá nhân & cộng đồng)
    (
        'e0000000-0000-0000-0000-000000000011',
        'b0000000-0000-0000-0000-000000000010',
        'vi',
        'Chiều hoàng hôn bên bờ sông Sài Gòn',
        'Chiều hoàng hôn bên bờ sông Sài Gòn',
        'Sunset Afternoon by Saigon River',
        'Ánh hoàng hôn buông xuống nhuộm đỏ cả một góc trời. Đứng giữa dòng xe cộ hối hả, chợt thấy lòng mình chậm lại một nhịp, bình yên đến lạ kỳ.',
        'Ánh hoàng hôn buông xuống nhuộm đỏ cả một góc trời. Đứng giữa dòng xe cộ hối hả, chợt thấy lòng mình chậm lại một nhịp, bình yên đến lạ kỳ.',
        'The twilight fell, painting a corner of the sky in deep crimson. Standing amid the rushing traffic, I felt my heart slow down, embracing a strange sense of peace.',
        'calm',
        '["https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80"]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE
    ),
    (
        'e0000000-0000-0000-0000-000000000012',
        'b0000000-0000-0000-0000-000000000010',
        'vi',
        'Tách cà phê và những trang sách dang dở',
        'Tách cà phê và những trang sách dang dở',
        'A Cup of Coffee and Unfinished Pages',
        'Tìm một góc nhỏ tĩnh lặng trong quán quen, nhâm nhi vị đắng ngọt của cà phê và đọc tiếp cuốn sách còn dở. Những ý tưởng mới mẻ bắt đầu nhen nhóm.',
        'Tìm một góc nhỏ tĩnh lặng trong quán quen, nhâm nhi vị đắng ngọt của cà phê và đọc tiếp cuốn sách còn dở. Những ý tưởng mới mẻ bắt đầu nhen nhóm.',
        'Found a quiet corner in my favorite cafe, sipping the bittersweet coffee and continuing an unfinished book. Fresh ideas began to spark.',
        'reflective',
        '["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80"]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE - INTERVAL '1 day'
    ),
    (
        'e0000000-0000-0000-0000-000000000013',
        'b0000000-0000-0000-0000-000000000010',
        'vi',
        'Những suy tư chưa thể gọi tên',
        'Những suy tư chưa thể gọi tên',
        'Thoughts Yet to Be Named',
        'Có những ngày tâm trạng chùng xuống mà chẳng rõ lý do. Tự nhủ rằng mọi cảm xúc đều có giá trị riêng, và cho phép bản thân được nghỉ ngơi một chút.',
        'Có những ngày tâm trạng chùng xuống mà chẳng rõ lý do. Tự nhủ rằng mọi cảm xúc đều có giá trị riêng, và cho phép bản thân được nghỉ ngơi một chút.',
        'There are days when my mood dips for no apparent reason. I remind myself that every emotion has its own value, and allow myself a brief rest.',
        'melancholy',
        '[]'::jsonb,
        FALSE,
        FALSE,
        TRUE,
        CURRENT_DATE - INTERVAL '2 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000014',
        'b0000000-0000-0000-0000-000000000010',
        'vi',
        'Biết ơn một ngày đầy ắp nụ cười',
        'Biết ơn một ngày đầy ắp nụ cười',
        'Grateful for a Day Full of Smiles',
        'Gặp lại những người bạn cũ sau nhiều năm xa cách. Dù ai cũng có lối đi riêng nhưng sự chân thành và những tiếng cười giòn giã vẫn vẹn nguyên như thuở ban đầu.',
        'Gặp lại những người bạn cũ sau nhiều năm xa cách. Dù ai cũng có lối đi riêng nhưng sự chân thành và những tiếng cười giòn giã vẫn vẹn nguyên như thuở ban đầu.',
        'Reunited with old friends after years apart. Though everyone walks their own path, sincerity and ringing laughter remain just as pure as in the beginning.',
        'grateful',
        '["https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80"]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE - INTERVAL '3 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000015',
        'b0000000-0000-0000-0000-000000000010',
        'vi',
        'Kế hoạch hành trình mới',
        'Kế hoạch hành trình mới',
        'Plan for a New Journey',
        'Đặt bút viết ra những dự định cho chặng đường sắp tới. Một chuyến đi xa để đón nhận những chân trời mới và tìm lại nguồn cảm hứng sáng tạo.',
        'Đặt bút viết ra những dự định cho chặng đường sắp tới. Một chuyến đi xa để đón nhận những chân trời mới và tìm lại nguồn cảm hứng sáng tạo.',
        'Penciling down plans for the journey ahead. A long trip to embrace new horizons and rediscover creative inspiration.',
        'hopeful',
        '[]'::jsonb,
        FALSE,
        TRUE,
        TRUE,
        CURRENT_DATE - INTERVAL '5 days'
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
INSERT INTO message_capsules (id, author_id, author_role, message, message_vi, message_en, category, is_approved, draw_count)
VALUES 
    (
        1,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Mọi vết nứt đều là nơi ánh sáng có thể len lỏi vào. Bạn đã làm rất tốt ngày hôm nay rồi!',
        'Mọi vết nứt đều là nơi ánh sáng có thể len lỏi vào. Bạn đã làm rất tốt ngày hôm nay rồi!',
        'Every crack is where the light gets in. You did very well today!',
        'HEALING',
        TRUE,
        15
    ),
    (
        2,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Dũng cảm không phải là không sợ hãi, mà là bước tiếp ngay cả khi nỗi sợ vẫn còn đó.',
        'Dũng cảm không phải là không sợ hãi, mà là bước tiếp ngay cả khi nỗi sợ vẫn còn đó.',
        'Courage is not the absence of fear, but taking the next step even when fear remains.',
        'COURAGE',
        TRUE,
        28
    ),
    (
        3,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Cơn bão nào rồi cũng sẽ qua, sau cơn mưa bầu trời sẽ lại trong xanh và ấm áp.',
        'Cơn bão nào rồi cũng sẽ qua, sau cơn mưa bầu trời sẽ lại trong xanh và ấm áp.',
        'Every storm will pass; after the rain, the sky will be bright and warm once more.',
        'PERSPECTIVE',
        TRUE,
        42
    ),
    (
        4,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Hãy dịu dàng với chính mình, bạn đang tiến bộ hơn từng ngày dù đôi lúc không nhận ra.',
        'Hãy dịu dàng với chính mình, bạn đang tiến bộ hơn từng ngày dù đôi lúc không nhận ra.',
        'Be gentle with yourself; you are progressing each day even when you do not realize it.',
        'HEALING',
        TRUE,
        19
    ),
    (
        5,
        'a0000000-0000-0000-0000-000000000001',
        'ADMIN',
        'Mỗi bước chân nhỏ bé hôm nay đang vẽ nên con đường tuyệt vời của tương lai.',
        'Mỗi bước chân nhỏ bé hôm nay đang vẽ nên con đường tuyệt vời của tương lai.',
        'Every small step today is paving a wonderful path for tomorrow.',
        'COURAGE',
        TRUE,
        33
    )
ON CONFLICT (id) DO UPDATE 
SET message = EXCLUDED.message, message_vi = EXCLUDED.message_vi, message_en = EXCLUDED.message_en, category = EXCLUDED.category;

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
    ),
    (
        '10000000-0000-0000-0000-000000000011',
        'b0000000-0000-0000-0000-000000000010',
        1,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '10000000-0000-0000-0000-000000000012',
        'b0000000-0000-0000-0000-000000000010',
        2,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '10000000-0000-0000-0000-000000000013',
        'b0000000-0000-0000-0000-000000000010',
        3,
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '6 hours'
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
    ),
    (
        '20000000-0000-0000-0000-000000000011',
        'b0000000-0000-0000-0000-000000000010',
        'b0000000-0000-0000-0000-000000000001',
        'INTERACTION',
        'Có người vừa gửi đồng cảm đến bạn',
        'Một người bạn vừa gửi một cái ôm đến bài viết của bạn tại Phòng Đổ Vỡ.',
        '/rooms/BROKEN',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    ),
    (
        '20000000-0000-0000-0000-000000000012',
        'b0000000-0000-0000-0000-000000000010',
        NULL,
        'CAPSULE',
        'Thông điệp hy vọng mới',
        'Bạn đã rút được thông điệp số #1: Hãy tin vào chính mình...',
        '/capsules',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '5 hours'
    ),
    (
        '20000000-0000-0000-0000-000000000013',
        'b0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000001',
        'SYSTEM',
        'Tác phẩm đã được duyệt',
        'Tác phẩm của bạn tại Phòng Hy Vọng đã được Ban Quản Trị phê duyệt trưng bày.',
        '/rooms/HOPE',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '20000000-0000-0000-0000-000000000014',
        'b0000000-0000-0000-0000-000000000010',
        NULL,
        'REMINDER',
        'Gợi ý viết nhật ký hôm nay',
        'Đã đến lúc ngồi lại và viết vài dòng nhật ký cho ngày hôm nay rồi bạn nhé.',
        '/diary/write',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ),
    (
        '20000000-0000-0000-0000-000000000015',
        'b0000000-0000-0000-0000-000000000010',
        'b0000000-0000-0000-0000-000000000002',
        'INTERACTION',
        'Tương tác từ Người Bạn Mới',
        'Hoàng Nam đã bày tỏ cảm xúc yêu thích nhật ký cộng đồng của bạn.',
        '/diaries/community',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '3 days'
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

-- ====================================================================
-- 13. BẢNG: user_saved_artworks (Dữ liệu mẫu lưu thư lồng đèn vào sổ tay)
-- ====================================================================
INSERT INTO user_saved_artworks (id, user_id, artwork_id, saved_at)
VALUES 
    (
        '50000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '50000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
    ),
    (
        '50000000-0000-0000-0000-000000000011',
        'b0000000-0000-0000-0000-000000000010',
        'c0000000-0000-0000-0000-000000000002',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        '50000000-0000-0000-0000-000000000012',
        'b0000000-0000-0000-0000-000000000010',
        'c0000000-0000-0000-0000-000000000021',
        CURRENT_TIMESTAMP - INTERVAL '4 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 14. BẢNG: ai_provider_settings (Khởi tạo cấu hình mặc định cho AI Copilot)
-- ====================================================================
INSERT INTO ai_provider_settings (
    id,
    is_ai_enabled,
    is_moderation_enabled,
    moderation_provider,
    moderation_base_url,
    moderation_encrypted_api_key,
    moderation_model_name,
    is_image_gen_enabled,
    image_provider,
    image_base_url,
    image_encrypted_api_key,
    image_model_name,
    max_tokens_per_req,
    temperature,
    updated_by_user_id
)
SELECT 
    'e0000000-0000-0000-0000-000000000001'::uuid,
    FALSE,
    TRUE,
    'gemini',
    NULL,
    NULL,
    'gemini-2.5-flash',
    TRUE,
    'gemini',
    NULL,
    NULL,
    'imagen-3.0-generate-002',
    2048,
    0.20,
    id
FROM users WHERE role = 'OWNER' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 15. BẢNG: bad_words (Từ điển từ ngữ vi phạm & biến thể teencode/leet)
-- ====================================================================
INSERT INTO bad_words (term, language, category, base_penalty, variants, is_active)
VALUES 
    ('địt', 'vi', 'profanity_severe', 20, '["dit", "djt", "d!t", "d1t", "đ!t", "d*t"]'::jsonb, TRUE),
    ('đụ', 'vi', 'profanity_severe', 20, '["du", "đù", "đệt", "đéo", "đéch", "đách", "deo", "đ3o"]'::jsonb, TRUE),
    ('đụ má', 'vi', 'profanity_severe', 25, '["duma", "dume", "đuma", "đù má", "du me", "du ma", "du moẹ", "đệt mợ"]'::jsonb, TRUE),
    ('địt con mẹ', 'vi', 'profanity_severe', 25, '["dm", "dmm", "dcm", "đkm", "đcm", "đmm", "dckm", "cđmm", "d.m", "d_m", "đ.m", "d0 me"]'::jsonb, TRUE),
    ('lồn', 'vi', 'profanity_severe', 20, '["lon", "l0n", "l*n", "l**n", "l.o.n", "cl", "vl", "vcl", "vkl", "clgt", "vclgt", "ncl", "hãm l", "ngu l", "sml"]'::jsonb, TRUE),
    ('cặc', 'vi', 'profanity_severe', 20, '["cac", "kac", "kax", "cc", "cb", "c@c", "k@c", "c.a.c"]'::jsonb, TRUE),
    ('buồi', 'vi', 'profanity_severe', 20, '["buoi", "b**i", "b***i"]'::jsonb, TRUE),
    ('dái', 'vi', 'profanity_severe', 15, '["dai", "d*i"]'::jsonb, TRUE),
    ('óc chó', 'vi', 'insult_intellect', 15, '["oc cho", "occho", "0c ch0", "oc ch0", "nao cho", "não chó", "não bò", "óc bò"]'::jsonb, TRUE),
    ('súc vật', 'vi', 'insult_intellect', 15, '["suc vat", "súc sinh", "suc sinh", "s.v", "sv", "suck vat", "bọ súc sinh"]'::jsonb, TRUE),
    ('bại não', 'vi', 'insult_intellect', 15, '["bai nao", "bn", "não tàn", "nao tan", "nt", "ngu hoc", "ngu si", "thần kinh", "dở người"]'::jsonb, TRUE),
    ('phò', 'vi', 'derogatory_sexual', 20, '["pho", "4", "công nhân nghành", "cave", "đĩ", "dj~", "d~i~", "p-h-o", "phò phạch", "đĩ thỏa", "đĩ mẹ"]'::jsonb, TRUE),
    ('bê đê', 'vi', 'derogatory_sexual', 20, '["be de", "bóng chó", "bóng xà bang", "gay lọ", "les rác"]'::jsonb, TRUE),
    ('gạ chịch', 'vi', 'derogatory_sexual', 20, '["chịch", "chich", "ga chich", "chịch dạo"]'::jsonb, TRUE),
    ('body shaming', 'vi', 'insult_bodyshaming', 15, '["mập như lợn", "béo như chó", "xấu ma chê quỷ hờn", "dị tật"]'::jsonb, TRUE),
    ('vãi đái', 'vi', 'profanity_mild', 10, '["vđ", "vai dai", "vãi lúa", "vãi chưởng", "vch", "vãi nồi", "vãi cả chưởng"]'::jsonb, TRUE),
    ('đéo cần', 'vi', 'profanity_mild', 10, '["dell", "đíu", "đéch cần", "mé nó", "má nó", "me no", "ma no", "bực vkl", "cay mắt"]'::jsonb, TRUE),
    ('xàm lồn', 'vi', 'profanity_mild', 10, '["xàm l", "xam lon", "xàm xí", "rác rưởi", "nát vcl"]'::jsonb, TRUE),
    ('fuck', 'en', 'profanity_severe', 20, '["f*ck", "f**k", "fu*k", "fvk", "fck", "f u c k", "fucking", "fucked", "fucker", "motherfucker", "mf"]'::jsonb, TRUE),
    ('shit', 'en', 'profanity_mild', 10, '["sh*t", "sh!t", "s.h.i.t", "bullshit", "bs"]'::jsonb, TRUE),
    ('bitch', 'en', 'insult_derogatory', 15, '["b!tch", "b*tch", "b1tch", "biatch", "btch", "son of a bitch", "sob"]'::jsonb, TRUE),
    ('asshole', 'en', 'profanity_severe', 15, '["a$$", "a$$hole", "ass", "asshole"]'::jsonb, TRUE),
    ('cunt', 'en', 'profanity_severe', 20, '["c*nt", "cunt"]'::jsonb, TRUE),
    ('dick', 'en', 'profanity_severe', 15, '["d!ck", "dick", "cock", "prick", "bastard", "pussy"]'::jsonb, TRUE),
    ('internet_slang_severe', 'en', 'profanity_severe', 15, '["wtf", "wth", "fml", "stfu", "gtfo", "ffs"]'::jsonb, TRUE),
    ('nigger', 'en', 'hate_speech', 30, '["nigga", "n1gga", "n!gger", "n*gger", "chink"]'::jsonb, TRUE),
    ('faggot', 'en', 'hate_speech', 30, '["fag", "dyke", "retard", "spastic"]'::jsonb, TRUE),
    ('slut', 'en', 'hate_speech', 25, '["whore", "skank", "thot"]'::jsonb, TRUE),
    ('minor_slang', 'en', 'profanity_mild', 5, '["damn", "damn it", "hell", "crap", "suck", "sucks", "idiot", "moron", "loser", "jerk", "douche", "dumbass", "piss", "pissed off"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;



