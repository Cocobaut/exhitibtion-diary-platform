// ---------- SVG Icon Path Definitions ----------
export const IC = {
  home: "M3 11l9-7 9 7v9h-6v-6H9v6H3z",
  r1: "M4 4h16v16H4z M7 16l3.5-4 2.5 3 2-2 2 3",
  r2: "M8 7h8l1.2 8.5L12 18l-5.2-2.5z M10 18.5v2h4v-2 M12 3v4",
  r3: "M12 21v-6 M12 15l-3.5-3 M12 13l3.5-3 M12 3a6.5 6.5 0 0 1 6.5 6 6.5 6.5 0 0 1-13 0A6.5 6.5 0 0 1 12 3z",
  diary: "M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z M6 17a2 2 0 0 1 2-2h11 M10 7h5",
  shield: "M12 3l8 3v6c0 5-3.6 8-8 9-4.4-1-8-4-8-9V6z M9 12l2 2 4-4",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z M10 21h4",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M20 20l-4.2-4.2",
  palette: "M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.4-1.3-1.6-1.3-2.9 0-1 .9-1.8 2-1.8H17a4 4 0 0 0 4-4C21 6.2 17 3 12 3z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  lock: "M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  globe: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M3 12h18 M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9s1.1-6.4 3.6-9z",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3.5 2",
  plus: "M12 5v14 M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  archive: "M3 5h18v4H3z M5 9v10h14V9 M10 13h4",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4",
  check: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12 M18 6L6 18",
  image: "M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15.5 9h.01",
  bookmark: "M7 3h10v18l-5-4-5 4z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
  calendar: "M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14a6.5 6.5 0 0 1 3.5 6",
  log: "M6 3h9l4 4v14H6z M9 11h7 M9 15h7 M9 7h3",
  star: "M12 3l2.4 5.2L20 9l-4.2 3.9L17 19l-5-2.8L7 19l1.2-6.1L4 9l5.6-.8z",
  down: "M6 9l6 6 6-6",
  chev: "M9 6l6 6-6 6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  font: "M4 20l6-16h1l6 16 M7 14h7 M17 20h4",
  filter: "M4 6h16 M7 12h10 M10 18h4",
};

// ---------- Reactions Config ----------
export const RX = {
  HEART: { c: "#C9485B", label: "Thương", fill: true, g: "M12 19s-6.5-4.2-6.5-9.2A3.6 3.6 0 0 1 12 7.6a3.6 3.6 0 0 1 6.5 2.2C18.5 14.8 12 19 12 19z" },
  HUG: { c: "#D99A3A", label: "Ôm an ủi", fill: false, g: "M5 11.5c1.3 4 4 6 7 6s5.7-2 7-6 M8.5 12.5c.9 1.6 2.2 2.4 3.5 2.4s2.6-.8 3.5-2.4 M8.6 8.4h.01 M15.4 8.4h.01" },
  SYMPATHY: { c: "#7E74B4", label: "Đồng cảm", fill: true, g: "M12 4.5c2.8 3.6 4.6 5.9 4.6 8.4a4.6 4.6 0 0 1-9.2 0c0-2.5 1.8-4.8 4.6-8.4z" },
  ENERGY: { c: "#C79A2E", label: "Nhận năng lượng", fill: true, g: "M13 3L6 13h5l-1 8 7-10h-5z" },
};

// ---------- In-App Themes ----------
export const THEMES = [
  { key: "museum", name: "Bảo tàng chiều", desc: "Mặc định. Tường nâu đất, đèn rọi vàng.", swatches: ["#564640", "#3A2E29", "#F3EADD", "#A1342C", "#D4B06A"] },
  { key: "moss", name: "Rêu cổ", desc: "Xanh rêu trầm, gạch nung.", swatches: ["#434D46", "#2E3631", "#F0ECE0", "#A55A3A", "#CDB06A"] },
  { key: "plum", name: "Mận chín", desc: "Tím mận ấm, hồng đất.", swatches: ["#4F3E4B", "#362933", "#F4ECE8", "#B0473F", "#D6AE72"] },
  { key: "paper", name: "Giấy cũ", desc: "Bản sáng, gần màu trang Facebook.", swatches: ["#E6D7C1", "#CDB79A", "#FBF6EE", "#7F1916", "#B8893A"] },
];

