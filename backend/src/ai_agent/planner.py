"""
AI 계획 생성 모듈
"""


def generate_plan(analysis: dict) -> dict:
    """분석 결과를 바탕으로 실행 계획 생성"""
    steps = []

    # Always start with analysis confirmation
    steps.append({
        "action": "review_analysis",
        "description": f"Confirm problem: {analysis.get('problem', 'Unknown')}",
        "files": analysis.get("suggested_files", []),
    })

    # Add implementation steps based on complexity
    complexity = analysis.get("estimated_complexity", "low")

    if complexity in ["medium", "high"]:
        steps.append({
            "action": "create_tests",
            "description": "Write failing tests first (TDD)",
            "files": ["tests/"],
        })

    steps.append({
        "action": "implement_fix",
        "description": "Implement the required changes",
        "files": analysis.get("suggested_files", []),
    })

    if complexity in ["medium", "high"]:
        steps.append({
            "action": "run_tests",
            "description": "Run tests to verify fix",
            "files": ["tests/"],
        })

    steps.append({
        "action": "create_pr",
        "description": "Create pull request for review",
        "files": [],
    })

    return {
        "steps": steps,
        "total_steps": len(steps),
        "estimated_complexity": complexity,
    }
