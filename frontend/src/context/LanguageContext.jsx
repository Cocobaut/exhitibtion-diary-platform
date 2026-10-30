import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'museum_lang';

export const DICTIONARY = {
  vi: {
    // Navigation & Common
    lang_vi: 'VI',
    lang_en: 'EN',
    loading: 'Đang tải...',
    recently: 'Gần đây',
    today: 'Hôm nay',
    anonymous: 'Ẩn danh',
    anonymous_sender: 'Người gửi ẩn danh',
    author: 'Tác giả',
    views: 'lượt xem',
    close: 'Đóng',
    save: 'Lưu',
    saved: 'Đã lưu',
    theme_palette: 'Bảng màu',
    notifications: 'Thông báo',
    login_required: 'Vui lòng đăng nhập',

    // Sidebar
    nav_lobby: 'Sảnh',
    nav_room1: 'Phòng 1',
    nav_room2: 'Phòng 2',
    nav_room3: 'Phòng 3',
    nav_diary: 'Nhật ký',
    nav_notebook: 'Sổ tay',
    nav_admin: 'Quản trị',
    nav_owner: 'Owner',
    nav_guest: 'Khách vãng lai',
    nav_profile_settings: 'Hồ sơ & Cài đặt',
    nav_logout: 'Đăng xuất',
    nav_login: 'Đăng nhập',

    // Main Lobby
    lobby_greeting_guest: 'Chào bạn, hôm nay bạn muốn ghé đâu?',
    lobby_greeting_user: 'Chào {name}, hôm nay bạn muốn ghé đâu?',
    lobby_quote: 'Bạn hơn cả thành tích của mình.',
    lobby_room01_badge: 'PHÒNG 01',
    lobby_room01_title: 'Triển lãm Đổ vỡ',
    lobby_room01_count: 'Kể về một lần vấp ngã',
    lobby_room02_badge: 'PHÒNG 02',
    lobby_room02_title: 'Bầu trời Lồng đèn',
    lobby_room02_count: 'Viết thư gửi tương lai',
    lobby_room03_badge: 'PHÒNG 03',
    lobby_room03_title: 'Cây Thông điệp',
    lobby_room03_count: 'Gửi một lời động viên',
    lobby_mailbox_badge: 'hòm thư · nhận một lời nhắn',
    lobby_diary_badge: 'nhật ký của bạn',
    lobby_quick_r1: 'Phòng 01',
    lobby_quick_mailbox: 'Hòm thư',
    lobby_quick_r2: 'Phòng 02',
    lobby_quick_diary: 'Nhật ký',
    lobby_quick_r3: 'Phòng 03',

    // Room 1
    r1_tag: 'Phòng 01',
    r1_name: 'Triển lãm Đổ vỡ',
    r1_search_placeholder: 'Tìm theo tiêu đề, câu chuyện, bút danh…',
    r1_filter_all: 'Tất cả tác phẩm',
    r1_filter_mine: 'Tác phẩm của tôi',
    r1_filter_most_sympathy: 'Nhiều đồng cảm nhất',
    r1_filter_reacted: 'Đã thả cảm xúc',
    r1_btn_submit: '✦ Trưng bày tác phẩm',
    r1_rx_sympathy: 'Đồng cảm',
    r1_rx_hug: 'Ôm vỗ về',
    r1_rx_heart: 'Gửi tim',
    rx_heart: 'Thương',
    rx_hug: 'Ôm an ủi',
    rx_sympathy: 'Đồng cảm',
    rx_energy: 'Tiếp sức',
    rx_inspired: 'Truyền cảm hứng',
    rx_people_reacted: 'người đã gửi cảm xúc',
    rx_be_first: 'Hãy là người đầu tiên gửi lời an ủi.',
    rx_reacted: 'Đã thả cảm xúc',
    rx_send_reaction: 'Gửi cảm xúc',
    r1_story_title: 'Câu chuyện phía sau sự đổ vỡ',
    r1_express_sympathy: 'Gửi cảm xúc đến tác giả',
    r1_empty: 'Chưa có tác phẩm nào phù hợp với bộ lọc.',
    r1_loading_more: '✦ Đang tải thêm...',
    r1_all_loaded: '✦ Bạn đã xem hết tác phẩm trong phòng ✦',

    // Room 2
    r2_tag: 'Phòng 02',
    r2_name: 'Bầu trời Lồng đèn',
    r2_search_placeholder: 'Tìm lồng đèn theo từ khoá hoặc bút danh…',
    r2_filter_all: 'Tất cả',
    r2_filter_mine: 'Của tôi',
    r2_filter_opened: 'Lồng đèn đã mở',
    r2_filter_locked: 'Đang chờ ngày hạ xuống',
    r2_btn_release: '✦ Thả lồng đèn',
    r2_pull_down: 'Kéo xuống để đọc thư',
    r2_save_notebook: 'Lưu vào sổ tay',
    r2_saved_notebook: 'Đã lưu vào sổ tay',
    r2_reply_future: 'Viết thư cho tương lai',
    r2_landed_on: 'Hạ xuống:',

    // Room 3
    r3_tag: 'Phòng 03',
    r3_name: 'Cây Thông điệp',
    r3_search_placeholder: 'Tìm lời động viên theo từ khoá hoặc bút danh…',
    r3_filter_all: 'Tất cả',
    r3_filter_mine: 'Của tôi',
    r3_cat_healing: 'Chữa lành',
    r3_cat_encouragement: 'Khích lệ',
    r3_cat_gratitude: 'Biết ơn',
    r3_cat_acknowledgement: 'Ghi nhận',
    r3_btn_hang: '✦ Treo thông điệp',
    r3_send_energy: 'Truyền năng lượng',
    r3_send_heart: 'Gửi tim',
    r3_your_ribbon: 'Lá ruy băng của bạn',

    // Mailbox
    mailbox_title: 'Hòm Thư Bảo Tàng',
    mailbox_subtitle: 'Rút một thông điệp an ủi ngẫu nhiên',
    mailbox_btn_draw: 'Rút một thông điệp',
    mailbox_btn_draw_another: 'Rút thông điệp khác',
    mailbox_btn_save: 'Lưu vào sổ tay',
    mailbox_saved: 'Đã lưu vào sổ tay',

    // Diary & Notebook
    diary_title: 'Nhật ký Cảm xúc',
    diary_write_new: '✦ Viết trang nhật ký mới',
    notebook_title: 'Sổ tay',
    notebook_empty: 'Sổ tay của bạn đang trống.',

    // Admin
    admin_title: 'Không gian Quản trị',
    admin_online_team: 'Ban Quản trị online',
    admin_tab_r1: 'Phòng 1 (Đổ vỡ)',
    admin_tab_r2: 'Phòng 2 (Lồng đèn)',
    admin_tab_r3: 'Phòng 3 (Cây thông điệp)',
    admin_tab_diary: 'Nhật ký',
    admin_tab_capsules: 'Kho thông điệp',
    admin_tab_studio: 'Studio',
    admin_tab_audit: 'Nhật ký quản trị',
    admin_seg_pending: 'Chờ phê duyệt',
    admin_seg_live: 'Đang trưng bày',
    admin_seg_archive: 'Lưu trữ',
    admin_col_artwork: 'Tác phẩm / Tiêu đề',
    admin_col_author: 'Tác giả / Bút danh',
    admin_col_submitted: 'Thời gian gửi',
    admin_col_actions: 'Hành động',
    admin_col_status: 'Trạng thái',
    admin_btn_approve: 'Duyệt',
    admin_btn_reject: 'Từ chối',
    admin_btn_archive: 'Lưu trữ',
    admin_btn_restore: 'Khôi phục',
    admin_btn_edit: 'Chỉnh sửa',
    admin_btn_upload: '✦ Tải tác phẩm lên',
    admin_reject_title: 'Từ chối duyệt tác phẩm',
    admin_reject_reason_label: 'Chọn lý do từ chối mẫu:',
    admin_reject_note_label: 'Ghi chú gửi tác giả (tùy chọn):',
    admin_reject_btn_confirm: 'Xác nhận từ chối',
    admin_reject_btn_cancel: 'Hủy bỏ',
    admin_empty_pending: 'Không có tác phẩm nào đang chờ duyệt.',
    admin_empty_live: 'Không có tác phẩm nào đang trưng bày.',
    admin_empty_archived: 'Không có tác phẩm nào trong kho lưu trữ.',
  },

  en: {
    // Navigation & Common
    lang_vi: 'VI',
    lang_en: 'EN',
    loading: 'Loading...',
    recently: 'Recently',
    today: 'Today',
    anonymous: 'Anonymous',
    anonymous_sender: 'Anonymous sender',
    author: 'Author',
    views: 'views',
    close: 'Close',
    save: 'Save',
    saved: 'Saved',
    theme_palette: 'Theme Palette',
    notifications: 'Notifications',
    login_required: 'Please log in',

    // Sidebar
    nav_lobby: 'Lobby',
    nav_room1: 'Room 1',
    nav_room2: 'Room 2',
    nav_room3: 'Room 3',
    nav_diary: 'Diary',
    nav_notebook: 'Notebook',
    nav_admin: 'Admin',
    nav_owner: 'Owner',
    nav_guest: 'Guest',
    nav_profile_settings: 'Profile & Settings',
    nav_logout: 'Log out',
    nav_login: 'Log in',

    // Main Lobby
    lobby_greeting_guest: 'Hello friend, where would you like to visit today?',
    lobby_greeting_user: 'Hello {name}, where would you like to visit today?',
    lobby_quote: 'You are more than your achievements.',
    lobby_room01_badge: 'ROOM 01',
    lobby_room01_title: 'Broken Pieces Exhibition',
    lobby_room01_count: 'Share a time you stumbled',
    lobby_room02_badge: 'ROOM 02',
    lobby_room02_title: 'Lantern Sky',
    lobby_room02_count: 'Write to your future self',
    lobby_room03_badge: 'ROOM 03',
    lobby_room03_title: 'Message Tree',
    lobby_room03_count: 'Leave a kind word',
    lobby_mailbox_badge: 'mailbox · draw a message',
    lobby_diary_badge: 'your personal diary',
    lobby_quick_r1: 'Room 01',
    lobby_quick_mailbox: 'Mailbox',
    lobby_quick_r2: 'Room 02',
    lobby_quick_diary: 'Diary',
    lobby_quick_r3: 'Room 03',

    // Room 1
    r1_tag: 'Room 01',
    r1_name: 'Broken Pieces Exhibition',
    r1_search_placeholder: 'Search by title, story, pen name…',
    r1_filter_all: 'All artworks',
    r1_filter_mine: 'My artworks',
    r1_filter_most_sympathy: 'Most sympathy',
    r1_filter_reacted: 'Reacted',
    r1_btn_submit: '✦ Exhibit artwork',
    r1_rx_sympathy: 'Sympathy',
    r1_rx_hug: 'Warm Hug',
    r1_rx_heart: 'Send Heart',
    rx_heart: 'Care',
    rx_hug: 'Warm Hug',
    rx_sympathy: 'Empathy',
    rx_energy: 'Energize',
    rx_inspired: 'Inspire',
    rx_people_reacted: 'people shared empathy',
    rx_be_first: 'Be the first to share comforting words with the author.',
    rx_reacted: 'Reacted',
    rx_send_reaction: 'Express Empathy',
    r1_story_title: 'The story behind the broken pieces',
    r1_express_sympathy: 'Express sympathy to the author',
    r1_empty: 'No artworks found matching this filter.',
    r1_loading_more: '✦ Lighting up more artworks...',
    r1_all_loaded: '✦ You have admired all artworks in the room ✦',

    // Room 2
    r2_tag: 'Room 02',
    r2_name: 'Lantern Sky',
    r2_search_placeholder: 'Search lanterns by keyword or pen name…',
    r2_filter_all: 'All',
    r2_filter_mine: 'Mine',
    r2_filter_opened: 'Opened lanterns',
    r2_filter_locked: 'Waiting to land',
    r2_btn_release: '✦ Release lantern',
    r2_pull_down: 'Pull down to read letter',
    r2_save_notebook: 'Save to notebook',
    r2_saved_notebook: 'Saved to notebook',
    r2_reply_future: 'Reply to future',
    r2_landed_on: 'Landed on:',

    // Room 3
    r3_tag: 'Room 03',
    r3_name: 'Message Tree',
    r3_search_placeholder: 'Search messages by keyword or pen name…',
    r3_filter_all: 'All',
    r3_filter_mine: 'Mine',
    r3_cat_healing: 'Healing',
    r3_cat_encouragement: 'Encouragement',
    r3_cat_gratitude: 'Gratitude',
    r3_cat_acknowledgement: 'Acknowledgement',
    r3_btn_hang: '✦ Hang message',
    r3_send_energy: 'Send energy',
    r3_send_heart: 'Send heart',
    r3_your_ribbon: 'Your ribbon',

    // Mailbox
    mailbox_title: 'Museum Mailbox',
    mailbox_subtitle: 'Draw a random comfort message',
    mailbox_btn_draw: 'Draw a message',
    mailbox_btn_draw_another: 'Draw another message',
    mailbox_btn_save: 'Save to notebook',
    mailbox_saved: 'Saved to notebook',

    // Diary & Notebook
    diary_title: 'Emotional Diary',
    diary_write_new: '✦ Write new diary entry',
    notebook_title: 'Collection & Notebook',
    notebook_empty: 'Your notebook is currently empty.',

    // Admin
    admin_title: 'Admin Moderation Space',
    admin_online_team: 'Admin Team online',
    admin_tab_r1: 'Room 1 (Broken)',
    admin_tab_r2: 'Room 2 (Lanterns)',
    admin_tab_r3: 'Room 3 (Wish Tree)',
    admin_tab_diary: 'Diaries',
    admin_tab_capsules: 'Message Vault',
    admin_tab_studio: 'Studio',
    admin_tab_audit: 'Audit Log',
    admin_seg_pending: 'Pending Approval',
    admin_seg_live: 'Currently Exhibited',
    admin_seg_archive: 'Archived',
    admin_col_artwork: 'Artwork / Title',
    admin_col_author: 'Author / Pen Name',
    admin_col_submitted: 'Submitted Time',
    admin_col_actions: 'Actions',
    admin_col_status: 'Status',
    admin_btn_approve: 'Approve',
    admin_btn_reject: 'Reject',
    admin_btn_archive: 'Archive',
    admin_btn_restore: 'Restore',
    admin_btn_edit: 'Edit',
    admin_btn_upload: '✦ Upload Artwork',
    admin_reject_title: 'Reject Artwork',
    admin_reject_reason_label: 'Select standard rejection reason:',
    admin_reject_note_label: 'Note to author (optional):',
    admin_reject_btn_confirm: 'Confirm Rejection',
    admin_reject_btn_cancel: 'Cancel',
    admin_empty_pending: 'No artworks currently pending approval.',
    admin_empty_live: 'No artworks currently exhibited.',
    admin_empty_archived: 'No artworks in archive.',
  },
};