// ---------- Room 1 Artworks ----------
export const WORKS = [
  { id: 1, t: "Email học bổng", s: "Ba năm nộp học bổng, ba lần mở email bằng đôi tay run.", a: "Linh", k: "window", rx: ["HUG", "HEART", "SYMPATHY"], n: 214, v: "1,2k", story: "Ba năm liền mình nộp học bổng. Lần nào cũng mở email với đôi tay run run, và lần nào nó cũng bắt đầu bằng “Chúng tôi rất tiếc phải thông báo…”.\n\nNăm nay mình vẫn không đậu. Nhưng khi đọc lại ba bộ hồ sơ, mình thấy người viết bộ thứ ba đã khác hẳn người viết bộ đầu tiên. Mình đã trở thành một người không bỏ cuộc.", quote: "“Một lời từ chối mô tả một quyết định, không mô tả một con người.”", date: "21.10.2026", reactionsBreakdown: [61, 118, 35] },
  { id: 2, t: "Bài thi mình chắc chắn đã qua", s: "Ôn ba tuần, bước ra phòng thi rất tự tin. Hai tuần sau: 3.5.", a: "Gió", k: "rain", rx: ["SYMPATHY", "HUG"], n: 168, v: "980", story: "Mình đã ôn suốt ba tuần và làm lại mọi dạng bài. Khi kết quả trả về, mình nhìn vào màn hình và không tin vào mắt mình.", quote: "“Thất bại không xóa đi những giờ bạn đã nỗ lực.”", date: "20.10.2026" },
  { id: 3, t: "Lần thứ ba trượt phỏng vấn", s: "Mình thuộc lòng mọi câu trả lời, chỉ là không ai hỏi những câu đó.", a: "Hana", k: "door", rx: ["HUG", "SYMPATHY"], n: 131, v: "760", story: "Phòng phỏng vấn lạnh buốt và người phỏng vấn nhìn vào đồng hồ. Mình đã chuẩn bị mọi thứ, chỉ không chuẩn bị cho cảm giác bị từ chối lần nữa.", quote: "“Cánh cửa đóng lại chỉ để bạn tìm thấy hướng đi khác.”", date: "19.10.2026" },
  { id: 4, t: "Đội tuyển không có tên mình", s: "Danh sách dán trên bảng tin, mình đọc đi đọc lại ba lần.", a: "Minh", k: "hills", rx: ["HEART", "HUG"], n: 97, v: "540", story: "Đứng trước bảng tin lúc tan học, ngón tay dò từ trên xuống dưới rồi dò ngược lại. Tên mình không có ở đó.", quote: "“Bạn là người định nghĩa giá trị của bản thân, không phải bảng tin.”", date: "18.10.2026" },
  { id: 5, t: "Dự án khởi nghiệp đầu tiên", s: "Sáu tháng, hai người bạn, một ý tưởng và không một khách hàng.", a: "K.", k: "boat", rx: ["SYMPATHY", "HEART"], n: 88, v: "610", story: "Tụi mình thức trắng nhiều đêm tại quán cà phê. Ngày đóng dự án, hai đứa ngồi nhìn nhau cười trừ rồi đi ăn một bữa lẩu.", quote: "“Học được bài học cũng là một dạng thu hoạch.”", date: "17.10.2026" },
  { id: 6, t: "Năm gap year không ai hiểu", s: "Mọi người hỏi bao giờ đi học lại, không ai hỏi mình có ổn không.", a: "Ẩn danh", k: "moon", rx: ["HUG", "HEART", "SYMPATHY"], n: 245, v: "1,6k", story: "Một năm dừng lại để chữa lành những tổn thương tích tụ. Người ngoài nhìn vào chỉ thấy sự lãng phí thời gian.", quote: "“Đi chậm lại không có nghĩa là dừng bước.”", date: "16.10.2026" },
  { id: 7, t: "Bài thuyết trình run tay", s: "Slide đẹp nhất lớp, giọng nhỏ nhất lớp.", a: "Sóc", k: "field", rx: ["HEART", "HUG"], n: 73, v: "420", story: "Đứng trước giảng đường 200 người, giọng mình run và chân không đứng vững. Nhưng mình đã nói hết câu cuối cùng.", quote: "“Can đảm là run rẩy nhưng vẫn hoàn thành.”", date: "15.10.2026" },
  { id: 8, t: "Ngành học mình không chọn", s: "Bốn năm học một thứ để làm vui lòng người khác.", a: "Lam", k: "hills", rx: ["SYMPATHY", "HUG"], n: 156, v: "890", story: "Mỗi sáng thức dậy đi học là một trận chiến tâm lý. Giờ đây mình bắt đầu học lại điều mình thực sự yêu thích.", quote: "“Không bao giờ là quá muộn để bắt đầu lại.”", date: "14.10.2026" },
];

