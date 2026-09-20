import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "../services/supabase";
import AnimatedArmsBackground from "../components/AnimatedArmsBackground";
import BrandMark from "../components/BrandMark";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="arms-login min-h-screen px-4 py-8 text-[#173B57] sm:px-8">
      <AnimatedArmsBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center justify-center gap-8 lg:flex-row lg:justify-center lg:gap-16">
        <div className="arms-login-logo-panel" aria-hidden="true">
          <img
            src="/assets/arms-logo.png"
            alt=""
            className="arms-login-logo"
          />
        </div>

        <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-8 shadow-[0_24px_80px_rgba(18,59,93,0.14)] backdrop-blur sm:p-10">
          <div className="mb-8">
            

            <h1 className="mt-8 text-lg font-semibold text-[#123B5D]">
              Application Real-Time Monitoring System
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Teacher Console · Santiago National High School
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#173B57]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="                 Enter your email"
                required
                className="input pl-11"
              />
              <Mail className="pointer-events-none relative -top-8 left-80 -mb-5 text-slate-400" size={17} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#173B57]">
                Password
              </label>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="                 Enter your password"
                required
                className="input pl-11 pr-11"
              />
              <LockKeyhole className="pointer-events-none relative -top-8 left-80 -mb-5 text-slate-400" size={17} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="relative float-right -top-8 right-3 text-slate-400 hover:text-[#1976D2]" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="arms-button arms-button-primary w-full rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
