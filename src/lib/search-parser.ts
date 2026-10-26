/**
 * Compatibility re-export module for semantic property query parser.
 * Delegates to the canonical src/lib/parse-property-query.ts implementation.
 */

export {
  parsePropertyQuery,
  parsePropertyQuery as parseSearchQuery,
  type ParsedPropertyQuery,
  type ParsedPropertyQuery as ExtractedSearchFilters,
} from "./parse-property-query";
