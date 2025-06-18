"use client";

interface Collaborator {
  user_email: string;
  role: string;
}

interface RepoCardProps {
  id: number;
  name: string;
  owner_email: string;
  collaborators: Collaborator[];
  onClick: () => void;
  onUpload: () => void;
}

export default function RepoCard({
  id,
  name,
  owner_email,
  collaborators,
  onClick,
  onUpload,
}: RepoCardProps) {
  return (
    <div
      className="border rounded p-4 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
      onClick={onClick}
    >
      <div>
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-gray-600">Owner: {owner_email}</p>
        <p className="text-sm text-gray-600">
          Collaborators: {collaborators?.length
            ? collaborators.map((c) => `${c.user_email} (${c.role})`).join(", ")
            : "None"}
        </p>
      </div>
    </div>
  );
}
