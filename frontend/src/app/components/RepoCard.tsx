export interface RepoCardProps {
  id: number;
  name: string;
  owner_email: string;
  is_private: boolean;
}

export default function RepoCard({ id, name, owner_email, is_private }: RepoCardProps) {
  return (
    <div className="border rounded-lg p-3 shadow-sm bg-white">
      <strong>{name}</strong>{" "}
      {is_private ? (
        <span className="text-sm text-red-500 font-medium">(Private)</span>
      ) : (
        <span className="text-sm text-green-600 font-medium">(Public)</span>
      )}
      <p className="text-xs text-gray-500">Owner: {owner_email}</p>
    </div>
  );
}

