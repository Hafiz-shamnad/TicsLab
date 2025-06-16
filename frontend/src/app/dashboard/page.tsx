"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import RepoList from "../components/RepoList"

interface DecodedUser {
  email?: string;
  full_name?: string;
  [key: string]: any;
}

export default function Dashboard() {
  const { token, loading, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<DecodedUser | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [token, loading]);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<DecodedUser>(token);
        setUser(decoded);
      } catch (err) {
        console.error("Invalid token:", err);
        logout();
        router.replace("/login");
      }
    }
  }, [token]);

  if (loading) return <div className="text-center p-10">Loading...</div>;

  if (!token) return null;

return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Welcome, {user?.full_name || user?.email}!
      </h1>

      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md space-y-10">
        {/* 📦 Repositories Section */}
        <RepoList />

        {/* 🔚 Logout */}
        <div className="text-center">
          <Button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

