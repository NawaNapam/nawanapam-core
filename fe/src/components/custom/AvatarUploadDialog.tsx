"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { toast } from "@/services/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/cropImage";

interface AvatarUploadDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

export default function AvatarUploadDialog({
  open,
  imageSrc,
  onClose,
  onUploaded,
}: AvatarUploadDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function handleUpload() {
    if (!croppedArea) return;
    setUploading(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea);

      const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
      if (!signRes.ok) throw new Error("Failed to sign upload");
      const { signature, timestamp, folder, publicId, apiKey, cloudName } =
        await signRes.json();

      const formData = new FormData();
      formData.append("file", blob);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("public_id", publicId);
      formData.append("overwrite", "true");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed");
      const data = await uploadRes.json();

      onUploaded(data.secure_url as string);
      toast.success("Profile picture updated");
      onClose();
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust profile picture</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            className="flex-1"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !croppedArea}>
            {uploading ? "Uploading..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
