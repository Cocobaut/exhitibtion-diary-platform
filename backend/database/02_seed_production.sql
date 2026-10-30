-- ====================================================================
-- DỮ LIỆU KHỞI TẠO CHO PRODUCTION
-- Chỉ gồm dữ liệu hệ thống: phòng, kho lời nhắn hòm thư và từ điển từ ngữ vi phạm.
-- Cấu hình AI được app tự tạo (đang tắt) khi Owner mở trang cài đặt. KHÔNG có tài khoản hay bài viết mẫu.
-- Tạo tài khoản OWNER sau khi deploy: docker compose exec backend python -m scripts.create_owner
-- (Bản demo đầy đủ có tài khoản mẫu nằm ở 02_seed.sql, chỉ dùng cho môi trường dev.)
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
-- 7. BẢNG: message_capsules (5 Thông điệp Máy nhả thông điệp)
-- ====================================================================
INSERT INTO message_capsules (id, author_id, author_role, message, message_vi, message_en, category, is_approved, draw_count)
VALUES 
    (
        1,
        NULL,
        NULL,
        'Mọi vết nứt đều là nơi ánh sáng có thể len lỏi vào. Bạn đã làm rất tốt ngày hôm nay rồi!',
        'Mọi vết nứt đều là nơi ánh sáng có thể len lỏi vào. Bạn đã làm rất tốt ngày hôm nay rồi!',
        'Every crack is where the light gets in. You did very well today!',
        'HEALING',
        TRUE,
        0
    ),
    (
        2,
        NULL,
        NULL,
        'Dũng cảm không phải là không sợ hãi, mà là bước tiếp ngay cả khi nỗi sợ vẫn còn đó.',
        'Dũng cảm không phải là không sợ hãi, mà là bước tiếp ngay cả khi nỗi sợ vẫn còn đó.',
        'Courage is not the absence of fear, but taking the next step even when fear remains.',
        'COURAGE',
        TRUE,
        0
    ),
    (
        3,
        NULL,
        NULL,
        'Cơn bão nào rồi cũng sẽ qua, sau cơn mưa bầu trời sẽ lại trong xanh và ấm áp.',
        'Cơn bão nào rồi cũng sẽ qua, sau cơn mưa bầu trời sẽ lại trong xanh và ấm áp.',
        'Every storm will pass; after the rain, the sky will be bright and warm once more.',
        'PERSPECTIVE',
        TRUE,
        0
    ),
    (
        4,
        NULL,
        NULL,
        'Hãy dịu dàng với chính mình, bạn đang tiến bộ hơn từng ngày dù đôi lúc không nhận ra.',
        'Hãy dịu dàng với chính mình, bạn đang tiến bộ hơn từng ngày dù đôi lúc không nhận ra.',
        'Be gentle with yourself; you are progressing each day even when you do not realize it.',
        'HEALING',
        TRUE,
        0
    ),
    (
        5,
        NULL,
        NULL,
        'Mỗi bước chân nhỏ bé hôm nay đang vẽ nên con đường tuyệt vời của tương lai.',
        'Mỗi bước chân nhỏ bé hôm nay đang vẽ nên con đường tuyệt vời của tương lai.',
        'Every small step today is paving a wonderful path for tomorrow.',
        'COURAGE',
        TRUE,
        0
    )
ON CONFLICT (id) DO UPDATE 
SET message = EXCLUDED.message, message_vi = EXCLUDED.message_vi, message_en = EXCLUDED.message_en, category = EXCLUDED.category;

SELECT setval(pg_get_serial_sequence('message_capsules', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM message_capsules;


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


