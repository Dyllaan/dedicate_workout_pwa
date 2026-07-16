import config from "@/config/config"

const MIN_STRING_LENGTH = config.MIN_STRING_LENGTH
const MAX_STRING_LENGTH = config.MAX_STRING_LENGTH
const MIN_SETS = config.MIN_SETS
const MAX_SETS = config.MAX_SETS

type StringValidationIssue =
  | "too_short"
  | "too_long"
  | "leading_or_trailing_whitespace"
  | "invalid_characters"

function isInvalidNumber(num: number, min: number, max: number): boolean {
  return num < min || num > max || !Number.isFinite(num)
}

export function getStringValidationIssues(str: string): StringValidationIssue[] {
  if (str.length === 0) {
    return []
  }

  const issues: StringValidationIssue[] = []

  if (str !== str.trim()) {
    issues.push("leading_or_trailing_whitespace")
  }

  const length = str.length
  if (length < MIN_STRING_LENGTH) {
    issues.push("too_short")
  } else if (length > MAX_STRING_LENGTH) {
    issues.push("too_long")
  }

  // letters, numbers, spaces and common punctuation
  const regex = /^[\p{L}\p{N}\s\-_'()&.,!?]+$/u
  if (!regex.test(str)) {
    issues.push("invalid_characters")
  }

  return issues
}

function describeStringValidationIssue(issue: StringValidationIssue): string {
  switch (issue) {
    case "too_short":
      return `be at least ${MIN_STRING_LENGTH} characters long`
    case "too_long":
      return `be at most ${MAX_STRING_LENGTH} characters long`
    case "leading_or_trailing_whitespace":
      return "not start or end with whitespace"
    case "invalid_characters":
      return "contain only letters, numbers, spaces, and common punctuation"
  }
}

export function getStringValidationMessage(
  label: string,
  str: string,
): string | null {
  if (str.length === 0) {
    return `${label} is required`
  }

  const issues = getStringValidationIssues(str)
  if (issues.length === 0) {
    return null
  }

  const clauses = issues.map(describeStringValidationIssue)
  if (clauses.length === 1) {
    return `${label} must ${clauses[0]}`
  }

  if (clauses.length === 2) {
    return `${label} must ${clauses[0]} and ${clauses[1]}`
  }

  const lastClause = clauses[clauses.length - 1]
  return `${label} must ${clauses.slice(0, -1).join(", ")}, and ${lastClause}`
}

export function isInvalidString(str: string): boolean {
  return str.length === 0 || getStringValidationIssues(str).length > 0
}

export function isInvalidSets(sets: number): boolean {
  return isInvalidNumber(sets, MIN_SETS, MAX_SETS)
}
