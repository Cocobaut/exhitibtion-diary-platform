from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# 1. MODERATION SCHEMAS
# ==============================================================================

class ViolationDetail(BaseModel):
    category: str = Field(description="Mã phân loại vi phạm theo Rubric (pii, advertising, room_mismatch, profanity...)")
    deducted_points: int = Field(ge=5, le=35, description="Số điểm bị trừ cho vi phạm này")
    line_number: int = Field(ge=1, description="Dòng xảy ra vi phạm (1-indexed)")
    quote: str = Field(description="Trích dẫn chính xác nguyên văn đoạn vi phạm từ văn bản gốc")
    reason: str = Field(description="Giải thích rõ ràng lý do vi phạm")


class RoomAssessment(BaseModel):
    current_room: str = Field(description="Mã phòng hiện tại người dùng muốn gửi vào (room1, room2, room3)")
    is_valid: bool = Field(description="Phòng hiện tại có phù hợp với cảm xúc bài viết không")
    suggested_room: str = Field(description="Phòng phù hợp nhất theo phân tích cảm xúc")
    reason: str = Field(description="Căn cứ đánh giá phòng phù hợp")


class ModerateArtRequest(BaseModel):
    art_id: str = Field(description="ID bài viết đang chờ duyệt")
    target_room: Literal["room1", "room2", "room3", "diaries"] = Field(description="Mã phòng mục tiêu")
    content: str = Field(description="Nội dung bài viết cần kiểm duyệt")
    author_id: Optional[str] = Field(default=None, description="ID tác giả")


class ModerateArtData(BaseModel):
    art_id: str
    score: int = Field(ge=0, le=100, description="Điểm đánh giá từ 0 đến 100")
    verdict_recommendation: Literal["APPROVE_WITH_EDITS", "DISAPPROVE"]
    violations: List[ViolationDetail]
    room_assessment: RoomAssessment
    suggested_content: str = Field(
        description="Bản viết lại trung tính, giữ nguyên cấu trúc/ý nghĩa gốc, không hallucinate"
    )
    suggested_title_vi: Optional[str] = None
    suggested_title_en: Optional[str] = None
    suggested_short_content_vi: Optional[str] = None
    suggested_short_content_en: Optional[str] = None
    suggested_content_vi: Optional[str] = None
    suggested_content_en: Optional[str] = None


# ==============================================================================
# 2. IMAGE GENERATION SCHEMAS
# ==============================================================================

class GenerateArtImageRequest(BaseModel):
    art_id: str = Field(description="ID bài viết")
    source_content: str = Field(default="", description="Nội dung nguồn (gốc hoặc bản gợi ý của AI)")
    custom_prompt_addon: Optional[str] = Field(
        default=None,
        description="Tùy chọn phong cách bổ sung (ví dụ: 'watercolor, warm melancholic light')"
    )
    final_prompt: Optional[str] = Field(
        default=None,
        max_length=4000,
        description=(
            "Prompt cuối cùng đã được Admin/Owner xác nhận ở form 'Xác nhận nội dung ảnh'. "
            "Nếu có, hệ thống gửi nguyên văn prompt này tới API sinh ảnh, không tự thêm/bớt nội dung."
        ),
    )


class GenerateArtImageData(BaseModel):
    art_id: str
    image_url: str = Field(description="Đường dẫn URL ảnh đã tải về và lưu trữ")
    visual_prompt: str = Field(description="Visual prompt được LLM trích xuất để tạo ảnh")
    width: int = Field(default=1024)
    height: int = Field(default=1024)
    is_fallback_art: bool = Field(
        default=False,
        description="True nếu API sinh ảnh lỗi và hệ thống dùng ảnh SVG minh họa dự phòng",
    )


class BuildImagePromptRequest(BaseModel):
    """Form 1 – nội dung chi tiết (song ngữ) mà Admin/Owner đã rà soát trước khi soạn prompt."""
    art_id: str = Field(description="ID bài viết")
    target_room: Literal["room1", "room2", "room3", "diaries"] = Field(default="room1")
    title_vi: Optional[str] = Field(default=None, max_length=500)
    title_en: Optional[str] = Field(default=None, max_length=500)
    short_content_vi: Optional[str] = Field(default=None, max_length=2000)
    short_content_en: Optional[str] = Field(default=None, max_length=2000)
    content_vi: Optional[str] = Field(default=None, max_length=10000)
    content_en: Optional[str] = Field(default=None, max_length=10000)


