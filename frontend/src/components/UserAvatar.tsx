import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  nome?: string | null;
  fotoUrl?: string | null;
  className?: string;
}

function getInitials(nome?: string | null): string {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? "?";
}

export function UserAvatar({ nome, fotoUrl, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {fotoUrl && <AvatarImage src={fotoUrl} alt={nome || "Avatar"} />}
      <AvatarFallback className="text-xs font-medium">
        {getInitials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
