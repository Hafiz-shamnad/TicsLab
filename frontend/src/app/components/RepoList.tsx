
"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import RepoCard from "./RepoCard";
import Button from "./common/Button";
import API from "../utils/api";

interface Repo {
  id: number;
  name: string;
  owner_email: string;
  collaborators: string[];
}

interface File {
  filename: string;
  uploaded_at: string;
  sha256: string;
  latest_version: number | null;
  version_count: number;
}

export default function RepoList() {
  const { token, setToken, refreshToken, logout, loading: authLoading } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRepos = async (retry = true) => {
    setLoading(true);
    try {
      const response = await API.get("/api/repos/");
      setRepos(response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 && retry) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            setToken(newToken);
            return fetchRepos(false);
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || "Failed to fetch repositories.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (repoId: number, retry = true) => {
    try {
      const response = await API.get(`/api/repos/${repoId}/files/`);
      setFiles(response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 && retry) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            setToken(newToken);
            return fetchFiles(repoId, false);
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || "Failed to fetch files.");
      }
    }
  };

  const handleCreateRepo = async () => {
    const name = prompt("Enter repository name (alphanumeric, hyphens, underscores only):");
    if (!name?.trim()) return;

    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
      alert("Invalid name. Use alphanumeric characters, hyphens, or underscores only.");
      return;
    }

    try {
      const response = await API.post("/api/repos/create-repo", { name: name.trim() });
      setRepos((prev) => [...prev, response.data]);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Failed to create repository.";
      if (err.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            setToken(newToken);
            const retryResponse = await API.post("/api/repos/create-repo", {
              name: name.trim(),
            });
            setRepos((prev) => [...prev, retryResponse.data]);
            return;
          }
        } catch {
          alert("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      }
      alert(errorMessage);
    }
  };

  const handleUpload = async (file: File, repoId: number) => {
    const formData = new FormData();
    formData.append("upload", file);

    const uploadFile = async (tokenToUse: string) => {
      const response = await API.post(`/api/repos/${repoId}/files/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      return response.data;
    };

    try {
      const { filename, version, sha256 } = await uploadFile(token!);
      await navigator.clipboard.writeText(sha256);
      await fetchFiles(repoId);
      setSelectedRepoId(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            setToken(newToken);
            const { filename, version, sha256 } = await uploadFile(newToken);
            await navigator.clipboard.writeText(sha256);
            await fetchFiles(repoId);
            setSelectedRepoId(null);
            return;
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
          return;
        }
      }
      setError(err.response?.data?.detail || "Upload failed.");
    }
  };

  const handleFileSelect = (repoId: number) => {
    setSelectedRepoId(repoId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedRepoId) {
      handleUpload(file, selectedRepoId);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRepoClick = (id: number) => {
    setSelectedRepoId(id);
    fetchFiles(id);
  };

  const handleViewVersions = (repoId: number, filename: string) => {
    router.push(`/repos/${repoId}/files/${encodeURIComponent(filename)}/versions`);
  };

  const handleUploadPage = (repoId: number) => {
    router.push(`/repos/${repoId}/upload`);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      router.push("/login");
      return;
    }
    fetchRepos();
  }, [token, authLoading]);

  return (
    <section className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Repositories</h2>
        <Button onClick={handleCreateRepo}>Create Repository</Button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {loading || authLoading ? (
        <p>Loading repositories...</p>
      ) : repos.length === 0 ? (
        <p className="text-gray-600">No repositories found.</p>
      ) : (
        <div className="grid gap-3">
          {repos.map((repo) => (
            <div key={repo.id} className="border rounded p-4">
              <RepoCard
                {...repo}
                onClick={() => handleRepoClick(repo.id)}
                onUpload={() => handleFileSelect(repo.id)}
              />
              {selectedRepoId === repo.id && (
                <>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      onClick={() => handleUploadPage(repo.id)}
                      className="text-sm"
                    >
                      Upload File (Advanced)
                    </Button>
                    <Button
                      onClick={() => handleFileSelect(repo.id)}
                      className="text-sm"
                    >
                      Quick Upload
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {files.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold">Files</h3>
                      <ul className="space-y-2">
                        {files.map((file) => (
                          <li key={file.filename} className="flex justify-between items-center border-b py-2">
                            <span>{file.filename} (v{file.latest_version || "N/A"}, {file.version_count} versions)</span>
                            <Button
                              onClick={() => handleViewVersions(repo.id, file.filename)}
                              className="text-sm"
                            >
                              View Versions
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}