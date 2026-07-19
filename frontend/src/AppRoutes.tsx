import { Route, Routes } from "react-router-dom";
import WorkoutLayout from "@/features/workout/components/WorkoutLayout";
import ProtectedRoute from "@/features/auth/components/routes/ProtectedRoute";
import PublicRoute from "@/features/auth/components/routes/PublicRoute";
import { SnackbarProvider } from "notistack";
import { WorkoutEntryProvider } from "@/features/workout/entries/components/WorkoutEntryContext";
import ProgrammeLayout from "@/features/periodisation/programme/components/ProgrammeLayout";
import AppShell from "@/components/layout/shell/AppShell";
import PublicShell from "@/components/layout/shell/PublicShell";
import RootRoute from "@/features/auth/components/routes/RootRoute";
import AuthPage from "@/pages/user/AuthPage";
import ToSPage from "@/pages/public/ToS";
import PrivacyPage from "@/pages/public/Privacy";
import NotFoundPage from "@/pages/public/NotFoundPage";
import DashboardPage from "@/pages/DashboardPage";
import AllWorkoutsPage from "@/pages/workouts/AllWorkoutsPage";
import SelectedWorkoutPage from "@/pages/workouts/SelectedWorkoutPage";
import ModifyWorkoutPage from "@/pages/workouts/ModifyWorkoutPage";
import PeriodisationHubPage from "@/pages/periodisation/PeriodisationHubPage";
import ProgrammeCustomPage from "@/pages/periodisation/ProgrammeCustomPage";
import PreferencesPage from "@/pages/user/PreferencesPage";
import BodyweightPage from "@/pages/user/BodyweightPage";
import WorkoutEntryEditorPage from "@/pages/workouts/WorkoutEntryEditorPage";
import CreateWorkoutPage from "@/pages/workouts/CreateWorkoutPage";
import CreateSplitPage from "@/pages/splits/CreateSplitPage";
import PeriodisationSplitDetailPage from "@/pages/periodisation/PeriodisationSplitDetailPage";
import InsightsPage from "@/pages/insights/InsightsPage.tsx";
import ExerciseDefinitionsManagePage from "@/pages/insights/ExerciseDefinitionsManagePage";
import HealthPage from "@/pages/public/HealthPage";
import ChangePasswordPage from "@/pages/user/ChangePasswordPage.tsx";
import YouPage from "@/pages/user/YouPage.tsx";
import TestSessionPage from "@/features/workout/test-1rm/components/TestSessionPage";

export default function AppRoutes() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      autoHideDuration={3000}
    >
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<RootRoute />} />
          <Route path="/terms" element={<ToSPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workouts" element={<AllWorkoutsPage />} />
            <Route path="/workout/create" element={<CreateWorkoutPage />} />

            <Route path="/workout/:workoutId" element={<WorkoutLayout />}>
              <Route index element={<SelectedWorkoutPage />} />
              <Route path="create" element={<WorkoutEntryEditorPage />} />
              <Route path="edit" element={<ModifyWorkoutPage />} />
              <Route
                path="/workout/:workoutId/entry/:id/edit"
                element={
                  <WorkoutEntryProvider>
                    <WorkoutEntryEditorPage />
                  </WorkoutEntryProvider>
                }
              />
              <Route path="test-1rm" element={<TestSessionPage />} />
            </Route>

            <Route path="/periodisation/splits/:splitId" element={<ProgrammeLayout />}>
              <Route index element={<PeriodisationSplitDetailPage />} />
              <Route path="edit" element={<CreateSplitPage mode="edit" />} />
              <Route
                path="programme/custom"
                element={<ProgrammeCustomPage />}
              />
            </Route>

            <Route path="/periodisation" element={<PeriodisationHubPage />} />

            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/insights/exercise-definitions" element={<ExerciseDefinitionsManagePage />} />

            <Route
              path="/splits/create"
              element={<CreateSplitPage mode="create" />}
            />

            <Route path="/you" element={<YouPage />} />
            <Route path="/user/change-password" element={<ChangePasswordPage />} />
            <Route path="/user/preferences" element={<PreferencesPage />} />
            <Route path="/user/bodyweight" element={<BodyweightPage />} />
          </Route>
        </Route>
      </Routes>
    </SnackbarProvider>
  );
}
