import { useMemo } from "react";
import Body from "react-muscle-highlighter";
import type { ExtendedBodyPart } from "react-muscle-highlighter";
import type { MuscleGroupId } from "@/types/Heatmap";
import { MUSCLE_GROUPS, intensityColor } from "./muscleMetadata";

type MuscleBodyProps = {
  intensities: Partial<Record<MuscleGroupId, number>>;
  side: "front" | "back";
};

export default function MuscleBody({ intensities, side }: MuscleBodyProps) {
  const bodyData = useMemo<ExtendedBodyPart[]>(() => {
    const entries: ExtendedBodyPart[] = [];

    for (const group of MUSCLE_GROUPS) {
      const value = intensities[group.id] ?? 0;
      if (value <= 0) {
        continue;
      }

      const visible =
        group.side === "both" ||
        group.side === side ||
        (group.id === "front_delt" && side === "front") ||
        (group.id === "rear_delt" && side === "back");

      if (!visible) {
        continue;
      }

      const color = intensityColor(value);

      for (const slug of group.slugs) {
        entries.push({ slug, color, intensity: 1 });
      }
    }

    return entries;
  }, [intensities, side]);

  return (
    <div className="flex justify-center" data-testid={`muscle-body-${side}`}>
      <Body
        data={bodyData}
        side={side}
        gender="male"
        scale={0.95}
        colors={["#ffffff"]}
        defaultFill="#1e293b"
        defaultStroke="none"
        border="#334155"
      />
    </div>
  );
}
