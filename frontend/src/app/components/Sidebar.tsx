export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Repositories</h2>
      <ul className="space-y-2">
        <li><a href="#" className="text-blue-600 hover:underline">IoT-Sensor-Project</a></li>
        <li><a href="#" className="text-blue-600 hover:underline">Smart-Home-App</a></li>
        <li><a href="#" className="text-blue-600 hover:underline">Edge-Device-Firmware</a></li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Actions</h2>
      <ul className="space-y-2">
        <li><a href="#" className="text-blue-600 hover:underline">New Repository</a></li>
        <li><a href="#" className="text-blue-600 hover:underline">Import Project</a></li>
      </ul>
    </aside>
  );
}