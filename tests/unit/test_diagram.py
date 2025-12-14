"""
DIAGRAM 코드 다이어그램 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.7

P0 테스트:
- DG-U01: test_dependency_graph_build
- DG-U02: test_node_status_color
- DG-U03: test_error_node_highlight
"""

import pytest
from unittest.mock import Mock, patch


class TestDependencyGraph:
    """의존성 그래프 테스트"""

    def test_dependency_graph_build(self):
        """DG-U01: 의존성 그래프 생성 (P0)"""
        # Arrange
        from backend.src.diagram.builder import build_dependency_graph

        files = [
            {"path": "src/main.py", "imports": ["src/utils.py", "src/config.py"]},
            {"path": "src/utils.py", "imports": []},
            {"path": "src/config.py", "imports": ["src/utils.py"]},
        ]

        # Act
        graph = build_dependency_graph(files)

        # Assert
        assert graph is not None
        assert len(graph["nodes"]) == 3
        assert len(graph["edges"]) == 3  # main->utils, main->config, config->utils

    def test_node_status_color(self):
        """DG-U02: 노드 상태 색상 (P0)"""
        # Arrange
        from backend.src.diagram.styling import get_node_color

        # Act & Assert
        assert get_node_color("success") == "#22c55e"  # green
        assert get_node_color("error") == "#ef4444"  # red
        assert get_node_color("warning") == "#f59e0b"  # yellow
        assert get_node_color("default") == "#6b7280"  # gray

    def test_error_node_highlight(self):
        """DG-U03: 에러 노드 하이라이트 (P0)"""
        # Arrange
        from backend.src.diagram.builder import highlight_error_nodes

        graph = {
            "nodes": [
                {"id": "src/main.py", "status": "success"},
                {"id": "src/auth.py", "status": "success"},
                {"id": "src/utils.py", "status": "success"},
            ],
            "edges": [],
        }
        error_files = ["src/auth.py"]

        # Act
        updated_graph = highlight_error_nodes(graph, error_files)

        # Assert
        auth_node = next(n for n in updated_graph["nodes"] if n["id"] == "src/auth.py")
        assert auth_node["status"] == "error"
        assert auth_node["highlight"] is True


class TestTreeSitter:
    """Tree-sitter 파싱 테스트"""

    def test_tree_sitter_parse(self):
        """DG-U04: Tree-sitter 파싱 (P1)"""
        # Arrange
        from backend.src.diagram.parser import parse_file_structure

        python_code = """
def hello():
    print("Hello")

class MyClass:
    def method(self):
        pass
"""

        # Act
        structure = parse_file_structure(python_code, language="python")

        # Assert
        assert structure is not None
        assert "functions" in structure
        assert "classes" in structure
        assert len(structure["functions"]) == 1
        assert structure["functions"][0]["name"] == "hello"
        assert len(structure["classes"]) == 1
        assert structure["classes"][0]["name"] == "MyClass"
