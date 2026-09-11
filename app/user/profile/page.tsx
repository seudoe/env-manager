"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/user/layout";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";

export default function ProfilePage() {
  const { user } = useUser();
  const { addToast } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showSignOutAllConfirm, setShowSignOutAllConfirm] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setSavingUsername(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to update username.", "error");
        return;
      }

      addToast("Username updated. Refreshing...", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to update password.", "error");
        return;
      }

      addToast("Password updated.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    setSigningOutAll(true);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || "Failed to sign out everywhere.", "error");
        return;
      }

      addToast("Signed out of all sessions.", "success");
      router.push("/login");
      router.refresh();
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setSigningOutAll(false);
      setShowSignOutAllConfirm(false);
    }
  };

  return (
    <div className="fade-in max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account settings</p>
      </div>

      {/* Username */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Change Username</h3>
        <form onSubmit={handleUsernameChange} className="space-y-4">
          <div>
            <label htmlFor="profile-username" className="block text-sm font-medium text-text-secondary mb-1.5">
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={savingUsername || username === user?.username}
            className="px-4 py-2 text-sm font-semibold rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingUsername ? "Saving..." : "Update Username"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="profile-current-password" className="block text-sm font-medium text-text-secondary mb-1.5">
              Current Password
            </label>
            <input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium text-text-secondary mb-1.5">
              New Password
            </label>
            <input
              id="profile-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-text-secondary mb-1.5">
              Confirm New Password
            </label>
            <input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="px-4 py-2 text-sm font-semibold rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Sessions */}
      <div className="bg-bg-secondary border border-danger/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-danger mb-1">Sign Out Everywhere</h3>
        <p className="text-xs text-text-muted mb-4">
          Immediately invalidates every session on your account, on every device — this browser
          included. Use this if you suspect your account has been accessed by someone else and want
          everything cut off right now, without also having to change your password.
        </p>
        <button
          onClick={() => setShowSignOutAllConfirm(true)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
        >
          Sign Out Everywhere
        </button>
      </div>

      {/* Sign Out Everywhere Confirmation Modal */}
      <Modal
        isOpen={showSignOutAllConfirm}
        onClose={() => setShowSignOutAllConfirm(false)}
        title="Sign Out Everywhere"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger">
              This will sign you out of every device and browser, including this one. You&apos;ll need
              to log in again.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowSignOutAllConfirm(false)}
              disabled={signingOutAll}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSignOutEverywhere}
              disabled={signingOutAll}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger text-white hover:bg-danger/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOutAll ? "Signing out..." : "Sign Out Everywhere"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
