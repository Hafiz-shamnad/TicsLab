"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import API from "../utils/api";
import TextInput from "../components/common/TextInput";
import Button from "../components/common/Button";
import { emailRegex } from "../utils/validators";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailRegex.test(form.email)) {
      setError("Invalid email");
      return;
    }

    try {
      await API.post("/auth/register", form);
      router.push("/login");
    } catch (err: any) {
      console.error("Registration error details:", err);

      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Registration failed";

      setError(message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-6 text-center bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 bg-clip-text text-transparent">
          Create an account
        </h2>
        {error && (
          <p className="text-red-600 font-semibold mb-5 text-center">{error}</p>
        )}
        <form onSubmit={handleRegister} className="space-y-6">
          <TextInput
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="border-purple-500 focus:ring-purple-500 focus:border-purple-500"
          />
          <TextInput
            type="text"
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
            required
            className="border-pink-500 focus:ring-pink-500 focus:border-pink-500"
          />
          <TextInput
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="border-red-500 focus:ring-red-500 focus:border-red-500"
          />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg transition duration-300"
          >
            Register
          </Button>
        </form>
      </div>
    </div>
  );
}
