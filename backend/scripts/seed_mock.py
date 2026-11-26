"""Sinh dữ liệu mẫu cho 3 phòng: tài khoản ngẫu nhiên + khoảng 30 bài mỗi phòng + cảm xúc.

Mọi tài khoản mẫu có username bắt đầu bằng "mock_" và email @example.com, nên xoá sạch được:
xoá user thì bài và cảm xúc của họ bị xoá theo (ON DELETE CASCADE).

Chạy (dev):
    python -m scripts.seed_mock                 # thêm dữ liệu, in mật khẩu các tài khoản
    python -m scripts.seed_mock --remove        # xoá toàn bộ dữ liệu mẫu
Production (DEBUG=False) phải ghi rõ --allow-production:
    docker compose -f docker-compose.prod.yml exec backend python -m scripts.seed_mock --allow-production
"""

import argparse
import asyncio
import random
import secrets
import string
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.constants import ROOM2_REACTIONS, ROOM3_COLOR_LEGEND, ROOM3_REACTIONS, ROOM1_REACTIONS
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password, validate_password_strength
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.user import User, UserRole

PREFIX = "mock_"
EMAIL_DOMAIN = "example.com"  # tên miền dành riêng cho ví dụ: không email nào gửi tới người thật
PER_ROOM = 30
USER_COUNT = 15

NICKNAMES = [
    "Mây Lang Thang", "Gió Đầu Mùa", "Hạt Mưa Nhỏ", "Cánh Diều Xanh", "Nắng Sớm", "Lữ Khách Đêm",
    "Ngọn Đèn Nhỏ", "Sóng Bạc", "Cỏ May", "Trăng Khuyết", "Hoa Sữa", "Bến Đợi", "Phố Vắng",
    "Chiếc Lá Thu", "Mầm Non", "Sao Băng", "Cát Trắng", "Tiếng Ve",
]

ROOM1_STORIES = [
    ("Trượt nguyện vọng một", "Áp lực học tập",
     "Ngày xem điểm, tôi đứng rất lâu trước màn hình.",
     "Cả năm lớp 12 tôi chỉ nghĩ đến một ngôi trường. Ngày có kết quả, tôi thiếu nửa điểm. "
     "Mất nhiều tháng tôi mới dám nói chuyện lại với bạn bè. Giờ tôi học ở một nơi khác và thấy mình vẫn ổn."),
    ("Startup đầu tiên đóng cửa", "Sự nghiệp",
     "Mười tám tháng, ba người bạn và một khoản nợ.",
     "Chúng tôi bắt đầu với rất nhiều nhiệt huyết nhưng không ai thật sự hiểu khách hàng. "
     "Ngày đóng công ty, tôi thấy mình thất bại hoàn toàn. Nhưng những gì học được thì không mất đi đâu."),
    ("Mối tình bảy năm", "Tình cảm",
     "Chúng tôi chia tay vào một buổi chiều rất bình thường.",
     "Không ai làm gì sai, chỉ là hai người đã lớn lên theo hai hướng khác nhau. "
     "Tôi mất gần một năm để quen với việc không còn nhắn tin chúc ngủ ngon cho ai."),
    ("Bị từ chối sau vòng phỏng vấn cuối", "Sự nghiệp",
     "Email từ chối đến lúc nửa đêm.",
     "Tôi đã chuẩn bị ba tháng cho công việc mơ ước. Vòng cuối, tôi run đến mức quên cả điều mình muốn nói. "
     "Tôi buồn suốt một tuần, rồi bắt đầu luyện tập lại từ đầu."),
    ("Ngày bố nằm viện", "Gia đình",
     "Lần đầu tiên tôi thấy bố yếu đi.",
     "Tôi luôn nghĩ bố là người không bao giờ gục ngã. Những đêm ngồi ở hành lang bệnh viện dạy tôi "
     "rằng mình cũng phải lớn lên, và rằng nói lời thương sớm thì tốt hơn muộn."),
    ("Rớt môn lần thứ ba", "Áp lực học tập",
     "Tôi đã nghĩ mình không đủ thông minh.",
     "Môn học ấy như một bức tường. Đến lần thứ ba, tôi thôi học một mình và xin vào nhóm học của lớp. "
     "Hoá ra tôi chỉ cần người cùng đi."),
    ("Mất người bạn thân", "Tình bạn",
     "Một hiểu lầm nhỏ, rồi im lặng ba năm.",
     "Chúng tôi từng là hai đứa không thể tách rời. Tôi đã quá tự ái để nhắn tin trước. "
     "Tuần trước tôi gửi một lời xin lỗi. Chưa có hồi âm, nhưng lòng tôi nhẹ hơn nhiều."),
    ("Chuyển nhà sang thành phố lạ", "Thay đổi",
     "Không quen ai, không biết đường, không có ai để gọi.",
     "Những tháng đầu tôi ăn tối một mình mỗi ngày. Dần dần tôi biết quán cà phê đầu ngõ, "
     "biết cô bán rau, và một ngày nhận ra nơi này cũng đã thành nhà."),
    ("Bài thuyết trình thảm hoạ", "Sự nghiệp",
     "Máy chiếu hỏng, và tôi đứng im trước năm mươi người.",
     "Tôi đã muốn biến mất ngay lúc ấy. Sau buổi đó, một anh đồng nghiệp đến nói rằng ai cũng từng như vậy. "
     "Câu nói ngắn ấy giúp tôi đứng dậy."),
    ("Kiệt sức năm hai mươi lăm", "Sức khoẻ tinh thần",
     "Sáng hôm ấy tôi không thể ra khỏi giường.",
     "Tôi đã làm việc không nghỉ suốt hai năm. Cơ thể bắt tôi dừng lại trước khi tôi kịp hiểu. "
     "Bây giờ tôi học cách nghỉ ngơi mà không thấy có lỗi."),
]

