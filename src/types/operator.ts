/**
 * MikroORM filter query operators.
 *
 * @remarks
 * Operators are categorized as:
 *
 * **Equality operators:**
 * - `$eq` - Equal to
 * - `$ne` - Not equal to
 *
 * **Comparison operators (for string, number, date):**
 * - `$lt` - Less than
 * - `$gt` - Greater than
 * - `$lte` - Less than or equal to
 * - `$gte` - Greater than or equal to
 *
 * **Array operators:**
 * - `$in` - Value is in array
 * - `$nin` - Value is not in array
 *
 * **String operators:**
 * - `$like` - SQL LIKE pattern matching (case-sensitive)
 * - `$ilike` - SQL ILIKE pattern matching (case-insensitive)
 * - `$fulltext` - Full-text search
 *
 * **Array field operators:**
 * - `$contains` - Array contains all values
 * - `$overlap` - Array has any overlapping values
 */
export type Operator =
  | "$eq"
  | "$ne"
  | "$lt"
  | "$gt"
  | "$lte"
  | "$gte"
  | "$in"
  | "$nin"
  | "$like"
  | "$ilike"
  | "$fulltext"
  | "$contains"
  | "$overlap";
