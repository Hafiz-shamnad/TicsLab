from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from auth.models import User
from .models import  Repository, RepoCollaborator, RoleEnum
from .schemas import (
    RepoCreate,
    RepoOut,
    RepoOutExtended, 
    RepoCollaboratorCreate,
    RepoCollaboratorOut,
)
from auth.utils import get_db, get_current_user

router = APIRouter(tags=["Repositories"])

@router.post("/create-repo", response_model=RepoOut, status_code=status.HTTP_201_CREATED)
def create_repository(repo: RepoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if repo name already exists for this user (case-insensitive)
    existing = (
        db.query(Repository)
        .filter(Repository.owner_id == current_user.id)
        .filter(Repository.name.ilike(repo.name))
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Repository with this name already exists")

    new_repo = Repository(name=repo.name.strip(), owner_id=current_user.id)
    try:
        db.add(new_repo)
        db.flush()  # flush to get new_repo.id before commit

        # Owner is implicitly an admin collaborator
        owner_collab = RepoCollaborator(repo_id=new_repo.id, user_id=current_user.id, role=RoleEnum.admin)
        db.add(owner_collab)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create repository")

    return RepoOut(
        id=new_repo.id,
        name=new_repo.name,
        owner_email=current_user.email,
        collaborators=[RepoCollaboratorOut(user_email=current_user.email, role=RoleEnum.admin)]
    )


@router.post("/{repo_id}/collaborators", response_model=RepoCollaboratorOut)
def add_collaborator(
    repo_id: int,
    collab: RepoCollaboratorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    # Check current user's permission (must be admin collaborator)
    user_collab = (
        db.query(RepoCollaborator)
        .filter(RepoCollaborator.repo_id == repo_id, RepoCollaborator.user_id == current_user.id)
        .first()
    )
    if not user_collab or user_collab.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add collaborators")

    # Find user by email (case-insensitive)
    user = db.query(User).filter(User.email.ilike(collab.user_email.strip())).first()
    if not user:
        # Avoid leaking whether email exists or not - generic message
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to add not found")

    # Prevent adding self again
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a collaborator (owner)")

    # Check if already collaborator
    existing = (
        db.query(RepoCollaborator)
        .filter(RepoCollaborator.repo_id == repo_id, RepoCollaborator.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a collaborator")

    new_collab = RepoCollaborator(repo_id=repo_id, user_id=user.id, role=collab.role)
    try:
        db.add(new_collab)
        db.commit()
        db.refresh(new_collab)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add collaborator")

    return RepoCollaboratorOut(user_email=user.email, role=new_collab.role)


@router.get("/", response_model=List[RepoOutExtended])
def list_repositories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # List repos where user is owner or collaborator
    repos = (
        db.query(Repository)
        .join(RepoCollaborator)
        .filter(RepoCollaborator.user_id == current_user.id)
        .all()
    )

    out = []
    for repo in repos:
        collaborators = [
            RepoCollaboratorOut(user_email=collab.user.email, role=collab.role)
            for collab in repo.collaborators
        ]
        out.append(
            RepoOut(
                id=repo.id,
                name=repo.name,
                owner_email=repo.owner.email,
                collaborators=collaborators,
            )
        )
    return out
