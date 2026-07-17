export default function PreviewChip({
  chipKey,
  label,
  label2,
  title,
}: { chipKey: string; label: string; label2: string; title?: string }) {
        
    return (
        <div
            key={chipKey}
            title={title ?? label}
            className="h-6 px-2 rounded flex items-center justify-center text-[10px] font-bold border border-border text-muted-foreground select-none"
        >
            {label}
            <span className="ml-1 opacity-60">{label2}</span>
        </div>
    );
}
