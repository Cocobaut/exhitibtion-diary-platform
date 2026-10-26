import json
from pathlib import Path
import re
from typing import Any, Dict, List, Tuple
from app.schemas.ai_copilot import ViolationDetail

# Regex Patterns for PII
VIETNAMESE_PHONE_REGEX = re.compile(
    r"(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b"
)
SOCIAL_MEDIA_REGEX = re.compile(
    r"(?:https?://)?(?:www\.)?(?:facebook\.com|fb\.com|zalo\.me|t\.me|tiktok\.com)/[A-Za-z0-9_.-]+",
    re.IGNORECASE,
)
BANK_ACCOUNT_REGEX = re.compile(
    r"\b(?:stk|số tài khoản|ngân hàng|momo|vcb|vietcombank|techcombank|mb)\b[\s:]*([0-9]{9,16})",
    re.IGNORECASE,
)

# Regex Patterns for PR & Commercial Spam
COMMERCIAL_PR_REGEX = re.compile(
    r"\b(?:vay tiền|cho vay|tuyển dụng|việc nhẹ lương cao|đa cấp|cờ bạc|tài xỉu|nổ hũ|affiliate|mua ngay|inbox mua|ship cod|giảm giá)\b",
    re.IGNORECASE,
)


class BadWordsService:
    _lookup_cache: Dict[str, Dict[str, Any]] = {}
    _is_loaded: bool = False

    @classmethod
    def _ensure_loaded(cls):
        if cls._is_loaded and cls._lookup_cache:
            return

        seed_path = Path(__file__).resolve().parent.parent.parent / "database" / "badwords_seed.json"
        if not seed_path.exists():
            return

        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            lookup = {}
            for entry in data:
                all_terms = [entry["term"]] + entry.get("variants", [])
                for term in all_terms:
                    t = term.strip().lower()
                    if t:
                        lookup[t] = {
                            "primary_term": entry["term"],
                            "category": entry.get("category", "profanity_severe"),
                            "penalty": entry.get("base_penalty", 15),
                        }
            cls._lookup_cache = lookup
            cls._is_loaded = True
        except Exception as e:
            print(f"Warning: Failed to load badwords seed: {e}")

    @classmethod
    def detect_violations(cls, text: str) -> List[ViolationDetail]:
        """Scan text and return detailed violations strictly adhering to Rubric."""
        cls._ensure_loaded()
        violations: List[ViolationDetail] = []
        lines = text.split("\n")

        for line_idx, line in enumerate(lines, start=1):
            line_str = line.strip()
            if not line_str:
                continue

            # 1. PII - Phone
            for m in VIETNAMESE_PHONE_REGEX.finditer(line_str):
                violations.append(ViolationDetail(
                    category="pii",
                    deducted_points=25,
                    line_number=line_idx,
                    quote=m.group(0),
                    reason="Lộ số điện thoại liên lạc cá nhân",
                ))

            # 1. PII - Social Media Links
            for m in SOCIAL_MEDIA_REGEX.finditer(line_str):
                violations.append(ViolationDetail(
                    category="pii",
                    deducted_points=25,
                    line_number=line_idx,
                    quote=m.group(0),
                    reason="Lộ liên kết mạng xã hội cá nhân",
                ))

            # 1. PII - Bank Accounts
            for m in BANK_ACCOUNT_REGEX.finditer(line_str):
                violations.append(ViolationDetail(
                    category="pii",
                    deducted_points=25,
                    line_number=line_idx,
                    quote=m.group(0),
                    reason="Lộ thông tin tài khoản ngân hàng / ví điện tử",
                ))

            # 2. PR / Commercial Advertising
            for m in COMMERCIAL_PR_REGEX.finditer(line_str):
                violations.append(ViolationDetail(
                    category="advertising",
                    deducted_points=20,
                    line_number=line_idx,
                    quote=m.group(0),
                    reason="Nội dung quảng cáo bán hàng / tài chính / dịch vụ thương mại",
                ))

            # 5. Profanity Dictionary Check
            lowered_line = line_str.lower()
            for term, meta in cls._lookup_cache.items():
                pattern = r"(?<!\w)" + re.escape(term) + r"(?!\w)"
                matches = list(re.finditer(pattern, lowered_line, re.IGNORECASE))
                if not matches and any(char in "!@#$%^&*._-" for char in term):
                    if term in lowered_line:
                        violations.append(ViolationDetail(
                            category="profanity_dictionary",
                            deducted_points=meta["penalty"],
                            line_number=line_idx,
                            quote=term,
                            reason=f"Sử dụng từ ngữ tục tĩu / xúc phạm ('{meta['primary_term']}')",
                        ))
                        continue

                for match in matches:
                    actual_quote = line_str[match.start():match.end()]
                    violations.append(ViolationDetail(
                        category="profanity_dictionary",
                        deducted_points=meta["penalty"],
                        line_number=line_idx,
                        quote=actual_quote,
                        reason=f"Sử dụng từ ngữ thô tục / xúc phạm ('{meta['primary_term']}')",
                    ))

        return violations

    @classmethod
    def apply_strict_no_hallucination_rewrite(cls, text: str) -> str:
        """Sanitizes text without fabricating new details or adding external information."""
        result = text
        # 1. Mask Phone Numbers
        result = VIETNAMESE_PHONE_REGEX.sub("098***", result)
        # 2. Mask Social URLs
        result = SOCIAL_MEDIA_REGEX.sub("[liên kết cá nhân đã ẩn]", result)
        # 3. Mask Bank Accounts
        result = BANK_ACCOUNT_REGEX.sub("[tài khoản ngân hàng đã ẩn]", result)
        # 4. Remove obvious spam ads
        result = COMMERCIAL_PR_REGEX.sub("[quảng cáo đã gỡ]", result)

        # 5. Neutralize vulgar language
        replacements = {
            r"(?i)\bđịt\b": "đối xử",
            r"(?i)\bđụ\b": "buồn lòng",
            r"(?i)\bđụ má\b": "thật sự",
            r"(?i)\bđịt con mẹ\b": "thật sự tồi tệ",
            r"(?i)\blồn\b": "chuyện không vui",
            r"(?i)\bcặc\b": "chuyện tồi tệ",
            r"(?i)\bvl\b": "rất nhiều",
            r"(?i)\bvcl\b": "rất nhiều",
            r"(?i)\bóc chó\b": "thiếu chín chắn",
            r"(?i)\bsúc vật\b": "người nhẫn tâm",
            r"(?i)\bphò\b": "người thiếu đứng đắn",
            r"(?i)\bfuck\b": "damn",
            r"(?i)\bchịch\b": "gặp gỡ",
            r"(?i)\bchó\b": "kẻ phản bội",
        }
        for pat, rep in replacements.items():
            result = re.sub(pat, rep, result)

        return result
