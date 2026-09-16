export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Access Denied
        </h1>

        <p className="mt-3 text-neutral-400">
          Your ARMS account does not have permission to access this page.
        </p>

        <a
          href="/login"
          className="inline-block mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black"
        >
          Return to Login
        </a>
      </div>
    </div>
  );
}