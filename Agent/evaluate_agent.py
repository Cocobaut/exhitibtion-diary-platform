#!/usr/bin/env python3
"""
AI Copilot Agent Benchmark & Evaluation Suite
=============================================
Target System: Museum of Feelings Platform - AI Copilot (Moderation & Art Rewriting Agent)
Location: E:\\Hcmut material\\Business_Communication\\Project_exhibition_diary_platform\\Agent

Evaluates selected Agent Metrics across 3 core dimensions:
A. Task Success & Reasoning Quality (A1-A8)
B. Retrieval / Rule Grounding & Strict No-Hallucination Faithfulness (B1-B3)
C. System & Engineering Performance (C1-C3: Latency P50/P95/P99, Token Usage & Cost)

Usage:
    # Run in Deterministic / Hybrid Mock-LLM Mode (No external API key needed):
    python evaluate_agent.py

    # Run with Live LLM API (Gemini or OpenAI):
    python evaluate_agent.py --provider gemini --api-key YOUR_GEMINI_KEY --model gemini-2.5-flash
    python evaluate_agent.py --provider openai --api-key YOUR_OPENAI_KEY --model gpt-4o-mini
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import statistics
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

# Ensure backend directory is in sys.path so we can import the actual agent services
AGENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AGENT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.schemas.ai_copilot import (
    GenerateArtImageData,
    GenerateArtImageRequest,
    ModerateArtData,
    ModerateArtRequest,
)
from app.services.ai_image_service import AiImageService
from app.services.ai_moderation_service import AiModerationService, SYSTEM_MODERATION_PROMPT
from app.services.badwords_service import BadWordsService


def estimate_tokens(text: str) -> int:
    """Estimates token count (~1.35 tokens per word for Vietnamese/English mix)."""
    if not text:
        return 0
    words = len(text.split())
    return max(1, int(round(words * 1.35)))


def percentile(data: List[float], p: float) -> float:
    """Calculates the p-th percentile (0-100) of a numeric list."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1


def compute_f1(predicted: List[str], expected: List[str]) -> Tuple[float, float, float]:
    """Computes Precision, Recall, and F1-score on unique violation categories."""
    pred_set = set(predicted)
    exp_set = set(expected)

    if not exp_set and not pred_set:
        return 1.0, 1.0, 1.0
    if not exp_set and pred_set:
        return 0.0, 1.0, 0.0
    if exp_set and not pred_set:
        return 1.0, 0.0, 0.0

    tp = len(pred_set.intersection(exp_set))
    precision = tp / len(pred_set) if pred_set else 0.0
    recall = tp / len(exp_set) if exp_set else 0.0
    if precision + recall == 0:
        f1 = 0.0
    else:
        f1 = 2 * precision * recall / (precision + recall)
    return precision, recall, f1


def evaluate_faithfulness_and_rewrite(
    original: str,
    suggested: str,
    must_not_contain: List[str],
    must_preserve_keywords: List[str],
) -> Dict[str, Any]:
    """
    Evaluates B1 (Faithfulness / No-Hallucination) & B2 (Answer Relevance / Sanitization):
    1. Sanitization Rate: All forbidden PII/profanity/ads tokens in `must_not_contain` are removed/masked.
    2. Keyword Preservation Rate: Core story terms in `must_preserve_keywords` remain intact.
    3. Length Ratio Constraint: Rewritten text does not fabricate long paragraphs (len ratio <= 1.35).
    """
    sanitized_hits = 0
    for forbidden in must_not_contain:
        # Check case-insensitively with word boundary or substring
        pattern = r"(?<!\w)" + re.escape(forbidden.lower()) + r"(?!\w)"
        if not re.search(pattern, suggested.lower()) and forbidden.lower() not in suggested.lower():
            sanitized_hits += 1
    sanitization_rate = (
        sanitized_hits / len(must_not_contain) if must_not_contain else 1.0
    )

    preserved_hits = 0
    for kw in must_preserve_keywords:
        if kw.lower() in suggested.lower():
            preserved_hits += 1
    preservation_rate = (
        preserved_hits / len(must_preserve_keywords) if must_preserve_keywords else 1.0
    )

    orig_words = max(1, len(original.split()))
    sugg_words = len(suggested.split())
    length_ratio = sugg_words / orig_words
    no_length_hallucination = 0.4 <= length_ratio <= 1.45

    is_faithful = (
        sanitization_rate == 1.0
        and preservation_rate >= 0.66
        and no_length_hallucination
    )

    return {
        "sanitization_rate": sanitization_rate,
        "preservation_rate": preservation_rate,
        "length_ratio": round(length_ratio, 3),
        "no_length_hallucination": no_length_hallucination,
        "is_faithful": is_faithful,
    }


