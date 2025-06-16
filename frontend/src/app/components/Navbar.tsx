import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";

export default function Navbar() {
  const { token, logout } = useAuth();

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between">
      <Link href="/">
        <a className="font-bold text-xl">TICS</a>
      </Link>
      <div className="space-x-4 flex items-center">
        {token ? (
          <>
            <Link href="/dashboard">
              <a className="hover:underline">Dashboard</a>
            </Link>
            <Button onClick={logout} className="bg-transparent border border-white px-3 py-1">
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link href="/login">
              <a className="hover:underline">Login</a>
            </Link>
            <Link href="/register">
              <a className="hover:underline">Register</a>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
