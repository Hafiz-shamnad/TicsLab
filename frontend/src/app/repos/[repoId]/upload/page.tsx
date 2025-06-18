"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/common/Button";
import API from "../../../utils/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function UploadPage() {
  const { token, refreshToken, logout, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [versionDescription, setVersionDescription] = useState("");
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { repoId } = useParams();

  console.log("UploadPage rendered, repoId:", repoId, "token:", !!token, "authLoading:", authLoading);

  const textFileExtensions = [".txt", ".md", ".py", ".js", ".ts", ".json", ".css", ".html"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const fetchLatestVersion = async (filename: string) => {
    try {
      const response = await API.get(`/api/repos/${repoId}/files/versions/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const versions = response.data;
      const latest = versions.length > 0 ? Math.max(...versions.map((v: any) => v.version)) : 0;
      setLatestVersion(latest);
      setVersionNumber(latest + 1);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setLatestVersion(0);
        setVersionNumber(1);
      } else {
        console.error("Failed to fetch versions:", err);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile) {
      console.log("File dropped:", selectedFile.name);
      handleFileChange(selectedFile);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      console.log("File selected:", selectedFile.name);
      handleFileChange(selectedFile);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit.");
      setFile(null);
      setContent(null);
      return;
    }
    if (selectedFile.size === 0) {
      setError("Empty files are not allowed.");
      setFile(null);
      setContent(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
    fetchLatestVersion(selectedFile.name);
    const isTextFile = textFileExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );
    if (isTextFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log("File content read:", e.target?.result);
        setContent(e.target?.result as string);
      };
      reader.onerror = () => setError("Failed to read file content.");
      reader.readAsText(selectedFile);
    } else {
      setContent(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("No file selected.");
      return;
    }
    if (versionNumber === null || versionNumber <= (latestVersion || 0)) {
      setError(`Version number must be greater than ${latestVersion || 0}.`);
      return;
    }

    console.log("Uploading file:", file.name, "version:", versionNumber, "description:", versionDescription);
    setStatus("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("upload", file);
    if (versionDescription.trim()) {
      formData.append("version_description", versionDescription.trim());
    }
    formData.append("version_number", versionNumber.toString());

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
      const interval = setInterval(() => {
        setProgress((prev) => (prev ? Math.min(prev + 10, 90) : 10));
      }, 200);

      const { filename, version, sha256 } = await uploadFile(token!);
      console.log("Upload success:", { filename, version, sha256 });
      await navigator.clipboard.writeText(sha256);

      clearInterval(interval);
      setProgress(100);
      setStatus("success");
      setTimeout(() => {
        router.push(`/repos/${repoId}/files/${encodeURIComponent(filename)}/versions`);
      }, 1000);
    } catch (err: any) {
      clearInterval(interval);
      setStatus("error");
      setProgress(null);
      console.error("Upload error:", err);
      if (err.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            const intervalRetry = setInterval(() => {
              setProgress((prev) => (prev ? Math.min(prev + 10, 90) : 10));
            }, 200);
            const { filename, version, sha256 } = await uploadFile(newToken);
            console.log("Retry upload success:", { filename, version, sha256 });
            await navigator.clipboard.writeText(sha256);
            clearInterval(intervalRetry);
            setProgress(100);
            setStatus("success");
            setTimeout(() => {
              router.push(`/repos/${repoId}/files/${encodeURIComponent(filename)}/versions`);
            }, 1000);
            return;
          }
        } catch {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || "Upload failed.");
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      console.log("No token, redirecting to login");
      setError("Authentication required. Please log in.");
      router.push("/login");
    }
    setLoading(false);
  }, [token, authLoading]);

  const isTextFile = file && textFileExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  return (
    <section className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Upload File to Repository {repoId}</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p className="text-gray-600 mb-2">
              Drag and drop a file here or{" "}
              <button
                onClick={handleBrowseClick}
                className="text-blue-600 hover:underline focus:outline-none"
              >
                browse
              </button>
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            {file && (
              <p className="text-gray-600 mt-2">Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
            )}
          </div>
          {file && (
            <>
              <div className="mb-4">
                <label htmlFor="versionNumber" className="block text-sm font-medium text-gray-700">
                  Version Number (Latest: {latestVersion || "None"})
                </label>
                <input
                  type="number"
                  id="versionNumber"
                  value={versionNumber || ""}
                  onChange={(e) => setVersionNumber(parseInt(e.target.value) || null)}
                  placeholder={`Enter version > ${latestVersion || 0}`}
                  min={latestVersion ? latestVersion + 1 : 1}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="versionDescription" className="block text-sm font-medium text-gray-700">
                  Version Description (optional)
                </label>
                <input
                  type="text"
                  id="versionDescription"
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  placeholder="e.g., Initial version or Bug fix"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {isTextFile && content ? (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">File Content Preview</h3>
                  <SyntaxHighlighter language="text" style={vscDarkPlus} showLineNumbers>
                    {content}
                  </SyntaxHighlighter>
                </div>
              ) : file && !isTextFile ? (
                <p className="text-gray-600 mb-4">Non-text file: No preview available.</p>
              ) : null}
              <Button
                onClick={handleUpload}
                className="w-full text-center"
                disabled={status === "uploading" || versionNumber === null}
              >
                {status === "uploading" ? "Uploading..." : "Upload File"}
              </Button>
              {status === "uploading" && (
                <div className="mt-4">
                  <p className="text-gray-600">Uploading...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {status === "success" && (
                <p className="text-green-600 mt-2">Upload successful! Redirecting...</p>
              )}
              {status === "error" && (
                <p className="text-red-600 mt-2">{error}</p>
              )}
            </>
          )}
          <Button
            onClick={() => router.push(`/repos/${repoId}/files`)}
            className="mt-4"
          >
            Back to Files
          </Button>
        </>
      )}
    </section>
  );
}
