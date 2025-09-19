"""
State management for Custom Agent
"""

from .state import (
    AgentState,
    create_initial_state,
    update_state,
    get_stage_result,
    set_stage_result,
    add_message,
    set_error,
    clear_error
)

__all__ = [
    "AgentState",
    "create_initial_state",
    "update_state",
    "get_stage_result",
    "set_stage_result",
    "add_message",
    "set_error",
    "clear_error"
]
