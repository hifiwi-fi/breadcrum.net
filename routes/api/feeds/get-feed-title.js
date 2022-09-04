export function getFeedTitle ({
  title,
  ownerName
}) {
  return title || `${ownerName}'s breadcrum feed`
}