ROOM2_LETTERS = [
    ("Gửi tôi của năm 30 tuổi", "Hy vọng lúc ấy bạn vẫn giữ thói quen đọc sách mỗi tối.",
     "Chào bạn, mình viết thư này khi đang ngồi trong ký túc xá. Mong rằng bạn đã có một công việc mình thích, "
     "và vẫn nhớ gọi điện cho mẹ mỗi cuối tuần."),
    ("Lời hứa sau kỳ thi", "Dù kết quả thế nào, hãy tự hào vì đã cố gắng.",
     "Mình đang ôn thi và rất mệt. Khi bạn mở thư này, kỳ thi đã qua rồi. Mong bạn nhớ rằng điểm số "
     "không nói hết về con người bạn."),
    ("Thư cho mùa hè năm sau", "Đi một chuyến thật xa, một mình.",
     "Mình luôn sợ đi đâu một mình. Mùa hè năm sau, hãy mua vé tàu ra Bắc, ngắm núi, và kể lại cho mình nghe nhé."),
    ("Gửi người sẽ học xong đại học", "Cảm ơn vì đã không bỏ cuộc.",
     "Có những đêm mình muốn dừng lại. Nếu bạn đang đọc thư này trong bộ áo cử nhân, thì mình đã thắng rồi."),
    ("Về giấc mơ làm hoạ sĩ", "Đừng để nó chỉ là giấc mơ.",
     "Mỗi ngày vẽ một bức nhỏ thôi. Khi bạn mở thư, mong bạn đã có một cuốn sổ đầy tranh."),
    ("Cho tôi sau một năm chữa lành", "Mong bạn đã cười nhiều hơn.",
     "Năm nay mình đã khóc nhiều. Mình viết thư này để tin rằng năm sau sẽ khác."),
    ("Kế hoạch tiết kiệm", "Năm mươi triệu đầu tiên.",
     "Mình bắt đầu để dành từ hôm nay, mỗi tháng một ít. Mong bạn đã đủ tiền đưa bố mẹ đi du lịch."),
    ("Thư gửi đứa em", "Chị mong em lớn lên bình an.",
     "Khi thư này mở ra, em đã vào cấp ba. Chị chỉ muốn nói: cứ sai, cứ thử, chị luôn ở đây."),
]

ROOM3_MESSAGES = {
    "ENCOURAGEMENT": [
        "Bạn đã đi được xa hơn bạn nghĩ.", "Hôm nay chậm một chút cũng không sao.",
        "Cố thêm một ngày nữa thôi, rồi tính tiếp.", "Bước nhỏ vẫn là bước tiến.",
    ],
    "HEALING": [
        "Nỗi buồn rồi cũng sẽ nhẹ đi.", "Bạn xứng đáng được nghỉ ngơi.",
        "Không cần phải ổn ngay lập tức.", "Hãy ôm lấy chính mình một chút.",
    ],
    "GRATITUDE": [
        "Cảm ơn người lạ đã giữ cửa thang máy cho tôi.", "Biết ơn bữa cơm mẹ nấu.",
        "Cảm ơn những người bạn đã ở lại.", "Biết ơn một ngày nắng đẹp.",
    ],
    "PERSPECTIVE": [
        "Thất bại chỉ là một trang, không phải cả cuốn sách.", "Mỗi người có một đồng hồ riêng.",
        "Điều bạn lo hôm nay, năm sau có thể chẳng còn nhớ.", "Đôi khi lạc đường lại tìm ra lối mới.",
    ],
}


def random_password() -> str:
    # 14 ký tự, chắc chắn có hoa, thường, số, ký tự đặc biệt (đúng validate_password_strength)
    rng = secrets.SystemRandom()
    chars = [rng.choice(string.ascii_uppercase), rng.choice(string.ascii_lowercase),
             rng.choice(string.digits), rng.choice("!@#$%&*?")]
    chars += [rng.choice(string.ascii_letters + string.digits) for _ in range(10)]
    rng.shuffle(chars)
    password = "".join(chars)
    validate_password_strength(password)
    return password


def vi(**fields) -> dict:
    """Bài mẫu viết tiếng Việt: cột gốc và cột _vi giống nhau."""
    out = {"original_language": "vi"}
    for key, value in fields.items():
        out[key] = value
        out[f"{key}_vi"] = value
    return out


