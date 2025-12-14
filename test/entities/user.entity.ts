import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property()
  email!: string;

  @Property({ nullable: true })
  age!: number | null;

  @Property({ type: "bigint" })
  balance!: bigint;

  @Property()
  isActive!: boolean;

  @Property({ type: "array" })
  roles!: string[];

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;
}