export const MY_WORKS = [
  WORKS[1],
  { id: 9, t: "Mùa thi đại học năm ấy", s: "Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.", a: "Gió", status: "PENDING", date: "25.10" },
  { id: 10, t: "Bạn cùng phòng", s: "Lý do: câu chuyện còn nhắc tên thật của một bạn khác.", a: "Gió", status: "REJECTED", reason: "câu chuyện còn nhắc tên thật của một bạn khác." }
];

// ---------- Room 2 Lantern Symbols ----------
export const SYM = {
  star: () => { const o = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.42 : 1; o.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return o; },
  heart: () => { const o = []; for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.25) o.push([16 * Math.sin(t) ** 3 / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); return o; },
  flower: () => { const o = []; for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.12) { const rr = 0.35 + 0.65 * Math.abs(Math.cos(2.5 * t)); o.push([Math.cos(t) * rr, Math.sin(t) * rr]); } return o; },
  spiral: () => { const o = []; for (let t = 0; t <= 12; t += 0.35) o.push([Math.cos(t) * t / 12, Math.sin(t) * t / 12]); return o; },
  wave: () => { const o = []; for (let x = -1; x <= 1.01; x += 0.15) o.push([x, Math.sin(x * 5) * 0.3]); return o; },
};
export const SYM_KEYS = Object.keys(SYM);

export const MOCK_LANTERN_LETTERS = [
  {
    id: 1,
    symbol: 'heart',
    title: 'Gửi mình của năm 2026,',
    content: 'Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác. Dù kết quả ra sao, mình vẫn tự hào vì tụi mình đã không bỏ cuộc.',
    author: 'Linh, 24.10.2023',
    statusNote: 'Đã tới giờ hẹn · 09:00, 25.10.2026',
    isMine: true
  },
  {
    id: 2,
    symbol: 'star',
    title: 'Ước nguyện gửi tương lai,',
    content: 'Hôm nay mình hoàn thành hồ sơ du học sau 6 tháng tích lũy. Dù kết quả thế nào, mình biết bản thân đã nỗ lực hết mình.',
    author: 'Minh, 15.09.2024',
    statusNote: 'Lồng đèn công khai đã mở · 20.10.2026',
    isMine: false
  },
  {
    id: 3,
    symbol: 'flower',
    title: 'Cho một người lạ đang đọc được bức thư này,',
    content: 'Nếu hôm nay bạn cảm thấy mệt mỏi và cô đơn, xin hãy nhớ rằng mặt trời vẫn luôn mọc vào mỗi sớm mai. Bạn xứng đáng được yêu thương và được hạnh phúc.',
    author: 'Hana, 12.08.2025',
    statusNote: 'Lồng đèn công khai đã mở · 24.10.2026',
    isMine: false
  },
  {
    id: 4,
    symbol: 'spiral',
    title: 'Gửi bản thân những ngày bão giông,',
    content: 'Những đêm thức trắng ôn thi, những giọt nước mắt thất vọng rồi cũng sẽ qua đi. Chỉ cần không bỏ cuộc, con đường phía trước sẽ mở lối.',
    author: 'Ẩn danh, 05.06.2024',
    statusNote: 'Lồng đèn công khai đã mở · 18.10.2026',
    isMine: false
  },
  {
    id: 5,
    symbol: 'wave',
    title: 'Hôm nay trời Sài Gòn mưa rất lớn,',
    content: 'Mình vừa chia tay mối tình 4 năm. Nhưng mình tin rằng mỗi sự kết thúc là một khởi đầu mới tốt đẹp hơn.',
    author: 'Lam, 02.10.2025',
    statusNote: 'Lồng đèn công khai đã mở · 22.10.2026',
    isMine: false
  }
];

// ---------- Room 3 Wish Categories ----------
export const CATS = {
  KL: { c: "#E2BC55", hi: "#F6DD8F", name: "Khích lệ", desc: "Lời khích lệ, động viên kiên trì" },
  CL: { c: "#94C590", hi: "#C6E6BE", name: "Chữa lành", desc: "Lời chữa lành, bình an tâm hồn" },
  BO: { c: "#E9A2AE", hi: "#F6CDD3", name: "Biết ơn", desc: "Lời cảm ơn, trân trọng cuộc sống" },
  GN: { c: "#8FBCD9", hi: "#C4DDEE", name: "Góc nhìn", desc: "Lời chia sẻ góc nhìn cuộc sống" },
};
export const CAT_KEYS = Object.keys(CATS);

