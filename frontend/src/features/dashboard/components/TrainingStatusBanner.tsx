import { ArrowRight, ChevronRight } from "lucide-react";
import type { Block, Programme } from "@/features/periodisation/types/Periodisation";
import { cn } from "@/lib/utils";
import {
  BLOCK_TYPE_CONFIG,
  BLOCK_TYPE_FALLBACK,
  getProgrammePresetLabel,
} from "@/features/periodisation/utils/periodisationConfig";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import useProgramme from "@/features/periodisation/programme/hooks/useProgramme";
import { Link, useNavigate } from "react-router-dom";
import Section from "@/components/layout/section/Section";
import {ICONS} from "@/config/iconConfig.ts";

interface TrainingStatusBannerProps {
  splitId?: string;
}
function IconGradients() {
  return (
      <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
        <defs>
          {/* The Purple -> Red -> Orange Contrast Shimmer */}
          <linearGradient id="emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
  );
}

function GhostState() {
  return (
      <div className="relative w-full rounded-xl border border-border bg-muted/30 overflow-hidden">
        <IconGradients />

        {/* Decorative subtle left accent bar instead of full wrap */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-600 via-blue-500 to-emerald-950/20" />

        <div className="absolute inset-0 z-10 flex flex-col gap-1 items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <span className="text-xs font-medium text-muted-foreground">Set up a programme to track progress</span>
          <Link to="/periodisation" className="text-sm font-semibold text-primary hover:underline flex flex-row items-center justify-center gap-0.5">
            Create a programme
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="opacity-25 pointer-events-none select-none pl-4 py-4 pr-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ArrowRight className="h-4 w-4 shrink-0" style={{ stroke: "url(#emerald-grad)" }} />
                Powerbuilding
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">2 blocks · 12 weeks</p>
            </div>
          </div>
        </div>
      </div>
  );
}

export default function TrainingStatusBanner({ splitId }: TrainingStatusBannerProps) {
  const { activeProgramme, isLoading } = useProgramme(splitId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
        <div className="w-full rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-3.5 w-48 rounded" />
        </div>
    );
  }

  if (!activeProgramme) {
    return <GhostState />;
  }

  const sortedBlocks = sortBlocks(activeProgramme.blocks);
  const currentBlock = getCurrentBlock(sortedBlocks);
  const upcomingBlock = getUpcomingBlock(sortedBlocks, currentBlock);
  const chartBlock = currentBlock ?? upcomingBlock;
  const currentWeekNumber = currentBlock ? getCurrentWeekNumber(currentBlock) ?? currentBlock.durationWeeks : null;
  const programmePresetLabel = getProgrammePresetLabel(activeProgramme.presetType);
  const programmeSummary = buildProgrammeSummary(activeProgramme, sortedBlocks);

  return (
      <Section icon={ICONS.programme} title={"Programme"} >
        <IconGradients />

        {/* Main Banner Card - Muted Variant */}
        <div className="relative w-full rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors duration-200 overflow-hidden">

          {/* Subtle dynamic left border shimmer to tie into primary actions cleanly */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-600 via-blue-500 to-emerald-950/20" />

          <button
              onClick={() => navigate(`/periodisation/splits/${splitId}?tab=your-programme`)}
              className="w-full text-left block pl-5 py-4 pr-4 group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 min-w-0 flex-1">
                <div>
                  {/* Regular crisp text instead of text-gradient */}
                  <h2 className="break-words text-md text-zinc-400 leading-snug flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" style={{ stroke: "url(#emerald-grad)" }} />
                    {programmePresetLabel}
                  </h2>
                  <p className="break-words text-xs text-muted-foreground mt-0.5">
                    {programmeSummary}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {currentBlock && currentWeekNumber && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", (BLOCK_TYPE_CONFIG[currentBlock.blockType] ?? BLOCK_TYPE_FALLBACK).colour)}>
                    <BlockTypeIcon block={currentBlock} />
                        {(BLOCK_TYPE_CONFIG[currentBlock.blockType] ?? BLOCK_TYPE_FALLBACK).label}
                  </span>
                  )}
                  {currentBlock && (
                      <p className="text-xs text-muted-foreground/90">
                        RPE {currentBlock.targetRpeMin}-{currentBlock.targetRpeMax}
                        {" · "}
                        {currentBlock.repRangeMin}-{currentBlock.repRangeMax} reps
                      </p>
                  )}
                </div>

                {/* Muted Progress Area */}
                {chartBlock && (
                    <div className="space-y-2 w-full pt-0.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Timeline
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {currentBlock ? `Week ${currentWeekNumber} of ${currentBlock.durationWeeks}` : "Waiting to begin"}
                        </p>
                      </div>

                      <Progress
                          value={currentBlock && currentWeekNumber ? Math.round((currentWeekNumber / chartBlock.durationWeeks) * 100) : 0}
                          className="h-1 bg-muted"
                      />

                      {/* Minimal Compact Week Grid Blocks */}
                      <div className="flex gap-1 flex-wrap pt-0.5">
                        {Array.from({ length: chartBlock.durationWeeks }).map((_, i) => {
                          const wkNum = i + 1;
                          const wk = chartBlock.weeks.find((week) => week.weekNumber === wkNum);
                          const isDeloadWk = wk?.isDeload ?? false;
                          const resolvedCurrentWeek = currentWeekNumber ?? 0;
                          const isDone = currentBlock ? wkNum < resolvedCurrentWeek : false;
                          const isCurrent = currentBlock ? wkNum === resolvedCurrentWeek : false;

                          return (
                              <div
                                  key={wkNum}
                                  className={cn(
                                      "flex h-5 min-w-6 items-center justify-center rounded px-1 text-[9px] font-bold select-none",
                                      isDone && !isDeloadWk && "bg-green-500/10 text-green-600 dark:text-green-400",
                                      isDone && isDeloadWk && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                      isCurrent && !isDeloadWk && "bg-foreground text-background shadow-sm",
                                      isCurrent && isDeloadWk && "bg-amber-500 text-white shadow-sm",
                                      !isDone && !isCurrent && "border border-border text-muted-foreground/70"
                                  )}
                              >
                                {isDeloadWk ? "D" : wkNum}
                              </div>
                          );
                        })}
                      </div>
                    </div>
                )}
                {/* Upcoming Block - Nested smoothly underneath */}
                {upcomingBlock && upcomingBlock.id !== currentBlock?.id && (
                    <div className="py-4 relative overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", (BLOCK_TYPE_CONFIG[upcomingBlock.blockType] ?? BLOCK_TYPE_FALLBACK).colour)}>
                          <BlockTypeIcon block={upcomingBlock} />
                          {(BLOCK_TYPE_CONFIG[upcomingBlock.blockType] ?? BLOCK_TYPE_FALLBACK).label}
                        </span>
                        {futureDateChip(upcomingBlock.startDate)}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{upcomingBlock.name} <span className="text-muted-foreground font-normal">({upcomingBlock.durationWeeks} wks)</span></p>
                    </div>
                )}
              </div>

              <div className="text-muted-foreground/30 shrink-0 self-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </button>
        </div>
      </Section>
  );
}

