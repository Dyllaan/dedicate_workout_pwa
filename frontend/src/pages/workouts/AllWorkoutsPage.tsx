import { ChevronRight, Plus, List } from "lucide-react";
import useWorkout from "@/features/workout/templates/hooks/useWorkoutTemplates";
import Page from "@/components/layout/frames/Page";
import formatDate from "@/utils/date";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import {ICONS} from "@/config/iconConfig.ts";
import PaginatedContainer from "@/components/layout/frames/PaginatedContainer";
import NextWorkoutCard from "@/features/dashboard/components/summary/NextWorkoutCard";
import CreateWorkoutButton from "@/features/workout/templates/components/CreateWorkoutButton.tsx";

export default function AllWorkoutsPage() {
    const { page, size, setPage } = useUrlPagination({ pageParam: "workoutsPage", sizeParam: "workoutsSize" });
    const { sortedWorkouts, pageInfo } = useWorkout({ page, size });

    return (
        <Page title="All Workouts" icon={ICONS.workout} subtitle="Browse all your workouts" subtitleIcon={List}>
            <PaginatedContainer onPageChange={setPage} currentPage={page} total={pageInfo?.totalPages} className={"space-y-4"} >
                <NextWorkoutCard />
                {sortedWorkouts.length == 0 && (
                    <CreateWorkoutButton />
                )}

                {sortedWorkouts.length > 0 && (
                    <div>
                        <DashCardRow
                            label="Create New Workout"
                            description="Create a new workout."
                            to="/workout/create"
                            icon={Plus}
                        />
                    {sortedWorkouts.map((workout) => (
                        <DashCardRow
                            key={workout.id}
                            to={`/workout/${workout.id}`}
                            label={workout.name}
                            description={formatDate(workout.createdAt)}
                            icon={ChevronRight}
                        />
                        ))}
                    </div>
                )}
            </PaginatedContainer>
        </Page>
    );
}
