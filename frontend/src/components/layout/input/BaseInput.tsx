import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInvalidString } from "@/utils/validator";

interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    type?: string;
    children?: React.ReactNode;
    label?: string;
    labelIcon?: LucideIcon;
    labelSuffix?: string;
    invalid?: boolean;
    optional?: boolean;
}

export default function BaseInput({
    className,
    type,
    children,
    label,
    labelIcon: LabelIcon,
    labelSuffix,
    invalid,
    optional,
    ...props
}: BaseInputProps) {
    const [internalInvalid, setInternalInvalid] = useState(false);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (invalid === undefined && !optional) {
            setInternalInvalid(isInvalidString(props.value as string));
        }
        props.onBlur?.(e);
    };

    const isInvalid = invalid ?? internalInvalid;
    const inputId = props.id;

    return (
        <div className="space-y-4">
            {label && (
                <Label htmlFor={inputId}>
                    {LabelIcon && <LabelIcon size={16} />}
                    {label}
                    {labelSuffix && (
                        <span>{labelSuffix}</span>
                    )}
                    {optional && !labelSuffix && (
                        <span>(optional)</span>
                    )}
                </Label>
            )}
            <div className={children ? "relative" : undefined}>
                <Input
                    {...props}
                    type={type}
                    onBlur={handleBlur}
                    aria-invalid={props["aria-invalid"] ?? isInvalid}
                    className={className}
                />
                {children}
            </div>
        </div>
    );
}

export function PasswordInput(props: Omit<BaseInputProps, "type">) {
    const [show, setShow] = useState(false);
    const inputId = props.id;

    return (
        <BaseInput
            {...props}
            type={show ? "text" : "password"}
        >
            <button
                type="button"
                onClick={() => setShow((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                aria-controls={inputId}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </BaseInput>
    );
}