// ---------- Diary Moods & Entries ----------
export const MOODS = {
  "Bình yên": "#94C590",
  "Trầm lắng": "#8FBCD9",
  "Biết ơn": "#E9A2AE",
  "Hy vọng": "#E2BC55",
  "Mệt mỏi": "#B9A89A",
};

export const DIARY_ENTRIES = [
  { day: "25", weekday: "Th 7", mood: "Hy vọng", title: "Hôm nay lồng đèn rơi xuống", excerpt: "Đọc lại thư mình viết ba năm trước, mình đã khóc một chút.", status: "priv", fullStory: "Chín giờ sáng, điện thoại báo lồng đèn của mình đã hạ xuống. Mình mở ra và thấy chữ của chính mình ba năm trước, lúc vừa trượt IELTS lần hai.\nMình đã khóc một chút, rồi cười. Cậu ấy mong mình thôi so sánh với người khác. Mình nghĩ mình đã làm được một nửa. Nửa còn lại, mình sẽ cố tiếp.", caption: "thư viện, chiều thứ bảy" },
  { day: "22", weekday: "Th 4", mood: "Mệt mỏi", title: "Tuần ôn thi thứ ba", excerpt: "Ngủ bốn tiếng một đêm. Mai mình sẽ thử ngủ sớm hơn.", status: "priv" },
  { day: "19", weekday: "CN", mood: "Biết ơn", title: "Bữa cơm với mẹ", excerpt: "Mẹ không hỏi điểm, mẹ chỉ hỏi mình ăn chưa.", status: "wait" },
  { day: "14", weekday: "Th 3", mood: "Bình yên", title: "Một chiều đạp xe", excerpt: "Gió sông Sài Gòn lúc năm giờ chiều thật dễ chịu.", status: "pub" },
];

export const COMMUNITY_DIARY_ENTRIES = [
  { mood: "Biết ơn", title: "Cảm ơn người lạ ở trạm xe buýt", excerpt: "Chị ấy cho mình mượn ô dù không quen biết. Hôm đó mình vừa bị từ chối học bổng.", author: "Sóc", count: 64, date: "20.10.2026" },
  { mood: "Bình yên", title: "Ngày đầu tiên không mở điện thoại", excerpt: "Mình đi bộ quanh hồ và nhận ra đã lâu rồi mình không nhìn trời.", author: "Mây", count: 41, date: "19.10.2026" },
  { mood: "Trầm lắng", title: "Nhớ nhà", excerpt: "Bốn tháng chưa về quê. Tối nay mình nấu canh chua theo cách mẹ hay nấu.", author: "Ẩn danh", count: 88, date: "18.10.2026" },
  { mood: "Hy vọng", title: "Bản CV thứ 21", excerpt: "Lần này mình viết bằng giọng của chính mình, không bắt chước ai nữa.", author: "Hana", count: 57, date: "17.10.2026" },
  { mood: "Mệt mỏi", title: "Tuần không ổn", excerpt: "Không có gì to tát, chỉ là mọi thứ đều nặng hơn bình thường một chút.", author: "Gió", count: 102, date: "16.10.2026" },
  { mood: "Biết ơn", title: "Thầy chủ nhiệm cũ", excerpt: "Thầy nhắn: điểm số chỉ là một cách đo, không phải cách duy nhất.", author: "Lam", count: 76, date: "15.10.2026" },
];

// ---------- Admin Back Office Data ----------
export const ADMINS = [
  { name: "An", color: "#A1342C", online: true },
  { name: "Bình", color: "#5E7A52", online: true },
  { name: "Chi", color: "#7E74B4", online: true },
  { name: "Dũng", color: "#B8893A", online: false },
];

export const PENDING_SUBMISSIONS = [
  { id: 1, time: "14:02 hôm nay", title: "Mùa thi đại học năm ấy", penName: "Gió", username: "@gio.nguyen", flag: "", selected: true, lock: "" },
  { id: 2, time: "13:40 hôm nay", title: "Người bạn thân rời nhóm", penName: "Ẩn danh", username: "@minhthu", flag: "Ẩn danh", selected: false, lock: "Chi đang xem" },
  { id: 3, time: "11:15 hôm nay", title: "Thất bại ở cuộc thi hùng biện", penName: "Sóc", username: "@soc.le", flag: "", selected: false, lock: "" },
  { id: 4, time: "Hôm qua", title: "Năm hai đại học, mình bỏ ngành", penName: "Lam", username: "@lam.pham", flag: "", selected: false, lock: "" },
  { id: 5, time: "Hôm qua", title: "Lần đầu đi làm thêm", penName: "Bơ", username: "@bo.tran", flag: "", selected: false, lock: "" },
  { id: 6, time: "23.10", title: "Bức thư không gửi", penName: "K.", username: "@khang.k", flag: "", selected: false, lock: "" },
];

