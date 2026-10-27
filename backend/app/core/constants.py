"""Constants and configuration enums used across the platform."""

# Room IDs
ROOM_BROKEN = 1
ROOM_HOPE = 2
ROOM_COMMUNITY = 3

# Room 3 Color legend definition
ROOM3_COLOR_LEGEND = [
    {
        "category": "ENCOURAGEMENT",
        "color_code": "#FFD700",
        "label": "Lời khích lệ, động viên kiên trì"
    },
    {
        "category": "HEALING",
        "color_code": "#98FB98",
        "label": "Lời chữa lành, bình an tâm hồn"
    },
    {
        "category": "GRATITUDE",
        "color_code": "#FFB6C1",
        "label": "Lời cảm ơn, trân trọng cuộc sống"
    },
    {
        "category": "PERSPECTIVE",
        "color_code": "#87CEFA",
        "label": "Lời chia sẻ góc nhìn cuộc sống"
    },
]

# Message Capsule Categories
CAPSULE_CATEGORIES = ["HEALING", "COURAGE", "PERSPECTIVE"]

# Allowed Reactions per space
ROOM1_REACTIONS = ["HEART", "HUG", "SYMPATHY"]
ROOM2_REACTIONS = ["HEART", "HUG", "SYMPATHY"]
ROOM3_REACTIONS = ["INSPIRED", "HEART"]
DIARY_REACTIONS = ["HEART", "HUG", "SYMPATHY"]

# Display string for anonymous users
ANONYMOUS_NAME = "Người Bạn Ẩn Danh"

# Notification Types
NOTIFICATION_TYPES = ["INTERACTION", "CAPSULE", "SYSTEM", "REMINDER"]

# Audit Log Action Types
AUDIT_ACTION_TYPES = [
    "CREATE_DIRECT",
    "UPDATE",
    "APPROVE",
    "APPROVE_AND_UPLOAD_MEDIA",
    "REJECT",
    "ARCHIVE"
]
