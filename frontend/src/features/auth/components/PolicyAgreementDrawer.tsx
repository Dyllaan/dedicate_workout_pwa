import { FileText } from "lucide-react";
import {
  PolicyFullPageLinks,
  PrivacyPolicyContent,
  TermsOfServiceContent,
} from "@/components/legal/PolicyContent";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

type PolicyAgreementDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PolicyAgreementDrawer({
  open,
  onOpenChange,
}: PolicyAgreementDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="inline border-0 border-b border-solid border-primary bg-transparent p-0 font-semibold leading-normal text-primary shadow-none transition-colors hover:border-primary/80 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          Terms of Service and Privacy Policy
        </button>
      </DrawerTrigger>
      <DrawerContent className="z-[100] mx-auto max-h-[88vh] max-w-3xl">
        <DrawerHeader className="border-b border-border text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <DrawerTitle>Review before accepting</DrawerTitle>
              <DrawerDescription>
                These are the same terms and privacy policy shown on the full legal pages.
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="h-[min(34rem,calc(88vh-9rem))]">
          <div className="space-y-5 px-4 py-4">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Terms of Service</h3>
              <TermsOfServiceContent compact />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Privacy Policy</h3>
              <PrivacyPolicyContent compact />
            </section>
          </div>
        </ScrollArea>

        <div className="border-t border-border px-4 py-3">
          <PolicyFullPageLinks />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
