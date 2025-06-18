"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface FileMeta {
    filename: string;
    uploaded_at: string;
}

export default function RepoFilesPage() {
    const { token, refreshToken, logout } = useAuth();
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { repoId } = useParams() as { repoId: string };

    useEffect(() => {
        if (!token || !repoId) {
            setError("Missing token or repository ID");
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchFiles = async () => {
            setLoading(true);
            setError(null);

            try {
                console.log("Fetching files for repo:", repoId, "with token:", token);

                const res = await fetch(`http://localhost:8000/api/repos/${repoId}/files/`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                });

                if (res.status === 401) {
                    console.log("Token unauthorized, attempting to refresh...");
                    const newToken = await refreshToken();
                    if (newToken && isMounted) {
                        const retryRes = await fetch(`http://localhost:8000/api/repos/${repoId}/files/`, {
                            headers: { Authorization: `Bearer ${newToken}`, Accept: "application/json" },
                        });
                        if (!retryRes.ok) {
                            throw new Error(`Retry failed: ${retryRes.statusText}`);
                        }
                        const data = await retryRes.json();
                        if (isMounted) {
                            if (Array.isArray(data)) setFiles(data);
                            else setError("Unexpected data format");
                        }
                    } else {
                        logout();
                        router.push("/login");
                    }
                } else if (!res.ok) {
                    throw new Error(`Failed to fetch files: ${res.statusText}`);
                } else {
                    const data = await res.json();
                    if (isMounted) {
                        if (Array.isArray(data)) setFiles(data);
                        else setError("Unexpected data format received from server.");
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Unknown error occurred");
                    setFiles([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchFiles();

        return () => {
            isMounted = false;
        };
    }, [repoId, token, refreshToken, logout, router]);

    return (
        <section className="p-4 space-y-4">
            <h2 className="text-2xl font-semibold">Files in Repository #{repoId}</h2>

            {loading && <p>Loading files...</p>}

            {error && <p className="text-red-600">{error}</p>}

            {!loading && !error && files.length === 0 && (
                <p className="text-gray-600">No files found.</p>
            )}

            {!loading && !error && files.length > 0 && (
                <ul className="space-y-2">
                    {files.map((file, idx) => (
                        <li
                            key={`${file.filename}-${idx}`}
                            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 transition"
                        >
                            <a
                                href={`/api/repos/${repoId}/files/${encodeURIComponent(file.filename)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {file.filename}
                            </a>{" "}
                            <span className="text-sm text-gray-500">
                                uploaded at {new Date(file.uploaded_at).toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}