class BuildImagePromptData(BaseModel):
    """Form 2 – prompt hoàn chỉnh để Admin/Owner xác nhận, copy hoặc gửi đi sinh ảnh."""
    art_id: str
    prompt_vi: str = Field(description="Prompt hoàn chỉnh tiếng Việt (dùng được ngay với Gemini cá nhân)")
    prompt_en: str = Field(description="Prompt hoàn chỉnh tiếng Anh (tối ưu cho model sinh ảnh)")
    model_used: Optional[str] = Field(default=None, description="Model LLM đã soạn prompt (None nếu dùng mẫu)")
    is_template_fallback: bool = Field(
        default=False,
        description="True nếu LLM không khả dụng và prompt được ghép bằng mẫu cố định (vẫn không hallucinate)",
    )
    image_gen_available: bool = Field(description="API sinh ảnh đã được Owner cấu hình và đang bật hay chưa")
    image_gen_unavailable_reason: Optional[str] = Field(default=None)


# ==============================================================================
# 3. DYNAMIC MODEL DISCOVERY SCHEMAS (OWNER)
# ==============================================================================

class DiscoverModelsRequest(BaseModel):
    api_key: str = Field(description="Chuỗi API Key cần kiểm tra và quét model")
    provider: Optional[str] = Field(default="auto", description="'auto', 'gemini', 'openai', 'anthropic', 'custom'")
    task_type: Literal["moderation", "image_generation"] = Field(
        description="Loại tác vụ muốn lấy model: 'moderation' hoặc 'image_generation'"
    )
    base_url: Optional[str] = Field(default=None, description="Custom base URL nếu dùng proxy hoặc local model")


class DiscoveredModelItem(BaseModel):
    id: str = Field(description="ID model để gửi vào API (ví dụ: 'gemini-2.5-flash', 'gpt-4o-mini')")
    display_name: str = Field(description="Tên hiển thị thân thiện trên UI")
    is_recommended: bool = Field(default=False, description="Được hệ thống đánh giá là tối ưu nhất")
    badge: Optional[str] = Field(default=None, description="Huy hiệu hiển thị (ví dụ: 'Khuyên dùng số 1', 'Tốc độ cao')")
    reason: Optional[str] = Field(default=None, description="Lý do đánh giá năng lực của model này")


class DiscoverModelsData(BaseModel):
    is_valid: bool
    detected_provider: str
    task_type: str
    total_models_in_account: int
    recommended_model_id: Optional[str] = None
    discovered_models: List[DiscoveredModelItem]


# ==============================================================================
# 4. OWNER SETTINGS SCHEMAS
# ==============================================================================

class ServiceSettingPayload(BaseModel):
    is_enabled: bool = Field(default=True)
    provider: str = Field(default="gemini")
    api_key: Optional[str] = Field(default=None, description="Khóa API mới (bỏ trống nếu giữ nguyên khóa cũ)")
    model_name: Optional[str] = Field(default=None)
    base_url: Optional[str] = Field(default=None)


class ToggleAiServiceRequest(BaseModel):
    service: Optional[str] = Field(
        default="all",
        description="Dịch vụ cần thao tác: 'all' (toàn bộ hệ thống AI), 'moderation' (kiểm duyệt), 'image_generation' (sinh ảnh)"
    )


class UpdateAiSettingsRequest(BaseModel):
    is_ai_enabled: bool = Field(description="Công tắc tổng AI toàn hệ thống")
    moderation: Optional[ServiceSettingPayload] = None
    image_generation: Optional[ServiceSettingPayload] = None



class ServiceSettingInfo(BaseModel):
    is_enabled: bool
    provider: str
    is_key_configured: bool
    masked_api_key: str
    model_name: Optional[str]
    base_url: Optional[str]


class AiSettingsData(BaseModel):
    is_ai_enabled: bool
    moderation: ServiceSettingInfo
    image_generation: ServiceSettingInfo


# ==============================================================================
# TRANSLATION SCHEMAS
# ==============================================================================

class TranslateContentRequest(BaseModel):
    source_lang: Literal["vi", "en"] = Field(description="Ngôn ngữ gốc của tác giả")
    target_lang: Literal["vi", "en"] = Field(description="Ngôn ngữ cần dịch sang")
    title: Optional[str] = Field(default=None, max_length=300)
    short_content: Optional[str] = Field(default=None, max_length=600)
    content: Optional[str] = Field(default=None, max_length=10000)


class TranslateContentData(BaseModel):
    target_lang: Literal["vi", "en"]
    title: Optional[str] = None
    short_content: Optional[str] = None
    content: Optional[str] = None
    model_used: Optional[str] = None
