/**
 * MikroORM filter query operators.
 *
 * @remarks
 * Operators are categorized as:
 *
 * **Equality operators (all types):**
 * - `$eq` - Equal to
 * - `$ne` - Not equal to
 *
 * **Comparison operators (number, date only):**
 * - `$lt` - Less than
 * - `$gt` - Greater than
 * - `$lte` - Less than or equal to
 * - `$gte` - Greater than or equal to
 * - `$between` - Inclusive range, converted to `$gte` and `$lte`
 *
 * **Array operators (all types):**
 * - `$in` - Value is in array
 * - `$nin` - Value is not in array
 *
 * **Fulltext operator (string fields with fulltext enabled):**
 * - `$fulltext` - Full-text search
 *
 * **Prefix operator (string fields with prefix: true only):**
 * - `$prefix` - Prefix search (converted to $like with value%)
 *
 * **Array field operators (fields with array: true only):**
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
  | "$between"
  | "$in"
  | "$nin"
  | "$fulltext"
  | "$prefix"
  | "$contains"
  | "$overlap";
