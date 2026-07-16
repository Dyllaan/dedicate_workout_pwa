import { useState, useEffect } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
type ButtonSize = VariantProps<typeof buttonVariants>['size'];

interface ConfirmationButtonProps {
    onConfirm: () => void | Promise<void>;
    icon?: LucideIcon;
    label: string;
    confirmLabel?: string;
    destructive?: boolean;
    variant?: ButtonVariant;
    confirmVariant?: ButtonVariant;
    size?: ButtonSize;
    timeout?: number;
    className?: string;
    disabled?: boolean;
    pendingLabel?: string;
}

export default function ConfirmationButton({
    onConfirm,
    icon: Icon,
    label,
    confirmLabel = 'Confirm?',
    destructive = false,
    variant = 'default',
    confirmVariant = 'destructive',
    size = 'default',
    timeout = 3000,
    className = '',
    disabled = false,
    pendingLabel = 'Working...',
}: ConfirmationButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (isConfirming) {
            const timer = setTimeout(() => setIsConfirming(false), timeout);
            return () => clearTimeout(timer);
        }
    }, [isConfirming, timeout]);

    const handleClick = async () => {
        if (disabled || isPending) return;

        if (isConfirming) {
            try {
                setIsPending(true);
                await onConfirm();
                setIsConfirming(false);
            } finally {
                setIsPending(false);
            }
        } else {
            setIsConfirming(true);
        }
    };

    const activeVariant = isConfirming ? confirmVariant : (destructive ? 'destructive' : variant);

    return (
        <Button
            icon={Icon}
            size={size}
            variant={activeVariant}
            className={className}
            onClick={handleClick}
            disabled={disabled || isPending}
        >
            {isPending ? pendingLabel : isConfirming ? confirmLabel : label}
        </Button>
    );
}
