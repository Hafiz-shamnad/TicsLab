export default function Header() {
  return (
    <header className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">TicsLab 🌐</h1>
          <nav className="space-x-4">
            <a href="#" className="hover:text-gray-300">Repositories</a>
            <a href="#" className="hover:text-gray-300">Projects</a>
            <a href="#" className="hover:text-gray-300">Community</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search projects..."
            className="px-3 py-1 rounded-md text-black focus:outline-none"
          />
          <a href="#" className="hover:text-gray-300">Profile</a>
          <a href="#" className="hover:text-gray-300">Sign Out</a>
        </div>
      </div>
    </header>
  );
}