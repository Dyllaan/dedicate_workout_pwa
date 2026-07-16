import type { Block, Programme } from '@/types/Periodisation';
import { BLOCK_TYPE_CONFIG, BLOCK_TYPE_FALLBACK } from '@/utils/periodisationConfig';
import { Badge } from '@/components/ui/badge';
import { DashCardRow } from '../layout/card/DashCardRow';
import { buildBlockTabPath } from '@/utils/periodisationTabs';

type Props = {
  splitId: string;
  programme: Programme;
  currentBlock: Block | null;
  getCurrentWeekNumber: (block: Block) => number | null;
};

export default function ProgrammeTimeline({ splitId, programme, currentBlock, getCurrentWeekNumber }: Props) {
  const sorted = [...programme.blocks].sort((a, b) => a.blockOrder - b.blockOrder);
  const totalWeeks = sorted.reduce((s, b) => s + b.durationWeeks, 0);
  const currentWeekNum = currentBlock ? getCurrentWeekNumber(currentBlock) : null;

  return (
    <div>
      {sorted.map((block, i) => {
        const config = BLOCK_TYPE_CONFIG[block.blockType] ?? BLOCK_TYPE_FALLBACK;
        const Icon = config.icon;
        const isCurrent = block.id === currentBlock?.id;
        const isCompleted = !!currentBlock && block.blockOrder < currentBlock.blockOrder;
        const dateLabel = block.startDate
          ? new Date(block.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : undefined;

        return (
          <DashCardRow
            key={block.id}
            to={buildBlockTabPath(splitId, block.id, programme.id)}
            label={block.name}
            description={config.label}
            icon={Icon}
            badge={<Badge variant="outline" className={`${config.colour}`}>{config.label}</Badge>}
            >
              <div className="flex gap-3 text-[11px] text-muted-foreground mb-2 ml-6">
                <span>{block.durationWeeks}w</span>
                <span className="opacity-40">·</span>
                <span>RPE {block.targetRpeMin}–{block.targetRpeMax}</span>
                <span className="opacity-40">·</span>
                <span>{block.repRangeMin}–{block.repRangeMax} reps</span>
                {dateLabel && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{dateLabel}</span>
                  </>
                )}
              </div>
              {!isCompleted && block.weeks.length > 0 && (
                <div className="ml-6 mb-2">
                  {[...block.weeks]
                    .sort((a, b) => a.weekNumber - b.weekNumber)
                    .map((week) => {
                      const isCurrentWeek = isCurrent && currentWeekNum === week.weekNumber;
                      const isWeekCompleted = isCurrent && currentWeekNum !== null && week.weekNumber < currentWeekNum;
                      const dotClass = isCurrentWeek
                        ? 'bg-primary border-primary'
                        : week.isDeload
                        ? 'bg-amber-500 border-amber-500'
                        : isWeekCompleted
                        ? 'bg-muted-foreground border-muted-foreground'
                        : 'bg-muted-foreground/30 border-muted-foreground/40';
                      return (
                        <div key={week.id} className="flex items-center gap-2 py-[3px]">
                          <div className={`w-2 h-2 rounded-full border-[1.5px] shrink-0 ${dotClass}`} />
                          <span className={`text-[11px] ${isCurrentWeek ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                            Week {week.weekNumber}
                            {week.isDeload && <span className="ml-1 text-amber-500 text-[10px]">deload</span>}
                            {isCurrentWeek && <span className="ml-1 text-[10px]">← now</span>}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {isCompleted && (
                <p className="text-[11px] text-muted-foreground ml-6">{block.durationWeeks} weeks completed</p>
              )}
              {i < sorted.length - 1 && <hr className="border-t border-border" />}
            </DashCardRow>
        );
      })}

      <p className="text-[11px] text-muted-foreground text-center py-3">
        {sorted.length} block{sorted.length !== 1 ? 's' : ''} · {totalWeeks} weeks total
      </p>
    </div>
  );
}
