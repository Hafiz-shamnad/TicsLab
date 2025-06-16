interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function TextInput({ className = "", ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
    />
  );
}
