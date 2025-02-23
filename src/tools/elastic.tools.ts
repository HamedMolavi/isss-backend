import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";

export function plateToQueryJSON(plate: string, plate_search_type: 'normal' | 'noplate' | 'damaged' | 'similar',
  options?: {
    originalQueryToAlter: QueryDslQueryContainer & { bool: { must: QueryDslQueryContainer[], must_not: QueryDslQueryContainer[], should: QueryDslQueryContainer[] } },
  }
): QueryDslQueryContainer {
  switch (plate_search_type) {
    case 'normal':
      return { "wildcard": { "plate_number": { "value": plate.toLowerCase() } } };
    case 'noplate':
      return { "term": { "plate_number.keyword": "********" } };
    case 'similar':
      if (!!options?.originalQueryToAlter) options.originalQueryToAlter.bool.must_not.push(
        { "wildcard": { "plate_number.keyword": { "value": "*\\**" } } },
        { "match": { "plate_number": plate } }
      )
      return { "fuzzy": { "plate_number": { "value": plate, "fuzziness": 2, "transpositions": false } } }
    case 'damaged':
      if (!!options?.originalQueryToAlter) {
        options.originalQueryToAlter.bool.must.push({ "wildcard": { "plate_number.keyword": { "value": "*\\**" } } });
        options.originalQueryToAlter.bool.must_not.push({ "match": { "plate_number.keyword": "********" } });
      }
      return { "regexp": { "plate_number.keyword": plate.split('').map(s => s === '?' ? '.' : `[${s}\\*]`).join('') } }
    default:
      return { match: { plate_number: plate } };
  }
}