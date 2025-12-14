"""
의존성 그래프 빌더 모듈
"""


def build_dependency_graph(files: list[dict]) -> dict:
    """파일 목록에서 의존성 그래프 생성"""
    nodes = []
    edges = []

    # Build nodes
    for file in files:
        path = file.get("path", "")
        nodes.append({
            "id": path,
            "label": path.split("/")[-1],
            "status": "default",
        })

    # Build edges from imports
    for file in files:
        source = file.get("path", "")
        imports = file.get("imports", [])
        for target in imports:
            edges.append({
                "source": source,
                "target": target,
            })

    return {
        "nodes": nodes,
        "edges": edges,
    }


def highlight_error_nodes(graph: dict, error_files: list[str]) -> dict:
    """에러 파일에 해당하는 노드 하이라이트"""
    updated_nodes = []

    for node in graph.get("nodes", []):
        updated_node = node.copy()
        if node["id"] in error_files:
            updated_node["status"] = "error"
            updated_node["highlight"] = True
        updated_nodes.append(updated_node)

    return {
        "nodes": updated_nodes,
        "edges": graph.get("edges", []),
    }
