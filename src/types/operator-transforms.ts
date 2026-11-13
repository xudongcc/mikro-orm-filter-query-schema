import type { Operator } from "./operator.js";

type ScalarValue = string | number | boolean | Date;
type RangeValue = number | string | Date;

/** Validated operand shapes accepted by each comparison operator. */
export interface OperatorValueMap {
  $eq: ScalarValue | null;
  $ne: ScalarValue | null;
  $lt: RangeValue;
  $gt: RangeValue;
  $lte: RangeValue;
  $gte: RangeValue;
  $between: [RangeValue, RangeValue];
  $in: (ScalarValue | null)[];
  $nin: (ScalarValue | null)[];
  $fulltext: string;
  $prefix: string;
  $contains: ScalarValue[];
  $overlap: ScalarValue[];
}

/**
 * Synchronous transforms for explicit comparison operands.
 * Callbacks run after operand validation and before field replacement.
 * Results must still satisfy the original field's operand schema.
 * Scalar types are unions because the same operator can apply to several fields.
 */
export type OperatorTransforms = {
  [Key in Operator]?: (value: OperatorValueMap[Key]) => OperatorValueMap[Key];
};
