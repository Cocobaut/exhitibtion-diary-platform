import json
from typing import Any, Dict, List, Optional
import httpx
from app.schemas.ai_copilot import (
    ModerateArtData,
    ModerateArtRequest,
    RoomAssessment,
    ViolationDetail,
)
from app.services.badwords_service import BadWordsService

SYSTEM_MODERATION_PROMPT = """Bạn là Trợ lý AI Copilot cao cấp phụ trách kiểm duyệt nội dung nghệ thuật cho nền tảng "Museum of Feelings Platform".
Nhiệm vụ của bạn là kiểm tra bài viết của người dùng đang chờ duyệt, tính điểm theo thang 100 điểm, phát hiện lỗi vi phạm một cách khách quan, nghiêm khắc và đề xuất bản viết lại trung tính.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. ĐIỂM GỐC: 100 điểm. Trừ điểm chính xác theo Rubric:
   - PII (Lộ SĐT, CCCD, địa chỉ riêng, link MXH, STK): -25 điểm.
   - Quảng cáo, buôn bán, cờ bạc, đa cấp, affiliate: -20 điểm.
   - Đăng sai phòng (Room Mismatch): -15 điểm.
     + Room 1 (Đổ Vỡ): Nơi chia sẻ nỗi buồn, tan vỡ, mất mát. Không chấp nhận toxic kích động.
     + Room 2 (Bầu Trời Hy Vọng): Chỉ dành cho ước nguyện tích cực, tương lai, hy vọng. Từ chối nội dung cay đắng, oán hận, tiêu cực.
     + Room 3 (Cây Thông Điệp): Chia sẻ suy tư tích cực, kết nối cộng đồng.
   - Kêu gọi tự hại, thù ghét nhóm người, kích động bạo lực: -15 điểm.
   - Ngôn từ thô tục, chửi thề, teencode tục tĩu: -15 điểm.
   - Ngôn từ tiêu cực/xúc phạm ngữ cảnh: -10 điểm.
   - SPAM, vô nghĩa, spam ký tự/icon: -10 điểm.
   - Bản quyền / vi phạm chính sách khác: -5 điểm.

2. PHÁN QUYẾT:
   - Điểm >= 60: verdict_recommendation = "APPROVE_WITH_EDITS"
   - Điểm < 60: verdict_recommendation = "DISAPPROVE"

3. NGUYÊN TẮC STRICT NO-HALLUCINATION (CỰC KỲ QUAN TRỌNG):
   - Bản 'suggested_content' tuyệt đối KHÔNG ĐƯỢC thêm ý mới, không bịa chi tiết bên ngoài.
   - Chỉ được: Thay từ tục thành từ trung tính, ẩn số điện thoại (098***), điều chỉnh xưng hô, sửa lỗi chính tả ngữ pháp.
   - Giữ nguyên toàn bộ cấu trúc và ý nghĩa gốc của tác giả.

4. ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON SCHEMA):
{
  "score": 75,
  "verdict_recommendation": "APPROVE_WITH_EDITS" | "DISAPPROVE",
  "violations": [
    {
      "category": "pii" | "advertising" | "room_mismatch" | "hate_speech" | "profanity_dictionary" | "profanity_contextual" | "spam" | "copyright_policy",
      "deducted_points": 15,
      "line_number": 1,
      "quote": "cụm từ vi phạm thực tế",
      "reason": "Giải thích lý do"
    }
  ],
  "room_assessment": {
    "current_room": "room1" | "room2" | "room3",
    "is_valid": true | false,
    "suggested_room": "room1" | "room2" | "room3",
    "reason": "Lý do đánh giá phòng"
  },
  "suggested_content": "Văn bản đã được làm sạch trung tính, giữ nguyên cốt truyện gốc"
}
"""


