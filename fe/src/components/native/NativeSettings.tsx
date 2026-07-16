"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGetUser } from "@/hooks/use-getuser";
import { authService } from "@/services/auth";
import { toast } from "@/services/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AvatarUploadDialog from "@/components/custom/AvatarUploadDialog";
import { platform } from "@/platform";
import { cn } from "@/lib/utils";
import {
  User,
  Phone,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
  Check,
  X,
  Moon,
  Bell,
  Shield,
  Camera,
  Pencil,
} from "lucide-react";
import { useTheme } from "next-themes";
import PulseLoader from "@/components/custom/Loader";

type GenderType = "MALE" | "FEMALE" | "OTHER";

type EditableField = "name" | "username" | "phoneNumber" | "gender";

interface InlineEditorProps {
  label: string;
  value: string;
  field: EditableField;
  type?: string;
  placeholder?: string;
  onSave: (field: EditableField, value: string) => Promise<void>;
  saving: boolean;
  disabled?: boolean;
  genderPicker?: boolean;
}

function InlineEditor({
  label,
  value,
  field,
  type = "text",
  placeholder,
  onSave,
  saving,
  disabled,
  genderPicker,
}: InlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => (inputRef.current as HTMLInputElement)?.focus(), 50);
    }
  }, [editing]);

  const handleSave = async () => {
    await onSave(field, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div>
      {!editing ? (
        <button
          id={`settings-field-${field}`}
          onClick={() => !disabled && setEditing(true)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-4",
            "active:bg-muted transition-colors",
            disabled && "opacity-60 cursor-default",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-foreground shrink-0">{label}</span>
            <span className="text-sm text-muted-foreground truncate">
              {value || (
                <span className="italic text-muted-foreground/60">Not set</span>
              )}
            </span>
          </div>
          {!disabled && (
            <ChevronRight size={16} className="text-muted-foreground shrink-0 ml-2" />
          )}
        </button>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {label}
          </p>
          {genderPicker ? (
            <div className="flex gap-2 mb-3">
              {(["MALE", "FEMALE", "OTHER"] as GenderType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setDraft(g)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                    draft === g
                      ? "bg-signature-forest text-white border-signature-forest"
                      : "bg-card text-foreground border-border",
                  )}
                >
                  {g.charAt(0) + g.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          ) : (
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              type={type}
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              className="
                w-full rounded-xl border border-border bg-background
                px-4 py-3 text-base text-foreground
                focus:outline-none focus:ring-2 focus:ring-signature-forest/40 focus:border-signature-forest
                transition-all mb-3
              "
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="
                flex-1 flex items-center justify-center gap-2
                bg-signature-forest text-white rounded-xl py-3
                font-semibold text-sm
                disabled:opacity-60 active:scale-95 transition-transform
              "
            >
              {saving ? (
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="
                px-4 flex items-center justify-center
                bg-muted text-muted-foreground rounded-xl py-3
                active:scale-95 transition-transform
              "
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  destructive?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  id?: string;
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  destructive,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  id,
}: SettingsRowProps) {
  return (
    <button
      id={id}
      onClick={() => {
        if (toggle && onToggle) onToggle(!toggleValue);
        else onPress?.();
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-4",
        "active:bg-muted transition-colors",
        destructive && "active:bg-destructive/10",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          destructive ? "bg-destructive/10" : "bg-muted",
        )}
      >
        <Icon
          size={18}
          className={destructive ? "text-destructive" : "text-foreground"}
        />
      </div>
      <span
        className={cn(
          "flex-1 text-sm font-medium text-left",
          destructive ? "text-destructive" : "text-foreground",
        )}
      >
        {label}
      </span>
      {value && (
        <span className="text-xs text-muted-foreground mr-1">{value}</span>
      )}
      {toggle ? (
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors relative",
            toggleValue ? "bg-signature-forest" : "bg-border",
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              toggleValue ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </div>
      ) : (
        !destructive && (
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        )
      )}
    </button>
  );
}

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      )}
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

/**
 * Native Android settings page — Material You inspired.
 * Profile hero at top, grouped settings sections below, danger zone at bottom.
 */
export default function NativeSettings() {
  const { status, update: updateSession } = useSession();
  const user = useGetUser();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phoneNumber: "",
    gender: "OTHER" as GenderType,
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      phoneNumber: user.phoneNumber ?? "",
      gender: (user.gender as GenderType) ?? "OTHER",
    });
  }, [user]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PulseLoader />
      </div>
    );
  }

  async function handleSave(field: EditableField, value: string) {
    const trimmed = value.trim();
    if (!trimmed && ["name", "username"].includes(field)) {
      toast.error("Please provide a valid value");
      return;
    }
    if (field === "phoneNumber" && trimmed && !/^\d{10,15}$/.test(trimmed)) {
      toast.error("Enter a valid phone number (10–15 digits)");
      return;
    }

    setSavingField(field);
    try {
      const res = await fetch("/api/updateuser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message || `Failed to update ${field}`);
      } else {
        setFormData((prev) => ({ ...prev, [field]: trimmed }));
        toast.success("Saved!");
        await updateSession();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingField(null);
    }
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8 MB");
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleAvatarUploaded(url: string) {
    setAvatarUrl(url);
    try {
      const res = await fetch("/api/updateuser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!res.ok) throw new Error();
      await updateSession();
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to save profile photo");
    }
  }

  const handleLogout = async () => {
    await authService.logout("/");
  };

  const isDark = resolvedTheme === "dark";
  const displayAvatar = avatarUrl || user?.image || "";
  const displayName = formData.name || formData.email || "User";

  return (
    <div className="min-h-full bg-background pb-6">
      {/* ── Profile Hero ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-signature-forest px-5 pb-8 pt-6 flex flex-col items-center"
        style={{ borderRadius: "0 0 32px 32px" }}
      >
        {/* bg rings */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/5" />

        <h1 className="sr-only">Settings</h1>

        {/* Avatar */}
        <button
          id="avatar-upload-btn"
          aria-label="Change profile photo"
          onClick={() => fileInputRef.current?.click()}
          className="relative active:scale-90 transition-transform"
        >
          <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Camera badge */}
          <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-md">
            <Camera size={15} className="text-signature-forest" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFile}
        />

        <p className="mt-3 text-xl font-bold text-white">{displayName}</p>
        {formData.username && (
          <p className="text-sm text-white/60">@{formData.username}</p>
        )}
        <p className="text-xs text-white/50 mt-1">{formData.email}</p>
      </div>

      {/* AvatarUploadDialog */}
      {cropSrc && (
        <AvatarUploadDialog
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onUploaded={handleAvatarUploaded}
        />
      )}

      <div className="px-4 pt-6 space-y-5">
        {/* ── Profile ─────────────────────────────────────────────────── */}
        <SectionCard title="Profile">
          <InlineEditor
            label="Full Name"
            field="name"
            value={formData.name}
            onSave={handleSave}
            saving={savingField === "name"}
          />
          <InlineEditor
            label="Username"
            field="username"
            value={formData.username}
            placeholder="@handle"
            onSave={handleSave}
            saving={savingField === "username"}
          />
          <InlineEditor
            label="Phone"
            field="phoneNumber"
            value={formData.phoneNumber}
            type="tel"
            placeholder="10–15 digit number"
            onSave={handleSave}
            saving={savingField === "phoneNumber"}
          />
          <InlineEditor
            label="Gender"
            field="gender"
            value={
              formData.gender.charAt(0) +
              formData.gender.slice(1).toLowerCase()
            }
            genderPicker
            onSave={handleSave}
            saving={savingField === "gender"}
          />
        </SectionCard>

        {/* ── Preferences ─────────────────────────────────────────────── */}
        <SectionCard title="Preferences">
          <SettingsRow
            id="settings-dark-mode"
            icon={Moon}
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={(v) => setTheme(v ? "dark" : "light")}
          />
          <SettingsRow
            id="settings-notifications"
            icon={Bell}
            label="Notifications"
            toggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
        </SectionCard>

        {/* ── Account ─────────────────────────────────────────────────── */}
        <SectionCard title="Account">
          <SettingsRow
            id="settings-change-password"
            icon={Lock}
            label="Change Password"
            onPress={() => router.push("/forget-pass")}
          />
          <SettingsRow
            id="settings-privacy"
            icon={Shield}
            label="Privacy & Safety"
            onPress={() => {}}
          />
          <SettingsRow
            id="settings-edit-profile"
            icon={Pencil}
            label="Edit Full Profile"
            onPress={() => router.push("/settings/update")}
          />
        </SectionCard>

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        <SectionCard title="Danger zone">
          <SettingsRow
            id="settings-logout"
            icon={LogOut}
            label="Sign Out"
            destructive
            onPress={handleLogout}
          />
          <SettingsRow
            id="settings-delete-account"
            icon={Trash2}
            label="Delete Account"
            destructive
            onPress={() => router.push("/settings/delete")}
          />
        </SectionCard>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Nawa Napam · ST Kola Kuli Napam
        </p>
      </div>
    </div>
  );
}
