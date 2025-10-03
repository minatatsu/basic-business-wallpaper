interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "読み込み中...",
}: LoadingScreenProps) {
  return (
    <>
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md px-8">
          <div className="text-center mb-12">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {/* Loading dots animation */}
          <div
            className="flex justify-center items-center gap-2"
            style={{ marginTop: "32px" }}
          >
            <div
              className="rounded-full"
              style={{
                width: "12px",
                height: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                animation: "dotBounce 1s infinite ease-in-out",
                animationDelay: "0ms",
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: "12px",
                height: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                animation: "dotBounce 1s infinite ease-in-out",
                animationDelay: "150ms",
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: "12px",
                height: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                animation: "dotBounce 1s infinite ease-in-out",
                animationDelay: "300ms",
              }}
            />
          </div>

          <p
            className="text-sm text-center text-muted-foreground"
            style={{ marginTop: "24px" }}
          >
            Figmaテンプレートを読み込んでいます
          </p>
        </div>
      </div>
    </>
  );
}
