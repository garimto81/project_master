# Diagram Module
from .builder import build_dependency_graph, highlight_error_nodes
from .styling import get_node_color
from .parser import parse_file_structure

__all__ = [
    "build_dependency_graph",
    "highlight_error_nodes",
    "get_node_color",
    "parse_file_structure",
]
