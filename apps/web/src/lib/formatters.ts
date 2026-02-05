export const formatCategory = (category?: string) => {
  if (!category) return "Other";
  return category
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
};
