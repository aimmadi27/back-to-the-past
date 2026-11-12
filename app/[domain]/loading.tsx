export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-pulse">🕸️</div>
        <p className="text-gray-300 text-base font-semibold">
          Reaching into the archive…
        </p>
        <p className="text-gray-500 text-sm">
          The Internet Archive can be slow. Hang tight.
        </p>
      </div>
    </main>
  );
}