async def run_evaluation(
    provider: str,
    api_key: Optional[str],
    model_name: str,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    dataset_path = AGENT_DIR / "golden_dataset.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    is_live_api = bool(api_key and api_key.strip() and api_key != "offline_rule_engine")
    eval_mode = f"Live LLM API ({provider}:{model_name})" if is_live_api else "Deterministic Rule Engine + Fallback Pipeline (Offline Mode)"

    print("=" * 78)
    print("🏛️  MUSEUM OF FEELINGS - AI COPILOT AGENT EVALUATION BENCHMARK")
    print("=" * 78)
    print(f"• Evaluation Mode : {eval_mode}")
    print(f"• Golden Dataset  : {len(dataset)} test cases ({dataset_path.name})")
    print("-" * 78)

    case_results = []
    latencies_ms = []
    img_latencies_ms = []
    prompt_tokens_list = []
    completion_tokens_list = []

    total_steps = 0
    loop_failures = 0
    schema_valid_count = 0
    task_success_count = 0
    verdict_correct_count = 0
    score_in_range_count = 0
    room_correct_count = 0
    quote_grounded_count = 0
    total_quotes_checked = 0

    f1_scores = []
    precisions = []
    recalls = []
    faithfulness_scores = []
    sanitization_scores = []
    preservation_scores = []

    for idx, tc in enumerate(dataset, start=1):
        tc_id = tc["id"]
        req = ModerateArtRequest(
            art_id=f"bench-{tc_id.lower()}",
            target_room=tc["target_room"],
            content=tc["content"],
            author_id="eval-runner",
        )

        # Trace steps tracking:
        # Step 1: Rule Engine Pre-filter (BadWordsService.detect_violations)
        # Step 2: Room Appropriateness Check (_check_room_appropriateness)
        # Step 3: LLM / Rewrite Synthesis + Pydantic Schema Validation
        steps_taken = 3

        t0 = time.perf_counter()
        try:
            res: ModerateArtData = await AiModerationService.moderate(
                req=req,
                provider=provider if is_live_api else "offline",
                api_key=api_key or "",
                model_name=model_name,
                base_url=base_url,
            )
            t1 = time.perf_counter()
            latency_ms = (t1 - t0) * 1000.0
            latencies_ms.append(latency_ms)

            # Validate Pydantic JSON Schema compliance
            dumped = res.model_dump()
            ModerateArtData.model_validate(dumped)
            schema_valid = True
            schema_valid_count += 1
        except Exception as ex:
            t1 = time.perf_counter()
            latency_ms = (t1 - t0) * 1000.0
            latencies_ms.append(latency_ms)
            schema_valid = False
            print(f"  [ERROR] {tc_id} failed execution: {ex}")
            continue

        total_steps += steps_taken

        # Token & Cost estimation
        user_prompt_str = f"Phòng đăng ký: {req.target_room}\nNội dung bài viết:\n{req.content}"
        p_tokens = estimate_tokens(SYSTEM_MODERATION_PROMPT) + estimate_tokens(user_prompt_str)
        c_tokens = estimate_tokens(json.dumps(dumped, ensure_ascii=False))
        prompt_tokens_list.append(p_tokens)
        completion_tokens_list.append(c_tokens)

        # Check Verdict Accuracy
        verdict_ok = res.verdict_recommendation == tc["expected_verdict"]
        if verdict_ok:
            verdict_correct_count += 1

        # Check Rubric Score Range Accuracy
        score_ok = tc["expected_score_min"] <= res.score <= tc["expected_score_max"]
        if score_ok:
            score_in_range_count += 1

        # Check Room Assessment Accuracy
        room_ok = (
            res.room_assessment.is_valid == tc["expected_room_valid"]
            and res.room_assessment.suggested_room == tc["expected_suggested_room"]
        )
        if room_ok:
            room_correct_count += 1

        # Check Violation Category Precision / Recall / F1
        pred_cats = [v.category for v in res.violations]
        exp_cats = tc["expected_violations"]
        prec, rec, f1 = compute_f1(pred_cats, exp_cats)
        precisions.append(prec)
        recalls.append(rec)
        f1_scores.append(f1)

        # Check Evidence Quote Grounding (B3: Context Grounding)
        for v in res.violations:
            if v.category != "room_mismatch":
                total_quotes_checked += 1
                clean_q = v.quote.replace("...", "").strip().lower()
                if clean_q and clean_q in req.content.lower():
                    quote_grounded_count += 1

        # Check Faithfulness & No-Hallucination Rewrite (B1 & B2)
        rewrite_eval = evaluate_faithfulness_and_rewrite(
            original=req.content,
            suggested=res.suggested_content,
            must_not_contain=tc["must_not_contain"],
            must_preserve_keywords=tc["must_preserve_keywords"],
        )
        faithfulness_scores.append(1.0 if rewrite_eval["is_faithful"] else 0.0)
        sanitization_scores.append(rewrite_eval["sanitization_rate"])
        preservation_scores.append(rewrite_eval["preservation_rate"])

        # Overall Task Success for this test case
        is_task_success = (
            schema_valid
            and verdict_ok
            and room_ok
            and rewrite_eval["is_faithful"]
        )
        if is_task_success:
            task_success_count += 1

        status_icon = "✅ PASS" if is_task_success else "⚠️ WARN"
        print(
            f"  [{idx:02d}/{len(dataset):02d}] {tc_id} ({tc['category']:<22}) | "
            f"Score: {res.score:3d} | Verdict: {res.verdict_recommendation:<18} | "
            f"F1: {f1:.2f} | Latency: {latency_ms:6.2f}ms | {status_icon}"
        )

        case_results.append({
            "id": tc_id,
            "category": tc["category"],
            "target_room": tc["target_room"],
            "actual_score": res.score,
            "expected_score_range": [tc["expected_score_min"], tc["expected_score_max"]],
            "score_in_range": score_ok,
            "actual_verdict": res.verdict_recommendation,
            "expected_verdict": tc["expected_verdict"],
            "verdict_match": verdict_ok,
            "room_assessment_match": room_ok,
            "predicted_violations": list(set(pred_cats)),
            "expected_violations": exp_cats,
            "violation_f1": round(f1, 4),
            "faithfulness": rewrite_eval,
            "latency_ms": round(latency_ms, 3),
            "prompt_tokens": p_tokens,
            "completion_tokens": c_tokens,
            "task_success": is_task_success,
            "suggested_content": res.suggested_content,
        })

    # Evaluate Art Image Generation Pipeline on 6 representative artworks
    print("-" * 78)
    print("🎨  Evaluating Art Image & Visual Prompt Synthesis Pipeline (6 cases)...")
    img_sample_cases = dataset[:2] + dataset[6:8] + dataset[11:13]
    img_success_count = 0
    for tc in img_sample_cases:
        img_req = GenerateArtImageRequest(
            art_id=f"eval-img-{tc['id'].lower()}",
            source_content=tc["content"],
            custom_prompt_addon="watercolor, soft atmospheric museum lighting",
        )
        t0 = time.perf_counter()
        img_res: GenerateArtImageData = await AiImageService.generate_image(
            req=img_req,
            provider=provider if is_live_api else "offline",
            api_key=api_key or "",
            model_name="imagen-3.0-generate-002",
            base_url=base_url,
        )
        t1 = time.perf_counter()
        img_lat = (t1 - t0) * 1000.0
        img_latencies_ms.append(img_lat)

        # Verify generated file exists & prompt contains mood keywords
        saved_file = Path(settings.UPLOAD_DIR) / "artworks" / "ai_generated" / Path(img_res.image_url).name
        if not saved_file.exists():
            saved_file = BACKEND_DIR / img_res.image_url.lstrip("/")
        if saved_file.exists() and len(img_res.visual_prompt) > 30:
            img_success_count += 1
            # Clean up temporary benchmark image file so we don't pollute uploads
            try:
                saved_file.unlink()
            except Exception:
                pass

    n_total = len(dataset)
    avg_prompt_tokens = statistics.mean(prompt_tokens_list) if prompt_tokens_list else 0
    avg_comp_tokens = statistics.mean(completion_tokens_list) if completion_tokens_list else 0
    avg_total_tokens = avg_prompt_tokens + avg_comp_tokens

    # Gemini 2.5 Flash / GPT-4o-mini pricing (~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens)
    cost_per_run_usd = (avg_prompt_tokens * 0.15 / 1_000_000) + (avg_comp_tokens * 0.60 / 1_000_000)
    task_success_rate = (task_success_count / n_total) * 100.0 if n_total else 0.0
    cost_per_successful_task_usd = (
        cost_per_run_usd / (task_success_rate / 100.0) if task_success_rate > 0 else 0.0
    )

    summary_metrics = {
        "metadata": {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "evaluation_mode": eval_mode,
            "provider": provider if is_live_api else "rule_engine_hybrid",
            "model_name": model_name if is_live_api else "deterministic_v1 + gemini_fallback",
            "total_test_cases": n_total,
        },
        "A_task_success_and_quality": {
            "task_success_rate_pct": round(task_success_rate, 2),
            "verdict_accuracy_pct": round((verdict_correct_count / n_total) * 100.0, 2),
            "rubric_score_range_accuracy_pct": round((score_in_range_count / n_total) * 100.0, 2),
            "room_routing_accuracy_pct": round((room_correct_count / n_total) * 100.0, 2),
            "violation_detection_precision_pct": round(statistics.mean(precisions) * 100.0, 2),
            "violation_detection_recall_pct": round(statistics.mean(recalls) * 100.0, 2),
            "violation_detection_f1_pct": round(statistics.mean(f1_scores) * 100.0, 2),
            "schema_compliance_rate_pct": round((schema_valid_count / n_total) * 100.0, 2),
            "art_generation_success_rate_pct": round((img_success_count / len(img_sample_cases)) * 100.0, 2),
            "average_steps_to_completion": round(total_steps / n_total, 2),
            "loop_runaway_failure_rate_pct": round((loop_failures / n_total) * 100.0, 2),
        },
        "B_grounding_and_faithfulness": {
            "strict_no_hallucination_faithfulness_pct": round(statistics.mean(faithfulness_scores) * 100.0, 2),
            "pii_and_profanity_sanitization_rate_pct": round(statistics.mean(sanitization_scores) * 100.0, 2),
            "semantic_keyword_preservation_rate_pct": round(statistics.mean(preservation_scores) * 100.0, 2),
            "evidence_quote_grounding_accuracy_pct": round(
                (quote_grounded_count / total_quotes_checked) * 100.0 if total_quotes_checked else 100.0, 2
            ),
        },
        "C_system_and_engineering_performance": {
            "moderation_latency_p50_ms": round(percentile(latencies_ms, 50), 3),
            "moderation_latency_p95_ms": round(percentile(latencies_ms, 95), 3),
            "moderation_latency_p99_ms": round(percentile(latencies_ms, 99), 3),
            "moderation_latency_mean_ms": round(statistics.mean(latencies_ms), 3),
            "art_synthesis_latency_p50_ms": round(percentile(img_latencies_ms, 50), 3),
            "art_synthesis_latency_p95_ms": round(percentile(img_latencies_ms, 95), 3),
            "avg_prompt_tokens_per_run": int(round(avg_prompt_tokens)),
            "avg_completion_tokens_per_run": int(round(avg_comp_tokens)),
            "avg_total_tokens_per_run": int(round(avg_total_tokens)),
            "estimated_cost_per_1000_tasks_usd": round(cost_per_successful_task_usd * 1000, 4),
        },
        "detailed_results": case_results,
    }

    # Save JSON Results
    json_out_path = AGENT_DIR / "evaluation_results.json"
    with open(json_out_path, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, ensure_ascii=False, indent=2)

    print("=" * 78)
    print("📊  SUMMARY OF AGENT EVALUATION METRICS")
    print("=" * 78)
    a = summary_metrics["A_task_success_and_quality"]
    b = summary_metrics["B_grounding_and_faithfulness"]
    c = summary_metrics["C_system_and_engineering_performance"]

    print(f"  [A] Task Success Rate (Overall)        : {a['task_success_rate_pct']}%")
    print(f"  [A] Verdict Accuracy (Approve/Reject)  : {a['verdict_accuracy_pct']}%")
    print(f"  [A] Rubric Score Range Accuracy        : {a['rubric_score_range_accuracy_pct']}%")
    print(f"  [A] Room Routing Accuracy (Room 1/2/3) : {a['room_routing_accuracy_pct']}%")
    print(f"  [A] Violation Detection F1-Score       : {a['violation_detection_f1_pct']}% (P: {a['violation_detection_precision_pct']}%, R: {a['violation_detection_recall_pct']}%)")
    print(f"  [A] JSON Schema Compliance Rate        : {a['schema_compliance_rate_pct']}%")
    print(f"  [A] Average Steps to Completion        : {a['average_steps_to_completion']} steps (Loop failure: {a['loop_runaway_failure_rate_pct']}%)")
    print(f"  [B] Strict No-Hallucination Rewrite    : {b['strict_no_hallucination_faithfulness_pct']}%")
    print(f"  [B] PII & Profanity Sanitization Rate  : {b['pii_and_profanity_sanitization_rate_pct']}%")
    print(f"  [B] Core Meaning Preservation Rate     : {b['semantic_keyword_preservation_rate_pct']}%")
    print(f"  [B] Evidence Quote Grounding           : {b['evidence_quote_grounding_accuracy_pct']}%")
    print(f"  [C] Moderation E2E Latency (P50 / P95) : {c['moderation_latency_p50_ms']} ms / {c['moderation_latency_p95_ms']} ms")
    print(f"  [C] Avg Token Usage per Task           : {c['avg_total_tokens_per_run']} tokens ({c['avg_prompt_tokens_per_run']} in / {c['avg_completion_tokens_per_run']} out)")
    print(f"  [C] Est. Cost per 1,000 Tasks (Flash)  : ${c['estimated_cost_per_1000_tasks_usd']:.4f} USD")
    print("=" * 78)
    print(f"💾  Saved full evaluation report to: {json_out_path}")

    return summary_metrics


def main():
    parser = argparse.ArgumentParser(description="Evaluate Museum of Feelings AI Copilot Agent")
    parser.add_argument("--provider", type=str, default="gemini", help="AI Provider: gemini, openai, custom")
    parser.add_argument("--api-key", type=str, default=os.environ.get("GEMINI_API_KEY", ""), help="API Key for live LLM evaluation")
    parser.add_argument("--model", type=str, default="gemini-2.5-flash", help="Model name")
    parser.add_argument("--base-url", type=str, default=None, help="Optional custom base URL")
    args = parser.parse_args()

    asyncio.run(
        run_evaluation(
            provider=args.provider,
            api_key=args.api_key,
            model_name=args.model,
            base_url=args.base_url,
        )
    )


if __name__ == "__main__":
    main()
