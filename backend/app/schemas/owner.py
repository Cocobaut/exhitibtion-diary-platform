from datetime import datetime
from typing import Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 13.1 & 13.2 Users Management & Detail
# -----------------------------------------------------------------------------

class OwnerUserItem(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    nickname: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OwnerUserPagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class OwnerUsersListData(BaseModel):
    items: List[OwnerUserItem]
    pagination: OwnerUserPagination


class UserActivityStats(BaseModel):
    artworks_count: int
    diaries_count: int
    notifications_count: int


class OwnerUserDetailData(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    nickname: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    stats: UserActivityStats
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 13.3 Update User Status
# -----------------------------------------------------------------------------

class UpdateUserStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Trạng thái kích hoạt tài khoản")
    reason: Optional[str] = Field(None, description="Lý do khóa hoặc mở khóa")


class UpdateUserStatusData(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    is_active: bool
    updated_at: datetime


# -----------------------------------------------------------------------------
# 13.4 Update User Role
# -----------------------------------------------------------------------------

class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(USER|ADMIN)$", description="Vai trò mới: USER hoặc ADMIN")


class UpdateUserRoleData(BaseModel):
    id: uuid.UUID
    username: str
    old_role: str
    new_role: str
    updated_at: datetime


# -----------------------------------------------------------------------------
# 13.5 Delete User Permanently
# -----------------------------------------------------------------------------

class DeleteUserData(BaseModel):
    id: uuid.UUID
    username: str
    deleted_at: datetime


# -----------------------------------------------------------------------------
# 13.6 System Stats
# -----------------------------------------------------------------------------

class UsersSummary(BaseModel):
    total_users: int
    active_users: int
    deactivated_users: int
    by_role: Dict[str, int]


class ExhibitionSummary(BaseModel):
    total_artworks: int
    pending_artworks: int
    approved_artworks: int
    archived_artworks: int


class DiariesSummary(BaseModel):
    total_diaries: int
    public_diaries: int
    pending_approval: int


class CapsulesSummary(BaseModel):
    total_capsules: int
    total_draws: int


class SystemStatsData(BaseModel):
    users_summary: UsersSummary
    exhibition_summary: ExhibitionSummary
    diaries_summary: DiariesSummary
    capsules_summary: CapsulesSummary
