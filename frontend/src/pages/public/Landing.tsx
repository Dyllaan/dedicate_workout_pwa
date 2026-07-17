import {Github, Dumbbell, Layers, Smartphone, Download, LineChart, HeartPulse} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Page from '@/components/layout/frames/Page';
import Section from '@/components/layout/section/Section';
import { DashCardRow } from '@/components/layout/card/DashCardRow';
import { ICONS } from '@/config/iconConfig';
import {Button} from "@/components/ui";
import {useNavigate} from "react-router-dom";

const gitHubUrl = import.meta.env.VITE_GITHUB_URL;

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Layers,
    title: 'Build your programme',
    description: 'Structure splits into blocks and weeks with your own periodisation.',
  },
  {
    icon: Dumbbell,
    title: 'Log every session',
    description: 'Track sets, reps and RPE as you train, with minimal friction.',
  },
  {
    icon: LineChart,
    title: 'Review your progress',
    description: 'Track 1RM trends and volume across muscle groups over time.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <Page
      title={<>Dedicate<span className="text-primary">.</span></>}
      subtitle="Structured workout tracking, split programming, and progression analysis."
      icon={Dumbbell}
      variant="hero"
      eyebrow="Training platform for serious lifters."
    >
        <div className="flex items-center gap-2 p-2 ">
          <Smartphone className="h-4 w-4 shrink-0 text-primary" />
          <Download className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mobile-first progressive web app. Add to your home screen for the best experience.
          </p>
        </div>

      <div className="flex w-full flex-wrap gap-2">
        <Button className="w-28" type="button" onClick={() => navigate("/register")} icon={ICONS.register} variant="link">Register</Button>
        <Button className="w-28" type="button" onClick={() => navigate("/login")} icon={ICONS.login} variant="link">Login</Button>
      </div>

      <Section title="How it works" subtitle="From programming to progression, in three steps.">
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {steps.map(({ icon, title, description }, i) => (
            <DashCardRow
              key={title}
              index={i}
              icon={icon}
              label={title}
              description={description}
              variant="static" />
          ))}
        </div>
      </Section>

      <Section title="Open source" subtitle="Dedicate is built in the open. Follow along or contribute on GitHub.">
        <a
          href={gitHubUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Github className="w-4 h-4"/>
          GitHub
        </a>
        <a
            href="/health"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <HeartPulse className="w-4 h-4"/>
          Service Health
        </a>
      </Section>
    </Page>
  );
}