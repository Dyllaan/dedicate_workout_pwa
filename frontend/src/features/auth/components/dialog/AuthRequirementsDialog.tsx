import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface AuthRequirementsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AuthRequirementsDialog({ open, onOpenChange }: AuthRequirementsDialogProps) {
    function dismiss() {
        onOpenChange(false);
    }

    function finish() {
        dismiss();
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
            <DialogContent
                className="max-w-xs w-full p-0 overflow-hidden gap-0 [&>button]:hidden"
                aria-describedby="onboarding-description"
            >
                <div className="flex flex-col items-center pt-10 pb-8 px-6 gap-4">
                    <div className="rounded-2xl p-4">
                        <Lock className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                    <DialogTitle className="text-xl font-bold text-center text-foreground">
                        Username & Password Requirements
                    </DialogTitle>
                </div>

                <div className="px-6 pt-5 pb-2">
                    <DialogDescription id="onboarding-description" className="text-sm text-muted-foreground text-center leading-relaxed">
                        <ol className="list-decimal list-inside text-left flex flex-col gap-4">
                            <li>Username must be 3-128  characters long and can only contain letters, numbers and underscores.</li>
                            <li>Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter and one number.</li>
                        </ol>
                    </DialogDescription>
                </div>

                <div className="flex items-center justify-between gap-3 px-6 pb-6">
                    <Button icon={undefined} size="sm" onClick={finish}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
