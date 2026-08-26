"use client";

import { useState } from "react";
import { useUser } from "@/app/user/layout";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { user } = useUser();
  const { addToast } = useToast();

  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
