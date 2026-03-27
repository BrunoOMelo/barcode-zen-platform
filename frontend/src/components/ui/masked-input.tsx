import { Input } from "@/components/ui/input";
import { forwardRef, ChangeEvent } from "react";

type MaskType = "cpf" | "cnpj" | "cep" | "celular";

const masks: Record<MaskType, (v: string) => string> = {
  cpf: (v) => v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  cnpj: (v) => v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2"),
  cep: (v) => v.replace(/\D/g, "").slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2"),
  celular: (v) => v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2"),
};

interface MaskedInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  mask: MaskType;
  value: string;
  onValueChange: (raw: string) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onValueChange, ...props }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onValueChange(masks[mask](e.target.value));
    };

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";
