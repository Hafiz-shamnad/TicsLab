"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../../context/AuthContext";
import Button from "../../../../../components/common/Button";
import API from "../../../../../utils/api";
import { diffLines } from "diff";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FileVersion {
  version_number: number;
  sha256: string;
  size: number;
  uploaded_at: string;
}

export default function VersionsPage() {
  const { token, refreshToken, logout } = useAuth();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [role, setRole] = useState<string>("read");
  const [content, setContent] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [diffVersion1, setDiffVersion1] = useState<number | null>(null);
  const [diffVersion2, setDiffVersion2] = useState<number | null>(null);
  const [diffContent, setDiffContent] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"content" | "diff">("content");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { repoId, filename } = useParams();

  const decodedFilename = decodeURIComponent(filename as string);
  const textFileExtensions = [".txt", ".md", ".py", ".js", ".ts", ".json", ".css", ".html"];

  const fetchVersions = async (retry = true) => {
    try {
      const response = await API.get(`/api/repos/${repoId}/files/versions/${encodeURIComponent(decodedFilename)}`);
      setVersions(response.data);
      if (response.data.length > 0) {
        setSelectedVersion(response.data[0].version_number);
      }
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
        setError(err.response?.data?.detail || `Failed to fetch versions for ${decodedFilename}.`);
      }
    }
  };

  const fetchUserRole = async (retry = true) => {
    try {
      const response = await API.get(`/api/repos/${repoId}/files/role`);
      setRole(response.data.role);
    } catch (err: any) {
      if (err.response?.status === 401 && retry) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            return fetchUserRole(false);
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setRole("read");
      }
    }
  };

  const fetchFileContent = async (version: number, retry = true) => {
    try {
      const response = await fetch(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${version}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const { detail } = await response.json();
        throw new Error(detail || "Failed to fetch file content");
      }
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("text")) {
        setContent(null);
        return;
      }
      const text = await response.text();
      setContent(text);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 && retry) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            return fetchFileContent(version, false);
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.message || "Failed to fetch file content.");
        setContent(null);
      }
    }
  };

  const fetchDiffContent = async (v1: number, v2: number) => {
    try {
      const [response1, response2] = await Promise.all([
        fetch(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${v1}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${v2}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!response1.ok || !response2.ok) {
        const error = await (response1.ok ? response2 : response1).json();
        throw new Error(error.detail || "Failed to fetch file versions");
      }
      const [text1, text2] = await Promise.all([response1.text(), response2.text()]);
      const changes = diffLines(text1, text2);
      setDiffContent(changes);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to compute diff.");
      setDiffContent([]);
    }
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersion(version);
    fetchFileContent(version);
  };

  const handleDiffSelect = () => {
    if (diffVersion1 && diffVersion2) {
      fetchDiffContent(diffVersion1, diffVersion2);
      setViewMode("diff");
    }
  };

  const handleDownloadVersion = async (version: number) => {
    try {
      const response = await fetch(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${version}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const { detail } = await response.json();
        throw new Error(detail || "Download failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${decodedFilename}.v${version}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download version.");
    }
  };

  const handleDeleteVersion = async (version: number) => {
    if (!confirm(`Are you sure you want to delete version ${version} of ${decodedFilename}?`)) return;
    try {
      await API.delete(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${version}`);
      setError(null);
      await fetchVersions();
      if (selectedVersion === version) {
        setContent(null);
        setSelectedVersion(versions[0]?.version_number || null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            await API.delete(`/api/repos/${repoId}/files/${encodeURIComponent(decodedFilename)}/version/${version}`);
            await fetchVersions();
            if (selectedVersion === version) {
              setContent(null);
              setSelectedVersion(versions[0]?.version_number || null);
            }
            return;
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || `Failed to delete version ${version}.`);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      router.push("/login");
      return;
    }
    Promise.all([fetchVersions(), fetchUserRole()]).finally(() => setLoading(false));
  }, [token, repoId, filename]);

  useEffect(() => {
    if (selectedVersion) {
      fetchFileContent(selectedVersion);
    }
  }, [selectedVersion]);

  const isTextFile = textFileExtensions.some((ext) => decodedFilename.toLowerCase().endsWith(ext));

  return (
    <section className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Versions of {decodedFilename}</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="flex space-x-4 mb-4">
        <Button
          onClick={() => setViewMode("content")}
          className={`text-sm ${viewMode === "content" ? "bg-blue-600" : "bg-gray-600"}`}
        >
          View Content
        </Button>
        <Button
          onClick={() => setViewMode("diff")}
          className={`text-sm ${viewMode === "diff" ? "bg-blue-600" : "bg-gray-600"}`}
        >
          View Diff
        </Button>
      </div>
      <div className="mb-4">
        <label className="mr-2">Select Version:</label>
        <select
          value={selectedVersion || ""}
          onChange={(e) => handleVersionSelect(Number(e.target.value))}
          className="border rounded p-1"
        >
          {versions.map((v) => (
            <option key={v.version_number} value={v.version_number}>
              Version {v.version_number} ({new Date(v.uploaded_at).toLocaleString()})
            </option>
          ))}
        </select>
      </div>
      {viewMode === "diff" && (
        <div className="mb-4">
          <label className="mr-2">Compare:</label>
          <select
            value={diffVersion1 || ""}
            onChange={(e) => setDiffVersion1(Number(e.target.value) || null)}
            className="border rounded p-1 mr-2"
          >
            <option value="">Select Version</option>
            {versions.map((v) => (
              <option key={v.version_number} value={v.version_number}>
                Version {v.version_number}
              </option>
            ))}
          </select>
          <span>with</span>
          <select
            value={diffVersion2 || ""}
            onChange={(e) => setDiffVersion2(Number(e.target.value) || null)}
            className="border rounded p-1 ml-2"
          >
            <option value="">Select Version</option>
            {versions.map((v) => (
              <option key={v.version_number} value={v.version_number}>
                Version {v.version_number}
              </option>
            ))}
          </select>
          <Button onClick={handleDiffSelect} className="text-sm ml-2">
            Show Diff
          </Button>
        </div>
      )}
      {loading ? (
        <p>Loading versions...</p>
      ) : versions.length === 0 ? (
        <p className="text-gray-600">No versions found for {decodedFilename}.</p>
      ) : (
        <>
          {viewMode === "content" && (
            <div className="mb-4">
              {content && isTextFile ? (
                <SyntaxHighlighter language="text" style={vscDarkPlus} showLineNumbers>
                  {content}
                </SyntaxHighlighter>
              ) : content === null && !isTextFile ? (
                <p className="text-gray-600">This file type is not displayable. Download to view.</p>
              ) : (
                <p className="text-gray-600">Select a version to view content.</p>
              )}
            </div>
          )}
          {viewMode === "diff" && (
            <div className="mb-4 bg-gray-800 p-4 rounded">
              {diffContent.length > 0 ? (
                <pre className="text-sm">
                  {diffContent.map((part, index) => (
                    <div
                      key={index}
                      className={`${
                        part.added ? "bg-green-900 text-green-300" : part.removed ? "bg-red-900 text-red-300" : "text-gray-300"
                      }`}
                    >
                      {part.value.split("\n").map((line, i, arr) => (
                        <div key={i}>
                          {part.added ? "+ " : part.removed ? "- " : "  "}
                          {line}
                          {i < arr.length - 1 ? "\n" : ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </pre>
              ) : (
                <p className="text-gray-600">Select two versions to view diff.</p>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {versions.map((version) => (
              <li key={version.version_number} className="flex justify-between items-center border-b py-2">
                <span>
                  Version {version.version_number} ({(version.size / 1024).toFixed(2)} KB,{" "}
                  {new Date(version.uploaded_at).toLocaleString()})
                </span>
                <div className="space-x-2">
                  <Button
                    onClick={() => handleDownloadVersion(version.version_number)}
                    className="text-sm"
                  >
                    Download
                  </Button>
                  {role === "admin" && (
                    <Button
                      onClick={() => handleDeleteVersion(version.version_number)}
                      className="text-sm bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <Button
        onClick={() => router.push(`/repos/${repoId}/files`)}
        className="mt-4"
      >
        Back to Files
      </Button>
    </section>
  );
}
