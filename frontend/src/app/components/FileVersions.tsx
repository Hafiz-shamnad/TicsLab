"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import Button from "./Button";

interface FileVersion {
  version_number: number;
  sha256: string;
  size: number;
  uploaded_at: string;
}

export default function FileVersions() {
  const { token, refreshToken, logout } = useAuth();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { repoId, filename } = useParams();

  const fetchVersions = async (retry = true) => {
    setLoading(true);
    try {
      const response = await API.get(`/api/repos/${repoId}/files/versions/${filename}`);
      setVersions(response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 && retry) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            return fetchVersions(false);
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || "Failed to fetch versions.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (versionNumber: number) => {
    try {
      const response = await API.get(`/api/repos/${repoId}/files/${filename}/version/${versionNumber}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${filename}.v${versionNumber}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to download version.");
    }
  };

  const handleDelete = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to delete version ${versionNumber} of ${filename}?`)) return;
    try {
      await API.delete(`/api/repos/${repoId}/files/${filename}/version/${versionNumber}`);
      setVersions(versions.filter((v) => v.version_number !== versionNumber));
      alert(`Version ${versionNumber} deleted.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete version. Admin permission may be required.");
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      router.push("/login");
      return;
    }
    fetchVersions();
  }, [token]);

  return (
    <section className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Versions of {decodeURIComponent(filename as string)}</h2>
      {error && <p className="text-red-600">{error}</p>}
      {loading ? (
        <p>Loading versions...</p>
      ) : versions.length === 0 ? (
        <p className="text-gray-600">No versions found.</p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li key={version.version_number} className="flex justify-between items-center border-b py-2">
              <div>
                <p>Version {version.version_number}</p>
                <p className="text-sm text-gray-600">SHA256: {version.sha256.slice(0, 16)}...</p>
                <p className="text-sm text-gray-600">Size: {(version.size / 1024).toFixed(2)} KB</p>
                <p className="text-sm text-gray-600">Uploaded: {new Date(version.uploaded_at).toLocaleString()}</p>
              </div>
              <div className="space-x-2">
                <Button onClick={() => handleDownload(version.version_number)}>Download</Button>
                <Button onClick={() => handleDelete(version.version_number)} variant="danger">
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button onClick={() => router.push(`/repos/${repoId}/files`)}>Back to Files</Button>
    </section>
  );
}