// Keep all helper sorting/date functions from previous snippet intact below...
function sortBlocks(blocks: Block[]) {
  return [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);
}

function getCurrentBlock(blocks: Block[]): Block | null {
  const sorted = sortBlocks(blocks);
  const today = startOfDay(new Date());

  const active = sorted.find((block) => {
    if (!block.startDate) return false;
    const start = startOfDay(new Date(block.startDate));
    const end = new Date(start);
    end.setDate(end.getDate() + block.durationWeeks * 7);
    return today >= start && today < end;
  });
  if (active) return active;

  const started = sorted.filter((block) => {
    if (!block.startDate) return false;
    const start = startOfDay(new Date(block.startDate));
    return today >= start;
  });

  return started[started.length - 1] ?? null;
}

function getUpcomingBlock(blocks: Block[], currentBlock: Block | null): Block | null {
  const sorted = sortBlocks(blocks);
  if (!sorted.length) return null;

  if (currentBlock) {
    const currentIndex = sorted.findIndex((block) => block.id === currentBlock.id);
    if (currentIndex >= 0) {
      return sorted[currentIndex + 1] ?? null;
    }
  }

  const today = startOfDay(new Date());
  const futureBlock = sorted.find((block) => {
    if (!block.startDate) return false;
    return startOfDay(new Date(block.startDate)) > today;
  });

  return futureBlock ?? sorted[0] ?? null;
}

// (Remaining helpers match former code blocks for space: getCurrentWeekNumber, buildProgrammeSummary, futureDateChip, BlockTypeIcon, formatShortDate, startOfDay)
function getCurrentWeekNumber(block: Block): number | null {
  if (!block.startDate) return null;
  const start = startOfDay(new Date(block.startDate));
  const today = startOfDay(new Date());
  const days = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), block.durationWeeks);
}

function buildProgrammeSummary(programme: Programme, blocks: Block[]) {
  const totalWeeks = blocks.reduce((sum, block) => sum + block.durationWeeks, 0);
  return `${blocks.length} block${blocks.length === 1 ? "" : "s"} \u00b7 ${totalWeeks} week${totalWeeks === 1 ? "" : "s"}${programme.active ? "" : " \u00b7 inactive"}`;
}

function futureDateChip(startDate?: string) {
  if (!startDate) return null;
  const start = startOfDay(new Date(startDate));
  const today = startOfDay(new Date());
  if (start <= today) return null;
  return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Starts {formatShortDate(startDate)}
    </span>
  );
}

function BlockTypeIcon({ block }: { block: Block }) {
  const config = BLOCK_TYPE_CONFIG[block.blockType] ?? BLOCK_TYPE_FALLBACK;
  const Icon = config.icon;
  return <Icon className="h-3 w-3" />;
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateString));
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}