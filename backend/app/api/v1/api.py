from fastapi import APIRouter

from app.api.v1.endpoints import auth, capsules, diaries, notifications, room1, room2, room3, users

api_router = APIRouter()

# - plan_01: /auth (app.api.v1.endpoints.auth)
api_router.include_router(auth.router, prefix="/auth", tags=["1. Xác thực & Khôi phục mật khẩu"])

# - plan_02: /users (app.api.v1.endpoints.users)
api_router.include_router(users.router, prefix="/users", tags=["2. Hồ sơ cá nhân & Tài khoản"])

# - plan_03: /capsules (app.api.v1.endpoints.capsules)
api_router.include_router(capsules.router, prefix="/capsules", tags=["Capsules"])

# - plan_04: /notifications (app.api.v1.endpoints.notifications)
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# - plan_05: /rooms/1 (app.api.v1.endpoints.room1)
api_router.include_router(room1.router, prefix="/rooms/1", tags=["Room 1 - Broken"])

# - plan_06: /rooms/2 (app.api.v1.endpoints.room2)
api_router.include_router(room2.router, prefix="/rooms/2", tags=["Room 2 - Hope Lanterns"])

# - plan_07: /rooms/3 (app.api.v1.endpoints.room3)
api_router.include_router(room3.router, prefix="/rooms/3", tags=["Room 3 - Community Tree"])

# - plan_08: /diaries (app.api.v1.endpoints.diaries)
api_router.include_router(diaries.router, prefix="/diaries", tags=["Diaries"])
# - plan_09: /admin/rooms/{room_id}/artworks (app.api.v1.endpoints.admin_rooms)
# - plan_10: /admin/diaries (app.api.v1.endpoints.admin_diaries)
# - plan_11: /admin/capsules (app.api.v1.endpoints.admin_capsules)
# - plan_12: /admin/studio & /admin/audit-logs (app.api.v1.endpoints.admin_studio)
