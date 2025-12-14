import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Comment {
  @PrimaryKey()
  id!: number;

  @Property({ type: "text" })
  content!: string;

  @Property()
  postId!: number;

  @Property()
  userId!: number;

  @Property()
  likes!: number;

  @Property()
  isApproved!: boolean;

  @Property()
  createdAt!: Date;
}
