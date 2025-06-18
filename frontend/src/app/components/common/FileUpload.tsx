"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Button from "./Button";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  repoId: number;
}

export default function FileUpload({ onUpload, repoId }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File) => {
    setStatus("uploading");
    setProgress(0);
    setMessage(null);

    try {
      // Simulate progress for UX (real progress requires server support)
      const interval = setInterval(() => {
        setProgress((prev) => (prev ? Math.min(prev + 10, 90) : 10));
      }, 200);

      await onUpload(file);

      clearInterval(interval);
      setProgress(100);
      setStatus("success");
      setMessage(`File "${file.name}" uploaded successfully.`);
      setTimeout(() => {
        setStatus("idle");
        setProgress(null);
        setMessage(null);
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setProgress(null);
      setMessage(err.message || "Upload failed.");
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mt-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
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
          <p className="text-green-600 mt-2">{message}</p>
        )}
        {status === "error" && (
          <p className="text-red-600 mt-2">{message}</p>
        )}
      </div>
    </div>
  );
}