def build_artworks(users: list, now: datetime) -> list:
    arts = []

    def common(i: int) -> dict:
        author = random.choice(users)
        anonymous = random.random() < 0.3
        # 3 bài đầu mỗi phòng để chờ duyệt, còn lại đã duyệt
        status = "PENDING" if i < 3 else "APPROVED"
        return dict(
            user_id=author.id,
            author_display_name=None if anonymous else author.nickname,
            is_anonymous=anonymous,
            status=status,
            reviewed_at=None if status == "PENDING" else now,
            view_count=random.randint(0, 300),
            created_at=now - timedelta(days=random.randint(0, 60), minutes=random.randint(0, 1440)),
        )

    for i in range(PER_ROOM):
        title, tag, short, content = random.choice(ROOM1_STORIES)
        arts.append(Artwork(
            room_id=1, visibility="PUBLIC", tag_category=tag,
            media_url=f"https://picsum.photos/seed/{secrets.token_hex(4)}/600/800",
            **vi(title=f"{title} #{i + 1}", short_content=short, content=content), **common(i),
        ))

    for i in range(PER_ROOM):
        title, short, content = random.choice(ROOM2_LETTERS)
        private = 3 <= i < 8  # vài lồng đèn riêng tư: luôn được thả ngay, chỉ tác giả thấy
        # nửa số thư đã tới ngày mở, nửa còn hẹn trong tương lai
        days = random.randint(-90, -1) if random.random() < 0.5 else random.randint(7, 400)
        arts.append(Artwork(
            room_id=2, visibility="PRIVATE" if private else "PUBLIC",
            tag_category=random.choice(["star", "heart", "flower", "spiral", "wave"]),
            target_date=now + timedelta(days=days),
            **vi(title=f"{title} #{i + 1}", short_content=short, content=content),
            **(common(i) | ({"status": "APPROVED", "reviewed_at": None} if private else {})),
        ))

    for i in range(PER_ROOM):
        legend = random.choice(ROOM3_COLOR_LEGEND)
        message = random.choice(ROOM3_MESSAGES[legend["category"]])
        arts.append(Artwork(
            room_id=3, visibility="PUBLIC", tag_category=legend["category"], color_code=legend["color_code"],
            **vi(title=message[:60], short_content=message, content=message), **common(i),
        ))
    return arts


def build_reactions(arts: list, users: list) -> list:
    out = []
    for art in arts:
        if art.status != "APPROVED" or art.visibility != "PUBLIC":
            continue
        for user in random.sample(users, k=random.randint(0, len(users) // 2)):
            if art.room_id == 3:
                types = random.sample(ROOM3_REACTIONS, k=random.randint(1, len(ROOM3_REACTIONS)))
            else:
                types = [random.choice(ROOM1_REACTIONS if art.room_id == 1 else ROOM2_REACTIONS)]
            out += [ArtworkInteraction(artwork_id=art.id, user_id=user.id, reaction_type=t) for t in types]
    return out


def mock_users_filter():
    return (User.username.like(f"{PREFIX}%"), User.email.like(f"%@{EMAIL_DOMAIN}"))


async def remove() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(delete(User).where(*mock_users_filter()))
        await db.commit()
        print(f"Đã xoá {result.rowcount} tài khoản mẫu cùng toàn bộ bài và cảm xúc của họ.")


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(func.count(User.id)).where(*mock_users_filter()))
        if existing:
            sys.exit(f"Đã có {existing} tài khoản mẫu. Chạy --remove trước nếu muốn sinh lại.")

        now = datetime.now(timezone.utc)
        credentials = []
        users = []
        for nickname in random.sample(NICKNAMES, USER_COUNT):
            username = f"{PREFIX}{secrets.token_hex(3)}"
            password = random_password()
            users.append(User(
                username=username, email=f"{username}@{EMAIL_DOMAIN}", password_hash=hash_password(password),
                nickname=nickname, role=UserRole.USER.value, is_active=True,
            ))
            credentials.append((username, password, nickname))
        db.add_all(users)
        await db.flush()

        arts = build_artworks(users, now)
        db.add_all(arts)
        await db.flush()
        reactions = build_reactions(arts, users)
        db.add_all(reactions)
        await db.commit()

    print(f"Đã tạo {len(users)} tài khoản, {len(arts)} bài ({PER_ROOM}/phòng), {len(reactions)} lượt cảm xúc.\n")
    print(f"{'username':<16}{'password':<18}nickname")
    for username, password, nickname in credentials:
        print(f"{username:<16}{password:<18}{nickname}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--remove", action="store_true", help="xoá toàn bộ dữ liệu mẫu")
    parser.add_argument("--allow-production", action="store_true", help="bắt buộc khi DEBUG=False")
    args = parser.parse_args()
    if not settings.DEBUG and not args.allow_production:
        sys.exit("DEBUG=False (production): thêm --allow-production nếu thật sự muốn chạy ở đây.")
    asyncio.run(remove() if args.remove else seed())


if __name__ == "__main__":
    main()
