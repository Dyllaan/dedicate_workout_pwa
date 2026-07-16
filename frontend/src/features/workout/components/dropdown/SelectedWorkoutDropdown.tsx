import {useState} from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ArrowLeftIcon,
    MoreHorizontalIcon,
    Pencil, Trash2,
} from "lucide-react"
import {useNavigate} from "react-router-dom";
import {useWorkoutTemplateMutations} from "@/hooks/workout/useWorkoutTemplates.ts";
import {enqueueSnackbar} from "notistack";

interface SelectedWorkoutDropdownProps {
    templateId: string;
}

export function SelectedWorkoutDropdown({ templateId }: SelectedWorkoutDropdownProps) {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const { deleteWorkout } = useWorkoutTemplateMutations();
    const handleConfirmDeleteWorkout = async () => {
        try {
            setIsDeleting(true);
            await deleteWorkout(templateId);
            enqueueSnackbar("Workout deleted successfully", { variant: "success" });
            navigate("/workouts");
        } catch {
            enqueueSnackbar("Failed to delete workout", { variant: "error" });
        } finally {
            setIsDeleting(false);
        }
    };
    return (
        <ButtonGroup>
            <ButtonGroup className="hidden sm:flex">
                <Button icon={undefined} size="icon" aria-label="Go Back" title="Go back">
                    <ArrowLeftIcon />
                </Button>
            </ButtonGroup>
            <ButtonGroup>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button icon={undefined} size="icon" aria-label="More Options" title="More options">
                            <MoreHorizontalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onSelect={() => navigate(`/workout/${templateId}/edit`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={isDeleting} onSelect={() =>
                                handleConfirmDeleteWorkout}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </ButtonGroup>
        </ButtonGroup>
    )
}
