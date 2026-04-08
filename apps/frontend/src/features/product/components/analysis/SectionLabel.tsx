interface SectionLabelProps {
  number: string;
  title: string;
}

export function SectionLabel({ number, title }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-xs text-primary/70 tracking-wider">
        {number}
      </span>
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
