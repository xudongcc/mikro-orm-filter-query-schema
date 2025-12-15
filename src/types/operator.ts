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
 *
 * **Array operators (all types):**
 * - `$in` - Value is in array
 * - `$nin` - Value is not in array
 *
 * **Fulltext operator (string fields with fulltext: true only):**
 * - `$fulltext` - Full-text search
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
  | "$in"
  | "$nin"
  | "$fulltext"
  | "$contains"
  | "$overlap";
