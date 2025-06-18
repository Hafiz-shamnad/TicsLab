from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import shutil
import hashlib
import logging
from .models import Repository, RepoFile, RepoFileVersion, RoleEnum
from auth.models import User
from auth.utils import get_db, get_current_user
from typing import Optional

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repos/{repo_id}/files", tags=["Repo Files"])

STORAGE_ROOT = Path("storage").resolve()

def safe_repo_path(repo_id: int, *parts: str) -> Path:
    """Return a safe absolute path inside storage/repo_<id>/."""
    base = STORAGE_ROOT / f"repo_{repo_id}"
    full = base.joinpath(*parts).resolve()
    if not str(full).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Invalid path")
    return full

def _get_repo_path(repo_id: int) -> Path:
    """Get or create the repository's storage path."""
    path = STORAGE_ROOT / f"repo_{repo_id}"
    try:
        path.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create storage path for repo {repo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create storage directory: {str(e)}")
    return path

def _assert_write_perm(repo: Repository, user: User):
    """Check if user has write/admin permission."""
    collab = next((c for c in repo.collaborators if c.user_id == user.id), None)
    if collab is None or collab.role not in {RoleEnum.write, RoleEnum.admin}:
        raise HTTPException(status_code=403, detail="Write permission required")

def _assert_admin_perm(repo: Repository, user: User):
    """Check if user has admin permission."""
    collab = next((c for c in repo.collaborators if c.user_id == user.id), None)
    if collab is None or collab.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin permission required")

def calc_sha256(upload: UploadFile) -> str:
    """Calculate SHA256 hash of file contents."""
    sha = hashlib.sha256()
    for chunk in iter(lambda: upload.file.read(8192), b""):
        sha.update(chunk)
    upload.file.seek(0)
    return sha.hexdigest()

@router.get("/", summary="List files")
def list_files(
    repo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all files in a repository with their latest version."""
    logger.debug(f"Listing files for repo {repo_id} by user {user.email}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not any(c.user_id == user.id for c in repo.collaborators):
        raise HTTPException(status_code=403, detail="Permission denied")
    return [
        {
            "filename": f.filename,
            "uploaded_at": f.uploaded_at.isoformat(),
            "sha256": f.sha256,
            "latest_version": max((v.version_number for v in f.versions), default=None),
            "version_count": len(f.versions)
        }
        for f in repo.files
    ]

@router.get("/versions/{filename}", summary="List file versions")
def list_file_versions(
    repo_id: int,
    filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all versions of a specific file."""
    logger.debug(f"Listing versions for file '{filename}' in repo {repo_id} by user {user.email}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not any(c.user_id == user.id for c in repo.collaborators):
        raise HTTPException(status_code=403, detail="Permission denied")
    repo_file = db.query(RepoFile).filter(RepoFile.repo_id == repo_id, RepoFile.filename == filename).first()
    if not repo_file:
        raise HTTPException(status_code=404, detail="File not found")
    return [
        {
            "version_number": v.version_number,
            "sha256": v.sha256,
            "size": v.size,
            "uploaded_at": v.uploaded_at.isoformat(),
            "version_description": v.version_description
        }
        for v in sorted(repo_file.versions, key=lambda x: x.version_number)
    ]

@router.get("/{filename}/version/{version_number}", response_class=FileResponse, summary="Download specific file version")
def download_file_version(
    repo_id: int,
    filename: str,
    version_number: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download a specific version of a file."""
    logger.debug(f"Downloading version {version_number} of file '{filename}' from repo {repo_id} by user {user.email}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not any(c.user_id == user.id for c in repo.collaborators):
        raise HTTPException(status_code=403, detail="Permission denied")
    repo_file = db.query(RepoFile).filter(RepoFile.repo_id == repo_id, RepoFile.filename == filename).first()
    if not repo_file:
        raise HTTPException(status_code=404, detail="File not found")
    version = db.query(RepoFileVersion).filter(
        RepoFileVersion.file_id == repo_file.id,
        RepoFileVersion.version_number == version_number
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    file_abs = safe_repo_path(repo_id, f"{filename}.v{version_number}")
    if not file_abs.exists():
        logger.warning(f"Versioned file {file_abs} missing on disk")
        raise HTTPException(status_code=404, detail="Versioned file not found")
    return FileResponse(file_abs)

@router.post("/upload", status_code=status.HTTP_201_CREATED, summary="Upload file with versioning")
def upload_file(
    repo_id: int,
    upload: UploadFile = File(...),
    version_description: str = Form(default=""),
    version_number: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file, creating a new version if it exists, with optional custom version number."""
    logger.debug(f"Uploading file '{upload.filename}' to repo {repo_id} by user {current_user.email}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    _assert_write_perm(repo, current_user)

    filename = secure_filename(upload.filename or "")
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if upload.size is None or upload.size == 0:
        raise HTTPException(status_code=400, detail="Empty file not allowed")

    repo_dir = _get_repo_path(repo_id)
    sha256 = calc_sha256(upload)
    upload_size = upload.size
    upload.file.seek(0)

    repo_file = db.query(RepoFile).filter(RepoFile.repo_id == repo_id, RepoFile.filename == filename).first()
    last_version = db.query(RepoFileVersion).filter(
        RepoFileVersion.file_id == repo_file.id if repo_file else None
    ).order_by(RepoFileVersion.version_number.desc()).first()

    # Determine version number
    default_version = 1 if last_version is None else last_version.version_number + 1
    final_version = version_number if version_number is not None else default_version

    # Validate user-specified version
    if version_number is not None:
        if version_number <= 0:
            raise HTTPException(status_code=400, detail="Version number must be positive")
        if last_version and version_number <= last_version.version_number:
            raise HTTPException(
                status_code=400,
                detail=f"Version number must be greater than the latest version ({last_version.version_number})"
            )

    try:
        if repo_file is None:
            repo_file = RepoFile(
                repo_id=repo_id,
                filename=filename,
                sha256=sha256,
                uploaded_at=datetime.now(timezone.utc)
            )
            db.add(repo_file)
            db.flush()
        else:
            if last_version and last_version.sha256 == sha256:
                raise HTTPException(status_code=409, detail="Identical file already uploaded as latest version")
            repo_file.sha256 = sha256
            repo_file.uploaded_at = datetime.now(timezone.utc)
            db.add(repo_file)

        versioned_name = f"{filename}.v{final_version}"
        dest_path = repo_dir / versioned_name
        with open(dest_path, "wb") as fp:
            shutil.copyfileobj(upload.file, fp)

        db.add(RepoFileVersion(
            file_id=repo_file.id,
            version_number=final_version,
            sha256=sha256,
            size=upload_size,
            uploaded_at=datetime.now(timezone.utc),
            version_description=version_description[:255] if version_description else None
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to upload file '{filename}' to repo {repo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    return {
        "message": "File uploaded (versioned)",
        "filename": filename,
        "version": final_version,
        "sha256": sha256,
        "size": upload_size
    }

@router.delete("/{filename}/version/{version_number}", summary="Delete specific file version")
def delete_file_version(
    repo_id: int,
    filename: str,
    version_number: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a specific version of a file (admin only)."""
    logger.debug(f"Deleting version {version_number} of file '{filename}' in repo {repo_id} by user {user.email}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    _assert_admin_perm(repo, user)
    repo_file = db.query(RepoFile).filter(RepoFile.repo_id == repo_id, RepoFile.filename == filename).first()
    if not repo_file:
        raise HTTPException(status_code=404, detail="File not found")
    version = db.query(RepoFileVersion).filter(
        RepoFileVersion.file_id == repo_file.id,
        RepoFileVersion.version_number == version_number
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    try:
        file_abs = safe_repo_path(repo_id, f"{filename}.v{version_number}")
        if file_abs.exists():
            file_abs.unlink()
        else:
            logger.warning(f"Versioned file {file_abs} not found on disk")

        db.delete(version)
        db.flush()

        remaining_versions = db.query(RepoFileVersion).filter(RepoFileVersion.file_id == repo_file.id).all()
        if not remaining_versions:
            db.delete(repo_file)
        else:
            latest_version = max(remaining_versions, key=lambda x: x.version_number)
            repo_file.sha256 = latest_version.sha256
            repo_file.uploaded_at = latest_version.uploaded_at
            db.add(repo_file)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete version {version_number} of file '{filename}' in repo {repo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Version deletion failed: {str(e)}")
    return {"message": f"Version {version_number} of file '{filename}' deleted"}

@router.get("/role", summary="Get user role for repository")
def get_user_role(
    repo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the role of the current user for the specified repository."""
    logger.debug(f"Fetching role for user {user.email} in repo {repo_id}")
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    collab = next((c for c in repo.collaborators if c.user_id == user.id), None)
    if not collab:
        raise HTTPException(status_code=403, detail="Permission denied")
    return {"role": collab.role.value}
