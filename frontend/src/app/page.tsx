import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 text-center font-extrabold text-2xl shadow-md">
        TICS Header
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-white p-6 border-r border-gray-200 shadow-sm">
          <nav>
            <ul className="space-y-4">
              {[
                { href: "/", label: "Dashboard" },
                { href: "/projects", label: "Projects" },
                { href: "/settings", label: "Settings" },
                { href: "/login", label: "Login" },
                { href: "/register", label: "Register" },
                { href: "/dashboard", label: "Dashboard (Auth)" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block text-blue-700 font-semibold hover:text-indigo-600 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <h1 className="text-gray-900 text-3xl font-extrabold mb-6">
            Welcome to TICS
          </h1>
          <p className="text-gray-700 text-lg max-w-prose">
            This is the home content area.
          </p>
          <div className="mt-8 space-x-4">
            <Link
              href="/login"
              className="inline-block bg-blue-600 text-white px-5 py-3 rounded-lg shadow hover:bg-blue-700 transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-block bg-gray-600 text-white px-5 py-3 rounded-lg shadow hover:bg-gray-700 transition"
            >
              Register
            </Link>
          </div>
        </main>
      </div>

      <footer className="bg-gray-900 text-gray-300 p-5 text-center text-sm">
        © 2025 TICSLab. All rights reserved.
      </footer>
    </div>
  );
}