/**
 * Helper trích xuất nội dung đa ngôn ngữ cho nội dung do ban quản trị soạn (hòm thư, capsule).
 * Nội dung người dùng tự viết dùng getOriginalText để luôn giữ nguyên lời gốc.
 * - Nếu tiếng Anh (en): tải cột _en tương ứng (ví dụ: title_en, content_en, short_content_en, message_en).
 * - Nếu tiếng Việt (vi): tải cột _vi tương ứng (ví dụ: title_vi, content_vi, short_content_vi, message_vi).
 * - Tự động fallback linh hoạt nếu một trong 2 cột để trống.
 */
export function getLocalizedText(item, field, currentLang = 'vi') {
  if (!item) return '';
  if (typeof item === 'string') return item;

  const targetLang = currentLang === 'en' ? 'en' : 'vi';
  const fallbackLang = targetLang === 'en' ? 'vi' : 'en';

  const targetCol = `${field}_${targetLang}`;
  const fallbackCol = `${field}_${fallbackLang}`;

  // 1. Cột đúng ngôn ngữ yêu cầu
  if (item[targetCol] && typeof item[targetCol] === 'string' && item[targetCol].trim().length > 0) {
    return item[targetCol];
  }

  // 2. Cột ngôn ngữ gốc hoặc không có hậu tố (ví dụ: item.title, item.content, item.message)
  if (item[field] && typeof item[field] === 'string' && item[field].trim().length > 0) {
    return item[field];
  }

  // 3. Cột ngôn ngữ thay thế
  if (item[fallbackCol] && typeof item[fallbackCol] === 'string' && item[fallbackCol].trim().length > 0) {
    return item[fallbackCol];
  }

  return '';
}

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Lời gốc của tác giả. Cột không hậu tố (title, content...) luôn lưu bản gốc,
 * hai cột _vi/_en chỉ dùng làm dự phòng cho dữ liệu cũ.
 */
