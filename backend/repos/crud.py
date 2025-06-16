from sqlalchemy.orm import Session
from . import models, schemas

def get_repos_by_owner(db: Session, owner_email: str):
    return db.query(models.Repository).filter(models.Repository.owner_email == owner_email).all()

def create_repo(db: Session, repo: schemas.RepoCreate, owner_email: str):
    db_repo = models.Repository(name=repo.name, owner_email=owner_email)
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)
    return db_repo

def add_collaborator(db: Session, repo_id: int, collaborator: schemas.RepoCollaboratorCreate):
    db_collab = models.RepoCollaborator(repository_id=repo_id, user_email=collaborator.user_email, role=collaborator.role)
    db.add(db_collab)
    db.commit()
    db.refresh(db_collab)
    return db_collab
