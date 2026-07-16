export function shouldShowAppBack(pathname: string) {
  const isNavTab =
    ["/dashboard", "/workouts", "/insights", "/periodisation"].includes(pathname);

  return !isNavTab;
}

export function shouldShowPublicBack(pathname: string) {
  return !["/", "/login", "/register"].includes(pathname);
}