export function getOriginalText(item, field) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (hasText(item[field])) return item[field];
  if (hasText(item[`${field}_vi`])) return item[`${field}_vi`];
  if (hasText(item[`${field}_en`])) return item[`${field}_en`];
  return '';
}

/**
 * Bản dịch sang ngôn ngữ giao diện, nếu admin đã thêm và khác với bản gốc; ngược lại trả ''.
 */
export function getTranslatedText(item, field, currentLang = 'vi') {
  if (!item || typeof item === 'string') return '';
  const translated = item[`${field}_${currentLang === 'en' ? 'en' : 'vi'}`];
  if (!hasText(translated)) return '';
  return translated.trim() === getOriginalText(item, field).trim() ? '' : translated;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'vi';
    } catch {
      return 'vi';
    }
  });

  const setLanguage = useCallback((lang) => {
    const valid = lang === 'en' ? 'en' : 'vi';
    setLanguageState(valid);
    try {
      localStorage.setItem(STORAGE_KEY, valid);
    } catch (err) {
      console.warn('Lỗi khi lưu ngôn ngữ vào localStorage:', err);
    }
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const dict = DICTIONARY[language] || DICTIONARY.vi;
      let text = dict[key] || DICTIONARY.vi[key] || key;
      if (params && typeof params === 'object') {
        Object.keys(params).forEach((p) => {
          text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
        });
      }
      return text;
    },
    [language]
  );

  /**
   * Helper localize gắn sẵn ngôn ngữ hiện tại
   */
  const localize = useCallback(
    (item, field) => {
      return getLocalizedText(item, field, language);
    },
    [language]
  );

  const original = useCallback((item, field) => getOriginalText(item, field), []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isEnglish: language === 'en',
        t,
        localize,
        original,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;

/**
 * Bật/tắt xem bản dịch cho một nội dung người dùng.
 * Chỉ có bản dịch khi admin đã dịch sang đúng ngôn ngữ giao diện đang chọn.
 */
export function useTranslationToggle(item, fields) {
  const { language } = useLanguage();
  const [showTranslation, setShowTranslation] = useState(false);
  const itemId = item?.id;

  useEffect(() => {
    setShowTranslation(false);
  }, [itemId]);

  const hasTranslation = fields.some((f) => getTranslatedText(item, f, language));

  const text = (field) => {
    const translated = showTranslation ? getTranslatedText(item, field, language) : '';
    return translated || getOriginalText(item, field);
  };

  return {
    hasTranslation,
    showTranslation: hasTranslation && showTranslation,
    toggleTranslation: () => setShowTranslation((v) => !v),
    text,
  };
}
