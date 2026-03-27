import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  nome?: string | null;
  onUploaded: (url: string | null) => void;
  className?: string;
}

const ACCEPTED = ".jpg,.jpeg,.png,.webp";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function getInitials(nome?: string | null): string {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? "?";
}

async function resizeImage(file: File, size = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // Crop to square center
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao redimensionar"))),
        "image/webp",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = URL.createObjectURL(file);
  });
}

export function AvatarUpload({ userId, currentUrl, nome, onUploaded, className }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || currentUrl;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }

    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const path = `${userId}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, resized, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      await supabase.from("profiles").update({ foto_perfil_url: urlWithCache }).eq("user_id", userId);

      setPreview(urlWithCache);
      onUploaded(urlWithCache);
      toast.success("Foto atualizada!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`${userId}/avatar.webp`]);
      await supabase.from("profiles").update({ foto_perfil_url: null }).eq("user_id", userId);
      setPreview(null);
      onUploaded(null);
      toast.success("Foto removida!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Avatar className="h-20 w-20">
        {displayUrl && <AvatarImage src={displayUrl} alt="Foto" />}
        <AvatarFallback className="text-lg font-semibold">{getInitials(nome)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handleFile} className="hidden" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {uploading ? "Enviando..." : "Alterar foto"}
        </Button>
        {displayUrl && (
          <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={uploading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
