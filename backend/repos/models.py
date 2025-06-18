from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SqlEnum, BigInteger, Text
from sqlalchemy.orm import relationship
from database import Base
from enum import Enum
from datetime import datetime, timezone

class RoleEnum(str, Enum):
    """Enum for collaborator roles."""
    read = "read"
    write = "write"
    admin = "admin"

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="repositories")
    collaborators = relationship("Collaborator", back_populates="repository", cascade="all, delete-orphan")
    files = relationship("RepoFile", back_populates="repo", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Repository(id={self.id}, name='{self.name}')>"

class Collaborator(Base):
    __tablename__ = "repo_collaborators"
    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(SqlEnum(RoleEnum), nullable=False)
    repository = relationship("Repository", back_populates="collaborators")
    user = relationship("User", back_populates="collaborations")

    def __repr__(self):
        return f"<Collaborator(id={self.id}, repo_id={self.repo_id}, user_id={self.user_id}, role='{self.role}')>"

class RepoFile(Base):
    __tablename__ = "repo_files"
    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    sha256 = Column(String, nullable=True)  # Latest version's SHA256
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    repo = relationship("Repository", back_populates="files")
    versions = relationship("RepoFileVersion", back_populates="file", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<RepoFile(id={self.id}, repo_id={self.repo_id}, filename='{self.filename}')>"

class RepoFileVersion(Base):
    __tablename__ = "repo_file_versions"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("repo_files.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    sha256 = Column(String, nullable=False)
    size = Column(BigInteger, nullable=False)  # File size in bytes
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    version_description = Column(Text, nullable=True)  # Store version description
    file = relationship("RepoFile", back_populates="versions")

    def __repr__(self):
        return f"<RepoFileVersion(id={self.id}, file_id={self.file_id}, version={self.version_number})>"
