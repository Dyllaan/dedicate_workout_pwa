import {ICONS} from "@/config/iconConfig.ts";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";

export default function CreateWorkoutButton() {
    return (
        <PrimaryAction
            label="Create Workout"
            description="Build a structured workout plan, unlocking insights."
            icon={ICONS.workout}
            to="/workout/create"
        />
    );

}