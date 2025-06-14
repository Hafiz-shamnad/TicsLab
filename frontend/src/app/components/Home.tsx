export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to TicsLab 🌐
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Here we build and collaborate on IoT projects.
        </p>
        <div className="space-x-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Create New Project
          </button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
            Explore Repositories
          </button>
        </div>
      </div>
    </main>
  );
}