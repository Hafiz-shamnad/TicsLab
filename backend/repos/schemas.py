from enum import Enum
from typing import List
from pydantic import BaseModel, EmailStr

class RoleEnum(str, Enum):
    read = "read"
    write = "write"
    admin = "admin"

class RepoCollaboratorBase(BaseModel):
    user_email: EmailStr
    role: RoleEnum

class RepoCollaboratorCreate(RepoCollaboratorBase):
    pass

class RepoCollaboratorOut(RepoCollaboratorBase):
    pass

class RepoBase(BaseModel):
    name: str

class RepoCreate(RepoBase):
    pass

class RepoOut(BaseModel):
    id: int
    name: str
    owner_email: EmailStr

    class Config:
        orm_mode = True

class RepoOutExtended(RepoOut):
    collaborators: List[RepoCollaboratorOut] = []

    class Config:
        from_attributes = True
