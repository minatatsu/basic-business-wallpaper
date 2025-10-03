import { useState } from "react";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ID and password check
    const correctId = import.meta.env.VITE_AUTH_ID || "basicinc";
    const correctPassword =
      import.meta.env.VITE_AUTH_PASSWORD || "wallpaper2025";

    if (id === correctId && password === correctPassword) {
      sessionStorage.setItem("authenticated", "true");
      onLogin();
    } else {
      setError(true);
      setId("");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 flex flex-col items-center">
        <h1
          className="mb-8 text-center text-gray-900"
          style={{ fontSize: "28px", fontWeight: "700" }}
        >
          MTG背景ジェネレーター
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="id"
              className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
            >
              ID
            </label>
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">
                IDまたはパスワードが正しくありません
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
