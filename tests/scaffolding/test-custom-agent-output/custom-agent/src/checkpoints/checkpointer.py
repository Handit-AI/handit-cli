"""
Checkpointer configuration for Custom Agent LangGraph
Provides persistence and state management for graph execution
"""

import os
from typing import Optional
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.memory import MemorySaver

def create_checkpointer() -> Optional[SqliteSaver]:
    """
    Create checkpointer instance for graph persistence.
    
    Returns:
        Checkpointer instance or None if not configured
    """
    # Check if checkpointer is enabled via environment variable
    if os.getenv("ENABLE_CHECKPOINTER", "true").lower() == "false":
        return None
    
    try:
        # Use SQLite for persistence
        db_path = os.getenv("CHECKPOINTER_DB_PATH", "checkpoints.db")
        return SqliteSaver.from_conn_string(db_path)
    except Exception as e:
        print(f"Warning: Could not create SQLite checkpointer: {e}")
        # Fallback to memory checkpointer
        return MemorySaver()

def create_memory_checkpointer() -> MemorySaver:
    """
    Create in-memory checkpointer for testing or temporary use.
    
    Returns:
        Memory checkpointer instance
    """
    return MemorySaver()

def get_thread_config(user_id: str, session_id: str = None) -> dict:
    """
    Generate thread configuration for user isolation.
    
    Args:
        user_id: User identifier
        session_id: Optional session identifier
        
    Returns:
        Thread configuration dictionary
    """
    thread_id = f"user_{user_id}"
    if session_id:
        thread_id += f"_session_{session_id}"
    
    return {"configurable": {"thread_id": thread_id}}

def get_versioned_thread_config(user_id: str, version: str = "v1.0.0", session_id: str = None) -> dict:
    """
    Generate versioned thread configuration.
    
    Args:
        user_id: User identifier
        version: Graph version
        session_id: Optional session identifier
        
    Returns:
        Versioned thread configuration dictionary
    """
    base_thread_id = f"user_{user_id}"
    if session_id:
        base_thread_id += f"_session_{session_id}"
    
    thread_id = f"{base_thread_id}_v{version}"
    return {"configurable": {"thread_id": thread_id}}

class CheckpointerManager:
    """
    Manager class for checkpointer operations.
    """
    
    def __init__(self):
        self.checkpointer = create_checkpointer()
    
    def is_enabled(self) -> bool:
        """
        Check if checkpointer is enabled.
        
        Returns:
            True if checkpointer is available and enabled
        """
        return self.checkpointer is not None
    
    def get_checkpointer(self):
        """
        Get the checkpointer instance.
        
        Returns:
            Checkpointer instance or None
        """
        return self.checkpointer
    
    def create_user_thread(self, user_id: str, session_id: str = None) -> dict:
        """
        Create thread configuration for a user.
        
        Args:
            user_id: User identifier
            session_id: Optional session identifier
            
        Returns:
            Thread configuration
        """
        return get_thread_config(user_id, session_id)
    
    def create_versioned_thread(self, user_id: str, version: str = "v1.0.0", session_id: str = None) -> dict:
        """
        Create versioned thread configuration.
        
        Args:
            user_id: User identifier
            version: Graph version
            session_id: Optional session identifier
            
        Returns:
            Versioned thread configuration
        """
        return get_versioned_thread_config(user_id, version, session_id)