export const CAPSULES_POOL = [
  { id: 1, content: "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa.", topic: "Can đảm", source: "Phòng 3 · Mây", draws: 342, active: true },
  { id: 2, content: "Hôm nay nghỉ ngơi cũng là một cách cố gắng.", topic: "Chữa lành", source: "Phòng 3 · Mây", draws: 518, active: true },
  { id: 3, content: "Mười năm nữa, chuyện hôm nay chỉ là một dòng trong câu chuyện dài của bạn.", topic: "Góc nhìn", source: "Admin · An", draws: 276, active: true },
  { id: 4, content: "Bạn không cần phải nhanh, chỉ cần đừng dừng lại.", topic: "Can đảm", source: "Admin · Bình", draws: 451, active: true },
  { id: 5, content: "Một lời “không” đóng một cánh cửa, không đóng cả con đường.", topic: "Góc nhìn", source: "Admin · Chi", draws: 189, active: false },
  { id: 6, content: "Cảm ơn bạn vì đã ở lại đến hôm nay.", topic: "Chữa lành", source: "Phòng 3 · Ẩn danh", draws: 97, active: true },
];

export const NOTIFICATIONS_DATA = [
  { badge: "b-ok", icon: "check", text: "Tác phẩm “Bài thi mình chắc chắn đã qua” đã được trưng bày ở Phòng 1.", time: "2 phút trước", cta: "Xem tác phẩm", unread: true },
  { badge: "b-no", icon: "x", text: "Lời nhắn “Cố lên nhé” chưa được treo lên cây. Lý do: nội dung còn chứa tên trường của bạn khác.", time: "1 giờ trước", cta: "Sửa và gửi lại", unread: true },
  { badge: "b-wait", icon: "r2", text: "Lồng đèn bạn thả ngày 24.10.2023 đã hạ xuống. Thư từ bạn của 3 năm trước đang chờ.", time: "Hôm nay, 09:00", cta: "Mở thư", unread: true },
  { badge: "b-priv", icon: "users", text: "Hana và 12 người khác đã ôm an ủi tác phẩm “Email học bổng”.", time: "Hôm qua", cta: "", unread: false },
];

export const INITIAL_NOTEBOOK_ITEMS = [
  {
    id: "nb_1",
    source: "mailbox",
    sourceLabel: "Hòm thư · Can đảm",
    badgeClass: "b-ok",
    icon: "sparkle",
    content: "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.",
    author: "một người lạ ở Phòng 3, đã được kiểm duyệt",
    savedAt: "25.10.2026",
    category: "Can đảm"
  },
  {
    id: "nb_2",
    source: "lantern",
    sourceLabel: "Lồng đèn hạ xuống · Phòng 2",
    badgeClass: "b-wait",
    icon: "r2",
    title: "Gửi mình của năm 2026,",
    content: "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác. Dù kết quả ra sao, mình vẫn tự hào vì tụi mình đã không bỏ cuộc.",
    author: "Linh, 24.10.2023",
    savedAt: "Hôm nay, 09:00",
    symbol: "heart"
  },
  {
    id: "nb_3",
    source: "mailbox",
    sourceLabel: "Hòm thư · Chữa lành",
    badgeClass: "b-ok",
    icon: "sparkle",
    content: "Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.",
    author: "Mây · Phòng 3",
    savedAt: "22.10.2026",
    category: "Chữa lành"
  },
  {
    id: "nb_4",
    source: "lantern",
    sourceLabel: "Lồng đèn hạ xuống · Phòng 2",
    badgeClass: "b-wait",
    icon: "r2",
    title: "Ước nguyện gửi tương lai,",
    content: "Hôm nay mình hoàn thành hồ sơ du học sau 6 tháng tích lũy. Dù kết quả thế nào, mình biết bản thân đã nỗ lực hết mình.",
    author: "Minh, 15.09.2024",
    savedAt: "20.10.2026",
    symbol: "star"
  }
];
