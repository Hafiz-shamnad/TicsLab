"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import TextInput from "../components/common/TextInput";
import Button from "../components/common/Button";
import { emailRegex } from "../utils/validators";

export default function LoginPage() {
  const router = useRouter();
  const { login, token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError("Invalid email");
      return;
    }
    try {
      const res = await API.post("/auth/login", { email, password });
      login(res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-700 via-pink-600 to-red-600">
          Login to TICS
        </h2>
        {error && (
          <p className="text-red-600 font-semibold mb-5 text-center">{error}</p>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <TextInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-purple-500 focus:ring-purple-500 focus:border-purple-500"
          />
          <TextInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-pink-500 focus:ring-pink-500 focus:border-pink-500"
          />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg transition duration-300"
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
