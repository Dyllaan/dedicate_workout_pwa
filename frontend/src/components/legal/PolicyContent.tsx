import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type PolicyContentProps = {
  compact?: boolean;
};

type PolicySectionProps = {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
};

type DataPointProps = {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
};

export function PrivacyPolicyContent({ compact = false }: PolicyContentProps) {
  return (
    <div className={policyContainerClassName(compact)}>
      <PolicySection title="Overview" compact={compact}>
        Dedicate (accessible at dedicate.louisfiges.com) is operated by a private individual. This policy explains what
        data is collected, how it is used, and how it is stored. By using Dedicate, you agree to this policy.
      </PolicySection>

      <PolicySection title="Data I collect" compact={compact}>
        <p className="text-sm text-muted-foreground mb-3">I collect only what is necessary to operate the service:</p>
        <div className="space-y-2.5">
          <DataPoint label="Username" compact={compact}>Chosen by you at registration. This is the only personally identifying information I store.</DataPoint>
          <DataPoint label="Workout data" compact={compact}>Sets, reps, RPE, and exercise records you log. Stored on EU-based infrastructure and accessible only to your account.</DataPoint>
          <DataPoint label="Account credentials" compact={compact}>Your password is hashed and never stored in plaintext.</DataPoint>
        </div>
      </PolicySection>

      <PolicySection title="Data I do not collect" compact={compact}>
        I do not collect your email address, phone number, real name, IP address logs, or any behavioural analytics.
        I do not use tracking cookies or third-party analytics services.
      </PolicySection>

      <PolicySection title="Cookies and local storage" compact={compact}>
        Dedicate uses only essential storage needed to run the app. This includes authentication and session recovery
        cookies, an optional trusted-device cookie when you choose that feature, Cloudflare-managed security or session
        cookies, and local storage for operational features such as workout drafts and preferences. None of this storage
        is used for advertising, analytics, or behavioural tracking.
      </PolicySection>

      <PolicySection title="How your data is used" compact={compact}>
        Your data is used solely to provide the Dedicate service. I do not sell, share, or transfer your data to any
        third party. Your workout data is never used for advertising or profiling.
      </PolicySection>

      <PolicySection title="Data storage and security" compact={compact}>
        All data is stored on privately operated servers located within the European Union. I take reasonable technical
        measures to protect stored data, including encrypted connections (TLS). However, no system is completely secure
        and I cannot guarantee absolute security.
      </PolicySection>

      <PolicySection title="Data retention and deletion" compact={compact}>
        Your data is retained for as long as your account exists. You may delete your account from the account settings
        page. Upon deletion, your username and all associated workout data will be permanently removed from our systems.
      </PolicySection>

      <PolicySection title="Age requirement" compact={compact}>
        Dedicate is intended for users aged 13 and over. By registering, you confirm that you meet this requirement.
      </PolicySection>

      <PolicySection title="Changes to this policy" compact={compact}>
        I may update this policy from time to time. Continued use of Dedicate after changes are posted constitutes
        acceptance of the updated policy.
      </PolicySection>

      <PolicySection title="Contact" compact={compact}>
        For any questions or data deletion requests, you can reach me via the{" "}
        <a
          href={import.meta.env.VITE_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          GitHub repository
        </a>{" "}
        linked on the homepage.
      </PolicySection>
    </div>
  );
}

export function TermsOfServiceContent({ compact = false }: PolicyContentProps) {
  return (
    <div className={policyContainerClassName(compact)}>
      <PolicySection title="Acceptance" compact={compact}>
        By accessing or using Dedicate at dedicate.louisfiges.com, you agree to be bound by these terms. If you do not
        agree, do not use the service. Dedicate is operated by a private individual and is provided as-is.
      </PolicySection>

      <PolicySection title="Eligibility" compact={compact}>
        You must be at least 13 years old to use Dedicate. By creating an account, you confirm you meet this
        requirement.
      </PolicySection>

      <PolicySection title="Your account" compact={compact}>
        You are responsible for maintaining the security of your account. Do not share your credentials. You are
        responsible for all activity that occurs under your account. We reserve the right to suspend or terminate
        accounts that violate these terms.
      </PolicySection>

      <PolicySection title="Acceptable use" compact={compact}>
        <p className="mb-3">You agree not to use Dedicate to:</p>
        <div className="space-y-1.5">
          {[
            "Harass, threaten, or abuse other users",
            "Distribute illegal content, including content that violates copyright",
            "Attempt to gain unauthorised access to the service or its infrastructure",
            "Disrupt or degrade the service for other users",
            "Distribute malware or engage in phishing",
            "Violate any applicable law or regulation",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
              <span className="text-xs leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-3">
          We reserve the right to remove content and terminate accounts that violate these rules, at our sole
          discretion.
        </p>
      </PolicySection>

      <PolicySection title="Content" compact={compact}>
        You retain ownership of any content you post. By posting content, you grant us a limited licence to store and
        transmit it as necessary to provide the service. We do not claim any ownership over your data.
      </PolicySection>

      <PolicySection title="Service availability" compact={compact}>
        We make no guarantees about uptime or availability. The service may be interrupted, modified, or discontinued
        at any time without notice. We are not liable for any loss resulting from unavailability of the service.
      </PolicySection>

      <PolicySection title="Limitation of liability" compact={compact}>
        Dedicate is provided without warranty of any kind. To the fullest extent permitted by law, we are not liable
        for any direct, indirect, incidental, or consequential damages arising from your use of the service.
      </PolicySection>

      <PolicySection title="Governing law" compact={compact}>
        These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive
        jurisdiction of the courts of England and Wales.
      </PolicySection>

      <PolicySection title="Changes to these terms" compact={compact}>
        We may update these terms at any time. Continued use of Dedicate after changes are posted constitutes
        acceptance of the updated terms.
      </PolicySection>

      <PolicySection title="Contact" compact={compact}>
        For any questions regarding these terms, you can reach us via the{" "}
        <a
          href={import.meta.env.VITE_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          GitHub repository
        </a>{" "}
        linked on the homepage.
      </PolicySection>
    </div>
  );
}

export function PolicyFullPageLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Link to="/terms" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
        Full Terms of Service
      </Link>
      <Link to="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
        Full Privacy Policy
      </Link>
    </div>
  );
}

function PolicySection({ title, children, compact = false }: PolicySectionProps) {
  return (
    <div className={cn("space-y-2", compact ? "px-3 py-3" : "px-4 py-4")}>
      <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{title}</p>
      <div className={cn("text-muted-foreground leading-relaxed", compact ? "text-xs" : "text-sm")}>{children}</div>
    </div>
  );
}

function DataPoint({ label, children, compact = false }: DataPointProps) {
  return (
    <div className={cn("flex items-start gap-2", compact && "flex-col gap-1 sm:flex-row sm:gap-2")}>
      <span className={cn("text-xs font-semibold text-foreground shrink-0 mt-0.5", compact ? "sm:w-28" : "w-28")}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}

function policyContainerClassName(compact: boolean) {
  return cn("divide-y divide-border overflow-hidden", compact ? "rounded-md border border-border" : "rounded-lg border border-border");
}
