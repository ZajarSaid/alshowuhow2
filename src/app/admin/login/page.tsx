"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import logo from "@/logo.png";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError(
          result.code === "customer_login_disabled"
            ? "Customer accounts cannot access the admin console."
            : "Invalid email or password"
        );
        return;
      }

      // Only administrators may use this console; kick out anyone else
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
        await signOut({ redirect: false });
        setError("This account does not have administrator access.");
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-blue flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logo.src} alt="ALshowUhow" className="h-10 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Administrator Console</h1>
          <p className="text-white/60 mt-2">Restricted — staff access only</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white bg-crimson hover:bg-crimson-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In to Admin Console"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-white/60">
          Looking for your vendor account?{" "}
          <Link href="/login" className="text-white font-medium hover:underline">
            Vendor sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
