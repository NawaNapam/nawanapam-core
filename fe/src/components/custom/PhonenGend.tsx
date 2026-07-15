"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/services/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, User } from "lucide-react";

export default function CompleteProfile() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!phoneNumber) {
      toast.error("Phone number is required");
      return false;
    }
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      toast.error("Enter a valid 10-digit phone number");
      return false;
    }
    if (!gender) {
      toast.error("Please select your gender");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      let res = await fetch("/api/updateuser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `${countryCode}${phoneNumber}`,
          gender,
        }),
      });

      // Fallback to POST if PUT is not allowed (405 error)
      if (res.status === 405) {
        res = await fetch("/api/updateuser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: `${countryCode}${phoneNumber}`,
            gender,
          }),
        });
      }

      // Handle non-JSON responses
      const contentType = res.headers.get("content-type");
      const isJson = contentType?.includes("application/json");

      if (res.ok) {
        toast.success("Profile updated successfully!");
        router.push("/dashboard");
      } else {
        const errorData = isJson ? await res.json() : null;
        toast.error(
          errorData?.error || "Failed to update profile. Please try again."
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <User className="mx-auto h-10 w-10 text-signature-coral mb-3" />
          <h1 className="text-2xl sm:text-3xl font-medium text-foreground mb-2">
            Complete Your Profile
          </h1>
          <p className="text-body text-sm">
            Add your details to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <Label
              htmlFor="phone"
              className="text-body flex items-center gap-2 mb-2 text-sm font-medium"
            >
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-20 sm:w-24 h-11 flex items-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+91">+91</SelectItem>
                  <SelectItem value="+1">+1</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="gender"
              className="text-body flex items-center gap-2 mb-2 text-sm font-medium"
            >
              <User className="h-4 w-4" />
              Gender
            </Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Updating...
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
