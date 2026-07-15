"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Pencil, ArrowLeft, Check, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/services/toast";
import { useSession } from "next-auth/react";
import { useGetUser } from "@/hooks/use-getuser";
import AvatarUploadDialog from "@/components/custom/AvatarUploadDialog";

// ---------- Types ----------
type GenderType = "MALE" | "FEMALE" | "OTHER";

type FormDataState = {
  name: string;
  username: string;
  email: string;
  location: string;
  phoneNumber: string;
  gender: GenderType;
};

// ---------- Component ----------
export default function ProfileSettingsPage() {
  const user = useGetUser();
  const { update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState<keyof FormDataState | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [savingField, setSavingField] = useState<keyof FormDataState | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    username: "",
    email: "",
    location: "India",
    phoneNumber: "",
    gender: "OTHER",
  });

  // ---------- Load user ----------
  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      location: "India",
      phoneNumber: user.phoneNumber ?? "",
      gender: user.gender ?? "OTHER",
    });
  }, [user]);

  // ---------- Time update ----------
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) + " IST",
      );
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, []);

  // ---------- Helpers ----------
  const setField = <K extends keyof FormDataState>(
    key: K,
    value: FormDataState[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB");
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
      if (!res.ok) throw new Error("Failed to save profile picture");
      await updateSession();
    } catch (err) {
      console.error("Save avatar error:", err);
      toast.error("Failed to save profile picture");
    }
  }

  async function handleSave(field: keyof FormDataState) {
    const value = (formData[field] ?? "").toString().trim();

    // Strict validations
    if (!value && ["username", "email", "name"].includes(field)) {
      toast.error("Please provide a valid value");
      return;
    }

    if (field === "phoneNumber" && !/^\d{10,15}$/.test(value)) {
      toast.error("Enter a valid phone number (10–15 digits)");
      return;
    }

    setSavingField(field);
    try {
      let res = await fetch("/api/updateuser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      // Fallback to POST if PUT is not allowed (405 error)
      if (res.status === 405) {
        res = await fetch("/api/updateuser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
      }

      // Handle non-JSON responses (like 500 error pages)
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server error - please try again later");
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message || `Failed to update ${field}`);
      } else {
        toast.success(`${field} updated successfully`);
        setIsEditing(null);
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Something went wrong while updating");
    } finally {
      setSavingField(null);
    }
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-border pt-(--status-bar-height)">
        <div className="h-16 flex items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-body hover:text-foreground text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="hidden items-center gap-2 text-muted-foreground text-xs font-medium sm:flex">
            <Globe size={14} />
            <span className="font-mono tracking-wider">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-[calc(5rem+var(--status-bar-height))] pb-10 px-4 sm:px-6 max-w-2xl lg:max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            Profile Settings
          </h1>
          <p className="text-body mt-3">Make your presence truly yours</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group rounded-full focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Avatar className="w-32 h-32 border border-border">
              <AvatarImage src={avatarUrl || user?.image || ""} />
              <AvatarFallback className="bg-signature-coral text-white text-3xl font-medium">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-50 group-hover:opacity-100 transition-opacity">
              <Pencil size={22} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />
        </div>

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

        {/* Editable Fields, grouped into boxes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Identity */}
          <div className="space-y-6 bg-card rounded-lg p-5 sm:p-8 border border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Identity
            </h2>

            <EditableField
              label="Full Name"
              field="name"
              value={formData.name}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setField={setField}
              handleSave={handleSave}
              savingField={savingField}
            />

            <EditableField
              label="Username"
              field="username"
              value={formData.username}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setField={setField}
              handleSave={handleSave}
              savingField={savingField}
            />
          </div>

          {/* Contact */}
          <div className="space-y-6 bg-card rounded-lg p-5 sm:p-8 border border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Contact
            </h2>

            <EditableField
              label="Email"
              field="email"
              value={formData.email}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setField={setField}
              handleSave={handleSave}
              savingField={savingField}
              disabled
            />

            <EditableField
              label="Phone Number"
              field="phoneNumber"
              value={formData.phoneNumber}
              type="tel"
              placeholder="Enter 10–15 digit number"
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setField={setField}
              handleSave={handleSave}
              savingField={savingField}
            />
          </div>

          {/* About */}
          <div className="space-y-6 bg-card rounded-lg p-5 sm:p-8 border border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              About
            </h2>

            <EditableField
              label="Location"
              field="location"
              value={formData.location}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setField={setField}
              handleSave={handleSave}
              savingField={savingField}
            />

            {/* Gender (Dropdown) */}
            <div className="group relative">
              <label className="text-body text-sm font-medium">Gender</label>
              {isEditing === "gender" ? (
                <div className="mt-2 flex items-center gap-3">
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setField("gender", e.target.value as GenderType)
                    }
                    className="flex-1 bg-background border border-input rounded-sm px-4 py-3 text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-colors"
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <button
                    onClick={() => handleSave("gender")}
                    disabled={savingField === "gender"}
                    className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-foreground font-medium py-3">
                    {formData.gender}
                  </p>
                  <button
                    onClick={() => setIsEditing("gender")}
                    className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors"
                  >
                    <Pencil size={16} className="text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Your profile reflects who you are. Make it authentic.
        </p>
      </main>
    </div>
  );
}

// ---------- Reusable EditableField ----------
function EditableField({
  label,
  field,
  value,
  isEditing,
  setIsEditing,
  setField,
  handleSave,
  savingField,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string;
  field: keyof FormDataState;
  value: string;
  isEditing: keyof FormDataState | null;
  setIsEditing: React.Dispatch<
    React.SetStateAction<keyof FormDataState | null>
  >;
  setField: <K extends keyof FormDataState>(
    key: K,
    value: FormDataState[K],
  ) => void;
  handleSave: (field: keyof FormDataState) => void;
  savingField: keyof FormDataState | null;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="relative">
        <label className="text-body text-sm font-medium">{label}</label>
        <p className="text-foreground font-medium py-3">
          {value || "(Not set)"}
        </p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <label className="text-body text-sm font-medium">{label}</label>
      {isEditing === field ? (
        <div className="mt-2 flex items-center gap-3">
          <Input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setField(field, e.target.value as never)}
            className="flex-1"
          />
          <button
            onClick={() => handleSave(field)}
            disabled={savingField === field}
            className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Check size={18} />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-foreground font-medium py-3">
            {value || "(Not set)"}
          </p>
          <button
            onClick={() => setIsEditing(field)}
            className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors"
          >
            <Pencil size={16} className="text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
