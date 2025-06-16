"use client";

import { useEffect, useState } from "react";
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

export default function RepoList() {
  const { token, logout, refreshToken, loading: authLoading } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/repos/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("RepoList Token:", token); // Debug
      setRepos(res.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (localStorage.getItem("refresh_token")) {
          try {
            await refreshToken();
            console.log("Retrying with new token:", token);
            const retryRes = await API.get("/api/repos/", {
              headers: { Authorization: `Bearer ${token}` },
            });
            setRepos(retryRes.data);
            setError(null);
          } catch (refreshErr) {
            setError("Session expired. Please log in again.");
            logout();
            router.push("/login");
          }
        } else {
          setError("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        setError(err.response?.data?.detail || `Failed to fetch repositories (Status: ${err.response?.status})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    const name = prompt("Enter repository name:");
    if (!name?.trim()) return;
    try {
      const res = await API.post(
        "/api/repos/create-repo",
        { name: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRepos((prev) => [...prev, res.data]);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (localStorage.getItem("refresh_token")) {
          try {
            await refreshToken();
            const retryRes = await API.post(
              "/api/repos/create-repo",
              { name: name.trim() },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setRepos((prev) => [...prev, retryRes.data]);
            setError(null);
          } catch (refreshErr) {
            alert("Session expired. Please log in again.");
            logout();
            router.push("/login");
          }
        } else {
          alert("Session expired. Please log in again.");
          logout();
          router.push("/login");
        }
      } else {
        alert(err.response?.data?.detail || `Failed to create repository (Status: ${err.response?.status})`);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError("Authentication token is missing. Please log in.");
      setLoading(false);
      router.push("/login");
      return;
    }
    console.log("Token used in RepoList:", token); // Debug
    fetchRepos();
  }, [token, authLoading, router]);

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Repositories</h2>
        <Button onClick={handleCreateRepo}>Create Repository</Button>
      </div>

      {loading || authLoading ? (
        <p>Loading repositories...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : repos.length === 0 ? (
        <p className="text-gray-600">No repositories found.</p>
      ) : (
        <div className="grid gap-3">{repos.map((r) => <RepoCard {...r} key={r.id} />)}</div>
      )}
    </section>
  );
}