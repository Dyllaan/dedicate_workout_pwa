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

interface SelectedWorkoutDropdownProps {
    entryId: string;
    workoutId: string;
    deleteEntry: (id:string) => void;
}

export function EntriesDropdown({ entryId, workoutId, deleteEntry }: SelectedWorkoutDropdownProps) {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleting = () => {
        setIsDeleting(true);
        deleteEntry(entryId);
        setIsDeleting(false);
    }
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
        <DropdownMenuItem onSelect={() => navigate(`/workout/${workoutId}/entry/${entryId}/edit`)}>
    <Pencil className="h-4 w-4 mr-2" />
        Modify
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isDeleting} onSelect={() => handleDeleting()}>
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