class AiModerationService:

    @classmethod
    async def moderate(
        cls,
        req: ModerateArtRequest,
        provider: str,
        api_key: str,
        model_name: str,
        base_url: Optional[str] = None,
    ) -> ModerateArtData:
        """Executes moderation using rule engine pre-filter + LLM reasoning."""
        # 1. Rule Engine Pre-filter
        rule_violations = BadWordsService.detect_violations(req.content)

        # 2. Room Assessment Rule
        room_check = cls._check_room_appropriateness(req.target_room, req.content)

        # 3. Call LLM for deep analysis & rewrite
        llm_data = None
        try:
            if provider == "gemini":
                llm_data = await cls._call_gemini(req, api_key, model_name)
            elif provider in ("openai", "custom"):
                llm_data = await cls._call_openai(req, api_key, model_name, base_url)
        except Exception as e:
            print(f"Warning: LLM moderation call failed, using rule engine fallback: {e}")

        # 4. Integrate or fallback
        if llm_data:
            return ModerateArtData(
                art_id=req.art_id,
                score=llm_data.get("score", 75),
                verdict_recommendation=llm_data.get("verdict_recommendation", "APPROVE_WITH_EDITS"),
                violations=[ViolationDetail(**v) for v in llm_data.get("violations", [])],
                room_assessment=RoomAssessment(**llm_data.get("room_assessment", room_check)),
                suggested_content=llm_data.get("suggested_content", req.content),
            )

        # Fallback to rule engine results
        all_violations = list(rule_violations)
        if not room_check["is_valid"]:
            all_violations.append(ViolationDetail(
                category="room_mismatch",
                deducted_points=15,
                line_number=1,
                quote=req.content[:30] + "...",
                reason=room_check["reason"],
            ))

        total_penalty = sum(v.deducted_points for v in all_violations)
        score = max(0, 100 - total_penalty)
        verdict = "APPROVE_WITH_EDITS" if score >= 60 else "DISAPPROVE"
        suggested = BadWordsService.apply_strict_no_hallucination_rewrite(req.content)

        return ModerateArtData(
            art_id=req.art_id,
            score=score,
            verdict_recommendation=verdict,
            violations=all_violations,
            room_assessment=RoomAssessment(**room_check),
            suggested_content=suggested,
        )

    @classmethod
    def _check_room_appropriateness(cls, target_room: str, content: str) -> Dict[str, Any]:
        toxic_markers = ["hận thù", "trả thù", "chết đi", "đổ vỡ", "tan nát", "tuyệt vọng", "oán hận"]
        is_venting_bitter = any(m in content.lower() for m in toxic_markers)

        if target_room == "room2" and is_venting_bitter:
            return {
                "current_room": "room2",
                "is_valid": False,
                "suggested_room": "room1",
                "reason": "Bầu trời Hy Vọng (Room 2) yêu cầu nội dung hướng tới ước nguyện tương lai tích cực. Tâm trạng đổ vỡ/oán hận phù hợp với Phòng Đổ Vỡ (Room 1) hơn.",
            }
        return {
            "current_room": target_room,
            "is_valid": True,
            "suggested_room": target_room,
            "reason": "Nội dung bài viết phù hợp với tính chất của phòng triển lãm này.",
        }

    @classmethod
    async def _call_gemini(cls, req: ModerateArtRequest, api_key: str, model_name: str) -> Optional[Dict[str, Any]]:
        # Candidate models list: start with chosen model, fallback to active versions if 404/503
        candidates = [model_name]
        for fallback in ["gemini-3-flash-preview", "gemini-3.6-flash", "gemini-3.5-flash"]:
            if fallback not in candidates:
                candidates.append(fallback)

        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_MODERATION_PROMPT}]},
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"Phòng đăng ký: {req.target_room}\nNội dung bài viết:\n{req.content}"
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            for m in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key.strip()}"
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates_list = data.get("candidates", [])
                        if candidates_list:
                            text = candidates_list[0]["content"]["parts"][0]["text"]
                            print(f"[AI Copilot Moderation] Real Google Gemini LLM ({m}) responded successfully!")
                            return json.loads(text)
                    else:
                        print(f"[AI Copilot Moderation] Model {m} returned HTTP {resp.status_code}, trying fallback candidate...")
                except Exception as ex:
                    print(f"[AI Copilot Moderation] Error calling {m}: {ex}")

        return None


    @classmethod
    async def _call_openai(
        cls, req: ModerateArtRequest, api_key: str, model_name: str, base_url: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        root_url = (base_url or "https://api.openai.com").rstrip("/")
        url = f"{root_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_MODERATION_PROMPT},
                {"role": "user", "content": f"Phòng đăng ký: {req.target_room}\nNội dung bài viết:\n{req.content}"},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["choices"][0]["message"]["content"]
                return json.loads(text)
        return None
