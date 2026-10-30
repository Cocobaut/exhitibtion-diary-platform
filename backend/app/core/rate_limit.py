"""Giới hạn số lần thử trong bộ nhớ (đủ cho một tiến trình backend duy nhất).

Dùng để chặn dò mật khẩu và spam email đặt lại mật khẩu. Nếu sau này chạy nhiều
worker/instance thì cần chuyển sang kho dùng chung như Redis.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict


class SlidingWindowLimiter:
    def __init__(self, max_hits: int, window_seconds: int):
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def _prune(self, key: str, now: float) -> Deque[float]:
        hits = self._hits[key]
        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()
        if not hits:
            self._hits.pop(key, None)
        return hits

    def is_blocked(self, key: str) -> bool:
        return len(self._prune(key, time.monotonic())) >= self.max_hits

    def hit(self, key: str) -> None:
        now = time.monotonic()
        self._prune(key, now)
        self._hits[key].append(now)

    def reset(self, key: str) -> None:
        self._hits.pop(key, None)

    def clear(self) -> None:
        self._hits.clear()


# Đăng nhập sai: tối đa 5 lần / 15 phút cho mỗi cặp IP + tài khoản, 30 lần / 15 phút cho mỗi IP
login_account_limiter = SlidingWindowLimiter(max_hits=5, window_seconds=15 * 60)
login_ip_limiter = SlidingWindowLimiter(max_hits=30, window_seconds=15 * 60)

# Yêu cầu email đặt lại mật khẩu: 3 lần / giờ cho mỗi email, 10 lần / giờ cho mỗi IP
reset_email_limiter = SlidingWindowLimiter(max_hits=3, window_seconds=60 * 60)
reset_ip_limiter = SlidingWindowLimiter(max_hits=10, window_seconds=60 * 60)
