"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import logo from "@/logo.png";
import { useI18n } from "@/lib/i18n/context";

type SessionUser = { role?: string };

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "customer_login_disabled") {
          setError(
            "Customers don't need to log in. Submit a request directly from the homepage."
          );
        } else if (result.code === "vendor_not_approved") {
          setError(
            "Your account is pending approval. You'll be able to log in once an administrator reviews your registration."
          );
        } else {
          setError("Invalid email or password");
        }
        return;
      }

      // Route by the account's real role, not by any UI selection
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const role = (session?.user as SessionUser | undefined)?.role;

      if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (role === "VENDOR") {
        router.push("/vendor/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logo.src} alt="ALshowUhow" className="h-10 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-dark-text">{t.auth?.vendorSignIn ?? "Vendor Sign In"}</h1>
          <p className="text-dark-text/60 mt-2">{t.auth?.signInToAccount ?? "Sign in to your vendor account"}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
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
                placeholder="you@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white bg-purple hover:bg-purple-dark transition-colors disabled:opacity-50"
            >
              {loading ? (t.auth?.signingIn ?? "Signing in...") : (t.auth?.signIn ?? "Sign In")}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-dark-text/60">
          Own a business?{" "}
          <Link href="/vendor/register" className="text-purple hover:text-purple-dark font-medium">
            Register as a vendor
          </Link>
        </p>
        <p className="text-center mt-3 text-sm text-dark-text/60">
          Need a service done? No login needed —{" "}
          <Link href="/request" className="text-crimson hover:text-crimson-dark font-medium">
            submit a request
          </Link>
        </p>
      </div>
    </div>
  );
}
