from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from database import Base
from enum import Enum


class RoleEnum(str, Enum):
    read = "read"
    write = "write"
    admin = "admin"

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    collaborators = relationship("RepoCollaborator", back_populates="repository")
    owner = relationship("User", back_populates="repositories")

class RepoCollaborator(Base):
    __tablename__ = "repo_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SqlEnum(RoleEnum), nullable=False)
    repository = relationship("Repository", back_populates="collaborators")
    user = relationship("User")
