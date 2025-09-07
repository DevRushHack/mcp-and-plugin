import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from utils.logger import logger


@dataclass
class ChatMessage:
    id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    query_id: Optional[str] = None  # Links to the original query that started this conversation thread


@dataclass
class QuerySession:
    id: str
    query: str
    timestamp: datetime
    messages: List[ChatMessage]
    status: str = "active"  # active, completed, error
    

class SessionManager:
    def __init__(self, sessions_dir: str = "sessions"):
        self.sessions_dir = sessions_dir
        self.sessions: Dict[str, QuerySession] = {}
        self.current_session_id: Optional[str] = None
        os.makedirs(sessions_dir, exist_ok=True)
        self.load_sessions()
    
    def create_session(self, query: str) -> str:
        """Create a new query session"""
        session_id = str(uuid.uuid4())
        session = QuerySession(
            id=session_id,
            query=query,
            timestamp=datetime.now(),
            messages=[]
        )
        self.sessions[session_id] = session
        self.current_session_id = session_id
        self.save_session(session)
        logger.info(f"Created new session: {session_id} for query: {query[:50]}...")
        return session_id
    
    def add_message(self, session_id: str, role: str, content: str) -> str:
        """Add a message to a session"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        message_id = str(uuid.uuid4())
        message = ChatMessage(
            id=message_id,
            role=role,
            content=content,
            timestamp=datetime.now(),
            query_id=session_id
        )
        
        self.sessions[session_id].messages.append(message)
        self.save_session(self.sessions[session_id])
        logger.info(f"Added {role} message to session {session_id}")
        return message_id
    
    def get_session(self, session_id: str) -> Optional[QuerySession]:
        """Get a session by ID"""
        return self.sessions.get(session_id)
    
    def get_session_messages(self, session_id: str) -> List[ChatMessage]:
        """Get all messages for a session"""
        session = self.get_session(session_id)
        return session.messages if session else []
    
    def list_sessions(self) -> List[QuerySession]:
        """List all sessions, sorted by timestamp (newest first)"""
        return sorted(self.sessions.values(), key=lambda s: s.timestamp, reverse=True)
    
    def update_session_status(self, session_id: str, status: str):
        """Update session status"""
        if session_id in self.sessions:
            self.sessions[session_id].status = status
            self.save_session(self.sessions[session_id])
    
    def save_session(self, session: QuerySession):
        """Save a session to disk"""
        filepath = os.path.join(self.sessions_dir, f"session_{session.id}.json")
        session_dict = asdict(session)
        # Convert datetime objects to ISO strings for JSON serialization
        session_dict['timestamp'] = session.timestamp.isoformat()
        for msg in session_dict['messages']:
            msg['timestamp'] = msg['timestamp'].isoformat() if isinstance(msg['timestamp'], datetime) else msg['timestamp']
        
        try:
            with open(filepath, 'w') as f:
                json.dump(session_dict, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving session {session.id}: {e}")
    
    def load_sessions(self):
        """Load all sessions from disk"""
        if not os.path.exists(self.sessions_dir):
            return
        
        for filename in os.listdir(self.sessions_dir):
            if filename.startswith("session_") and filename.endswith(".json"):
                filepath = os.path.join(self.sessions_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        session_dict = json.load(f)
                    
                    # Convert ISO strings back to datetime objects
                    session_dict['timestamp'] = datetime.fromisoformat(session_dict['timestamp'])
                    for msg in session_dict['messages']:
                        msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
                    
                    # Recreate ChatMessage objects
                    messages = [ChatMessage(**msg) for msg in session_dict['messages']]
                    session_dict['messages'] = messages
                    
                    session = QuerySession(**session_dict)
                    self.sessions[session.id] = session
                    
                except Exception as e:
                    logger.error(f"Error loading session from {filename}: {e}")
        
        logger.info(f"Loaded {len(self.sessions)} sessions from disk")
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        if session_id in self.sessions:
            # Remove from memory
            del self.sessions[session_id]
            
            # Remove from disk
            filepath = os.path.join(self.sessions_dir, f"session_{session_id}.json")
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
                logger.info(f"Deleted session {session_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting session file {session_id}: {e}")
                return False
        return False
    
    def get_current_session_id(self) -> Optional[str]:
        """Get the current active session ID"""
        return self.current_session_id
    
    def set_current_session(self, session_id: str):
        """Set the current active session"""
        if session_id in self.sessions:
            self.current_session_id = session_id
        else:
            raise ValueError(f"Session {session_id} not found")
